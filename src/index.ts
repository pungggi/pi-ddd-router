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
 *
 * DDD configuration is convention-based:
 *   - contracts/interfaces/       — contract files
 *   - src/<context>/.context.md   — bounded context definitions
 *   - src/<context>/glossary.md   — context-local glossaries
 *   - glossary.md                 — root ubiquitous language
 *   - .pi/state.json              — active context + checked contracts
 *   - .pi/settings.json           — auggieRouter settings
 */

import { createRouter, createExtensionBridge } from "pi-auggie-router";
import { registerDddWorkflow } from "pi-ddd/workflow";
import { buildDddSystemPromptAppendix } from "pi-ddd/prompt";
import { buildDddToolMiddleware } from "pi-ddd/middleware";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

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

  // 2. Mount the auggie router via the extension bridge
  const host = createExtensionBridge(pi);
  const cwd = process.cwd();

  const router = createRouter(host, {
    // Lazy callback: re-reads DDD state (active context, glossaries)
    // on every /skill: execution so context switches are picked up.
    systemPromptAppendix: () => buildDddSystemPromptAppendix(cwd),
    additionalToolMiddleware: [buildDddToolMiddleware(cwd)],
  });

  // 3. C-6 fallback: register /skill as a command so users can invoke
  //    /skill <name> explicitly when the extension bridge cannot intercept
  //    /skill: prefixes automatically via onUserInput.
  pi.registerCommand("skill", {
    description:
      "Execute a skill via the auggie router (fallback if /skill: interception is unavailable)",
    handler: async (args: string, _ctx) => {
      const skillName = args.trim();
      if (!skillName) return;
      await router.trigger(`/skill:${skillName}`);
    },
  });
}

// Re-export for programmatic usage
export { createRouter, createExtensionBridge } from "pi-auggie-router";
export { registerDddWorkflow } from "pi-ddd/workflow";
export { buildDddSystemPromptAppendix } from "pi-ddd/prompt";
export { buildDddToolMiddleware } from "pi-ddd/middleware";
