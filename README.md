# pi-ddd-router

> Combined DDD workflow enforcement + Auggie sub-agent routing for [Pi](https://pi.dev).
> One extension, zero duplicated wiring.

`pi-ddd-router` composes [`pi-ddd`](../pi-ddd/) and
[`pi-auggie-router`](../pi-auggie-router/) into a single Pi extension.
DDD enforcement rules (bounded-context scoping, contract gates, ubiquitous
language) automatically flow into router-spawned sub-agents as system prompt
directives and tool-call middleware.

## What you get

- **`/context <name>`** — activate a bounded context; edits outside
  `src/<name>/` require confirmation
- **`/skill:<name>`** — execute a skill through the auggie router with
  DDD rules injected
- **`/skill <name>`** — fallback command if `/skill:` interception is
  unavailable in extension mode
- **`check_contracts`** tool — contract gate for tracked symbols
- **`/ddd-fp <reason>`** — flag false-positive gate blocks

## Installation

```bash
npm install pi-ddd-router
```

Peer dependencies (`pi-auggie-router`, `pi-ddd`, `@mariozechner/pi-coding-agent`)
must also be installed.

## Usage

### Option 1: -e flag

```bash
pi -e ./node_modules/pi-ddd-router/extension.ts
```

### Option 2: .pi/extensions/ symlink

```bash
cd .pi/extensions
ln -s ../../node_modules/pi-ddd-router/extension.ts ddd-router.ts
```

### Option 3: Programmatic

```ts
import dddRouter from "pi-ddd-router";
// Use the default export as your extension entry point
```

## How it works

1. **DDD registration**: All DDD tools, commands, and hooks are registered
   (`check_contracts`, `/context`, `/ddd-fp`, `tool_call` gate, telemetry).

2. **Extension bridge**: The auggie router is mounted via `createExtensionBridge`,
   which adapts Pi's `ExtensionAPI` to the `PiHost` interface the router expects.

3. **Sub-agent injection**: Every sub-agent spawned by the router receives:
   - DDD system prompt appendix (active context, glossaries, contract rules)
   - DDD tool middleware (blocks edits to contract-tracked files)

4. **Lazy evaluation**: The DDD appendix is rebuilt on every `/skill:` execution,
   so context switches (`/context billing` → `/context identity`) are picked up
   immediately.

## Configuration

### auggieRouter settings (`.pi/settings.json`)

```json
{
  "auggieRouter": {
    "defaultProvider": "openrouter",
    "routingModel": "anthropic/claude-3-5-haiku"
  }
}
```

### DDD conventions

```
contracts/interfaces/*.contract.md    Contract definitions
src/<context>/.context.md             Bounded context scope and rules
src/<context>/glossary.md             Context-local terminology
glossary.md                           Root ubiquitous language (≤ 2KB)
.pi/state.json                        Active context + checked contracts
```

## Architecture

```
┌──────────────────────────────────┐
│  .pi/extensions/ddd-router.ts    │
│  (this package)                  │
└──────┬──────────┬────────────────┘
       │          │
       ▼          ▼
 pi-auggie-router  pi-ddd
 (sub-agent hooks) (workflow + exports)
```

Neither `pi-auggie-router` nor `pi-ddd` depends on the other.
This package is the sole composition point.

## License

MIT
