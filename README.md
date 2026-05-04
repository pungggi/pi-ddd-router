# pi-ddd-router

> Combined DDD workflow enforcement + Auggie sub-agent routing for [Pi](https://pi.dev).
> One extension, zero duplicated wiring.

`pi-ddd-router` composes [`pi-ddd`](../pi-ddd/) and
[`pi-auggie-router`](../pi-auggie-router/) into a single Pi extension.
DDD enforcement rules (bounded-context scoping, contract gates, ubiquitous
language) automatically flow into router-spawned sub-agents as system prompt
directives and tool-call middleware.

## Monorepo package

This package lives in the same monorepo as its dependencies (`pi-ddd`,
`pi-auggie-router`) and is not published to the npm registry. To use it:

1. Clone the monorepo and reference it via `file:` in your project, or
2. Copy `src/index.ts` into your own extension and import from `pi-ddd` and
   `pi-auggie-router` directly (they are independently usable).

If you need a published package, consider publishing `pi-ddd` and
`pi-auggie-router` first (they have no `"private": true`), then publish
this package with updated peer dependency ranges.

## What you get

- **`/context <name>`** — activate a bounded context; edits outside
  `src/<name>/` require confirmation
- **`/skill:<name>`** — execute a skill through the auggie router with
  DDD rules injected
- **`/skill <name>`** — fallback command if `/skill:` interception is
  unavailable in extension mode (shows usage hint on empty invocation)
- **`check_contracts`** tool — contract gate for tracked symbols
- **`/ddd-fp <reason>`** — flag false-positive gate blocks

## Usage

### Option 1: -e flag (from project root)

```bash
pi -e ./path/to/pi-ddd-router/extension.ts
```

### Option 2: .pi/extensions/ symlink

```bash
cd .pi/extensions
ln -s ../../path/to/pi-ddd-router/extension.ts ddd-router.ts
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

4. **Lazy evaluation**: Both the DDD appendix and the middleware call
   `process.cwd()` at execution time (not mount time), so cwd drift and
   context switches (`/context billing` → `/context identity`) are handled
   correctly.

## Build

```bash
npm run build     # tsc → dist/
npm run clean     # rm -rf dist
npm run typecheck # tsc --noEmit
npm test          # node:test with tsx
```

The package ships pre-built `dist/` for programmatic Node usage.
Pi's extension loader (tsx) resolves `.js` imports to `.ts` at runtime,
so `extension.ts` works as-is when loaded by Pi.

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
