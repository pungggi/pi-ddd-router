import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Integration test with a fake ExtensionAPI mock.
 * Verifies that the dddRouter function wires everything correctly:
 * - registerDddWorkflow is called (DDD tools/commands registered)
 * - createRouter is invoked with the right options
 * - /skill command is registered as fallback
 * - /skill input validation rejects invalid names
 */

function makeFakePi() {
  const registeredTools: string[] = [];
  const registeredCommands: Map<string, any> = new Map();
  const registeredHooks: string[] = [];

  const fakePi: any = {
    registerTool(tool: any) {
      registeredTools.push(tool.name);
    },
    registerCommand(name: string, def: any) {
      registeredCommands.set(name, def);
    },
    on(event: string, _handler: any) {
      registeredHooks.push(event);
      return () => {};
    },
    sendMessage() {},
  };
  return { fakePi, registeredTools, registeredCommands, registeredHooks };
}

describe("dddRouter integration", () => {
  it("registers DDD workflow, mounts router, and adds /skill command", async () => {
    const { default: dddRouter } = await import("../src/index.js");
    const { fakePi, registeredTools, registeredCommands, registeredHooks } = makeFakePi();

    dddRouter(fakePi);

    // Verify DDD workflow was registered (check_contracts tool)
    assert.ok(registeredTools.includes("check_contracts"),
      `Expected check_contracts tool, got: ${registeredTools.join(", ")}`);

    // Verify /context and /ddd-fp commands from DDD
    assert.ok(registeredCommands.has("context"),
      `Expected /context command, got: ${[...registeredCommands.keys()].join(", ")}`);
    assert.ok(registeredCommands.has("ddd-fp"),
      `Expected /ddd-fp command, got: ${[...registeredCommands.keys()].join(", ")}`);

    // Verify /skill fallback command from the router
    assert.ok(registeredCommands.has("skill"),
      `Expected /skill fallback command, got: ${[...registeredCommands.keys()].join(", ")}`);

    // Verify DDD hooks were registered
    assert.ok(registeredHooks.includes("tool_call"),
      `Expected tool_call hook, got: ${registeredHooks.join(", ")}`);
    assert.ok(registeredHooks.includes("tool_result"),
      `Expected tool_result hook, got: ${registeredHooks.join(", ")}`);
    assert.ok(registeredHooks.includes("turn_end"),
      `Expected turn_end hook, got: ${registeredHooks.join(", ")}`);
  });

  it("/skill handler rejects invalid skill names", async () => {
    const { default: dddRouter } = await import("../src/index.js");
    const { fakePi, registeredCommands } = makeFakePi();

    dddRouter(fakePi);

    const skillHandler = registeredCommands.get("skill");
    assert.ok(skillHandler, "/skill command not registered");

    const notifications: Array<{ msg: string; level: string }> = [];
    const fakeCtx = {
      ui: {
        notify(msg: string, level: string) {
          notifications.push({ msg, level });
        },
      },
    };

    // Empty name → usage hint
    await skillHandler.handler("  ", fakeCtx);
    assert.strictEqual(notifications.length, 1);
    assert.ok(notifications[0]!.msg.includes("Usage"));

    // Path traversal attempt
    notifications.length = 0;
    await skillHandler.handler("../etc/passwd", fakeCtx);
    assert.strictEqual(notifications.length, 1);
    assert.ok(notifications[0]!.msg.includes("Invalid skill name"));
    assert.strictEqual(notifications[0]!.level, "error");

    // Control chars / spaces
    notifications.length = 0;
    await skillHandler.handler("foo bar", fakeCtx);
    assert.strictEqual(notifications.length, 1);
    assert.ok(notifications[0]!.msg.includes("Invalid skill name"));

    // Newline injection
    notifications.length = 0;
    await skillHandler.handler("foo\nbar", fakeCtx);
    assert.strictEqual(notifications.length, 1);
    assert.ok(notifications[0]!.msg.includes("Invalid skill name"));

    // Valid name → no error notification (router.trigger will fail but that's OK)
    notifications.length = 0;
    await skillHandler.handler("my-skill_01", fakeCtx).catch(() => {});
    assert.strictEqual(notifications.length, 0, "Valid skill name should not trigger error notification");
  });
});
