/**
 * Combined DDD + Auggie Router extension for @mariozechner/pi-coding-agent.
 *
 * Mounts both pi-ddd workflow enforcement and pi-auggie-router /skill:
 * sub-agent routing in a single extension. DDD rules flow into sub-agents
 * automatically.
 *
 * Usage:
 *   -e ./node_modules/pi-ddd-router/extension.ts
 *   or place a symlink in .pi/extensions/
 *   (Path must be relative to project root where pi is invoked)
 *
 * DDD configuration is convention-based:
 *   - contracts/interfaces/       — contract files
 *   - src/<context>/.context.md   — bounded context definitions
 *   - src/<context>/glossary.md   — context-local glossaries
 *   - glossary.md                 — root ubiquitous language
 *   - .pi/state.json              — active context + checked contracts
 *   - .pi/settings.json           — auggieRouter settings
 *
 * This package ships TypeScript source. Pi's extension loader (tsx) resolves
 * .js imports to .ts at runtime. For plain Node consumption, run `npm run build`
 * first and import from dist/.
 */

import { createRouter, createExtensionBridge } from "pi-auggie-router";
import { registerDddWorkflow } from "pi-ddd/workflow";
import { buildDddSystemPromptAppendix } from "pi-ddd/prompt";
import { buildDddToolMiddleware } from "pi-ddd/middleware";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

/**
 * Combined extension entry point.
 *
 * When loaded as a Pi extension (via -e flag or .pi/extensions/ symlink),
 * this function:
 *
 * 1. Registers all DDD tools, commands, and hooks (check_contracts,
 *    /context, /ddd-fp, tool_call gate, telemetry).
 * 2. Mounts the auggie router via the extension bridge, configured with:
 *    - Lazy DDD system prompt appendix (re-reads active context on each
 *      /skill: execution so context switches are picked up)
 *    - DDD contract-gating middleware for sub-agent tool calls
 * 3. Registers a /skill command as a fallback entry point if the bridge's
 *    onUserInput cannot intercept /skill: prefixes directly.
 */
export default function dddRouter(pi: ExtensionAPI): void {
  // 1. Register all DDD tools, commands, and hooks
  registerDddWorkflow(pi);

  // 2. Mount the auggie router via the extension bridge.
  //    Both the system prompt appendix and the middleware are lazy:
  //    they call process.cwd() at execution time, not at mount time,
  //    so cwd drift is handled correctly.
  const host = createExtensionBridge(pi);

  const router = createRouter(host, {
    // Lazy callback: re-reads DDD state (active context, glossaries)
    // on every /skill: execution so context switches are picked up.
    systemPromptAppendix: () => buildDddSystemPromptAppendix(process.cwd()),
    // Lazy middleware: re-reads cwd at execution time
    additionalToolMiddleware: [buildDddToolMiddleware(process.cwd())],
  });

  // 3. C-6 fallback: register /skill as a command so users can invoke
  //    /skill <name> explicitly when the extension bridge cannot intercept
  //    /skill: prefixes automatically via onUserInput.
  //    Skill names are validated against [a-zA-Z0-9_-]+ to prevent path
  //    traversal, whitespace, and control-char injection into the router's
  //    file-lookup path.
  const VALID_SKILL_NAME = /^[a-zA-Z0-9_-]+$/;

  pi.registerCommand("skill", {
    description:
      "Execute a skill via the auggie router. Usage: /skill <name>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const skillName = args.trim();
      if (!skillName) {
        ctx.ui.notify("Usage: /skill <name>", "error");
        return;
      }
      if (!VALID_SKILL_NAME.test(skillName)) {
        ctx.ui.notify(
          `Invalid skill name "${skillName}". Use only letters, digits, hyphens, underscores.`,
          "error",
        );
        return;
      }
      await router.trigger(`/skill:${skillName}`);
    },
  });
}

// Re-export for programmatic usage
export { createRouter, createExtensionBridge } from "pi-auggie-router";
export { registerDddWorkflow } from "pi-ddd/workflow";
export { buildDddSystemPromptAppendix } from "pi-ddd/prompt";
export { buildDddToolMiddleware } from "pi-ddd/middleware";
