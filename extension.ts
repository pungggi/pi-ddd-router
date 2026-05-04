/**
 * Extension entry point for -e loading.
 *
 * Usage (relative to project root where pi is invoked):
 *   pi -e ./node_modules/pi-ddd-router/extension.ts
 *
 * Note: The .js import below is resolved to .ts by Pi's tsx extension
 * loader at runtime. This is the same convention used by all Pi extensions
 * (e.g. pi-ddd/.pi/extensions/ddd-workflow.ts).
 */
export { default } from "./src/index.js";
