# pi-ddd-router

> Combined DDD workflow enforcement + Auggie sub-agent routing for [Pi](https://pi.dev).
> One extension, zero duplicated wiring.

`pi-ddd-router` composes [pi-ddd][pi-ddd] and [pi-auggie-router][pi-auggie-router]
into a single Pi extension. DDD enforcement rules (bounded-context scoping,
contract gates, ubiquitous language) automatically flow into router-spawned
sub-agents as system prompt directives and tool-call middleware.

**Monorepo-only.** This package is not on the npm registry. Both dependencies
are also private workspace packages. To use it, clone the monorepo or copy
`src/index.ts` into your own extension and import from `pi-ddd` and
`pi-auggie-router` directly (they are independently usable).

[pi-ddd]: https://github.com/pungggi/pi-ddd
[pi-auggie-router]: https://github.com/pungggi/pi-auggie-router

## Prerequisites

- **Node.js ≥ 20.6**
- **[Pi](https://pi.dev) ≥ 0.70.6** — the coding agent framework
- **[Augment Code CLI](https://www.augmentcode.com/)** — `auggie status` must
  exit 0 (used for semantic code retrieval in sub-agents)
- **[ripgrep](https://github.com/BurntSushi/ripgrep)** (`rg`) — used by DDD
  contract matching (`check_contracts` tool)

## What you get

Once loaded, the extension registers:

| Command / tool | Source | Purpose |
|---|---|---|
| `/context <name>` | pi-ddd | Activate a bounded context; edits outside `src/<name>/` require confirmation |
| `/skill:<name>` | pi-auggie-router | Execute a skill with DDD rules injected into the sub-agent |
| `/skill <name>` | fallback | Same as above, but via registered command (works even if the bridge can't intercept `/skill:`) |
| `check_contracts` | pi-ddd | Tool the agent must call before editing contract-tracked symbols |
| `/ddd-fp <reason>` | pi-ddd | Flag the most recent gate block as a false positive |

Sub-agents spawned by `/skill:` automatically receive:
- A **DDD system prompt appendix** with the active context, glossaries, and
  contract enforcement directives
- A **tool middleware** that blocks edits to contract-tracked files

## Usage

### Option 1: `-e` flag (from project root)

```bash
pi -e ./path/to/pi-ddd-router/extension.ts
```

### Option 2: `.pi/extensions/` symlink

```bash
cd .pi/extensions
ln -s ../../path/to/pi-ddd-router/extension.ts ddd-router.ts
```

### Option 3: Programmatic

```ts
import dddRouter from "pi-ddd-router";
// Use as your extension entry point
```

## How it works

1. **DDD registration** — All DDD tools, commands, and hooks are registered
   (`check_contracts`, `/context`, `/ddd-fp`, `tool_call` gate, telemetry).

2. **Extension bridge** — The auggie router is mounted via
   `createExtensionBridge(pi)`, which adapts Pi's `ExtensionAPI` to the
   `PiHost` interface the router expects.

3. **Sub-agent injection** — Every sub-agent receives the DDD appendix and
   contract-gating middleware.

4. **Lazy evaluation** — Both the appendix and middleware call
   `process.cwd()` at execution time (not mount time), so context switches
   (`/context billing` → `/context identity`) are picked up immediately.

## Configuration

### auggieRouter settings (`.pi/settings.json`)

All knobs live under `auggieRouter`. Only `defaultProvider` typically needs
changing; the rest are opinionated defaults.

```json
{
  "auggieRouter": {
    "defaultProvider": "openrouter",
    "routingModel": "anthropic/claude-3-5-haiku",
    "historyWindow": 20,
    "maxJudgeIterations": 2,
    "routingTimeoutMs": 60000,
    "qaTimeoutMs": 300000,
    "totalTimeoutMs": 300000,
    "inactivityTimeoutMs": 60000,
    "subAgentTemperature": 0.0,
    "overflowCeilingBytes": 25000,
    "auggieBinPath": "auggie",
    "allowedProviderPrefixes": []
  }
}
```

| Setting | Default | Purpose |
|---|---|---|
| `defaultProvider` | `"openrouter"` | LLM gateway prefix for routing and sub-agent calls |
| `routingModel` | `"anthropic/claude-3-5-haiku"` | Model used by Actor/Judge brief loop |
| `historyWindow` | `20` | Chat messages the Actor sees for context |
| `totalTimeoutMs` | `300000` | Hard kill for runaway sub-agents (5 min) |
| `overflowCeilingBytes` | `25000` | Max auggie payload before forced query refinement |
| `auggieBinPath` | `"auggie"` | Path to auggie binary; set absolute to avoid `$PATH` attacks |
| `allowedProviderPrefixes` | `[]` (allow all) | Restrict which providers SKILL `model:` may resolve to |

Full list and validation bounds are in
[`pi-auggie-router/src/config.ts`](https://github.com/pungggi/pi-auggie-router/blob/main/src/config.ts).

### DDD conventions (no config file needed)

```
contracts/interfaces/*.contract.md    Contract definitions
src/<context>/.context.md             Bounded context scope and rules
src/<context>/glossary.md             Context-local terminology (≤ 2 KB)
glossary.md                           Root ubiquitous language (≤ 2 KB)
.pi/state.json                       Active context + checked contracts (auto-managed)
```

## Known limitations (extension bridge)

The extension bridge has degraded capabilities compared to host-level mounting:

| Capability | Status | Impact |
|---|---|---|
| Chat history (`getRecentMessages`) | Returns `[]` | Actor brief has no conversation context; skill instructions drive quality |
| Q&A fallback (`onBeforeMessage`) | No-op | If the Judge fails twice, the skill is cancelled instead of prompting the user |
| `/skill:` interception (`onUserInput`) | No-op | Use the `/skill <name>` fallback command instead |
| `callLLM` / `runSubAgent` | Child process | Spawns `pi --mode json` subprocesses; slower than in-process calls |

These are fundamental limitations of Pi's extension API. The bridge degrades
gracefully — skills still execute, just without chat context or Q&A recovery.

## Build

```bash
npm run build      # tsc → dist/ (NodeNext modules + declarations)
npm run clean      # rm -rf dist
npm run typecheck  # tsc --noEmit
npm test           # node:test with tsx
```

`dist/` is gitignored — build before importing from plain Node. Pi's extension
loader (tsx) resolves `.js` imports to `.ts` at runtime, so `extension.ts`
works as-is when loaded by Pi.

## Architecture

```
┌───────────────────────────┐
│  pi-ddd-router            │
│  (this package)           │
└──────┬──────────┬─────────┘
       │          │
       ▼          ▼
 pi-auggie-router  pi-ddd
 (sub-agent hooks) (workflow + exports)
```

Neither `pi-auggie-router` nor `pi-ddd` depends on the other.
This package is the sole composition point.

## License

MIT
