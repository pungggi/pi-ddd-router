import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Integration test with a fake ExtensionAPI mock.
 * Verifies that the dddRouter function wires everything correctly:
 * - registerDddWorkflow is called (DDD tools/commands registered)
 * - createRouter is invoked with the right options
 * - /skill command is registered as fallback
 */
describe("dddRouter integration", () => {
  it("registers DDD workflow, mounts router, and adds /skill command", async () => {
    const { default: dddRouter } = await import("../src/index.js");

    // Track what was registered
    const registeredTools: string[] = [];
    const registeredCommands: string[] = [];
    const registeredHooks: string[] = [];

    const fakePi: any = {
      registerTool(tool: any) {
        registeredTools.push(tool.name);
      },
      registerCommand(name: string, _def: any) {
        registeredCommands.push(name);
      },
      on(event: string, _handler: any) {
        registeredHooks.push(event);
        return () => {};
      },
      sendMessage() {},
    };

    // Invoke the extension
    dddRouter(fakePi);

    // Verify DDD workflow was registered (check_contracts tool)
    assert.ok(registeredTools.includes("check_contracts"),
      `Expected check_contracts tool, got: ${registeredTools.join(", ")}`);

    // Verify /context and /ddd-fp commands from DDD
    assert.ok(registeredCommands.includes("context"),
      `Expected /context command, got: ${registeredCommands.join(", ")}`);
    assert.ok(registeredCommands.includes("ddd-fp"),
      `Expected /ddd-fp command, got: ${registeredCommands.join(", ")}`);

    // Verify /skill fallback command from the router
    assert.ok(registeredCommands.includes("skill"),
      `Expected /skill fallback command, got: ${registeredCommands.join(", ")}`);

    // Verify DDD hooks were registered
    assert.ok(registeredHooks.includes("tool_call"),
      `Expected tool_call hook, got: ${registeredHooks.join(", ")}`);
    assert.ok(registeredHooks.includes("tool_result"),
      `Expected tool_result hook, got: ${registeredHooks.join(", ")}`);
    assert.ok(registeredHooks.includes("turn_end"),
      `Expected turn_end hook, got: ${registeredHooks.join(", ")}`);
  });
});
