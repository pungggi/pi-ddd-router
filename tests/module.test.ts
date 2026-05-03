import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Smoke test: verify the combined extension exports and default function.
 *
 * Full end-to-end tests require a running Pi instance with auggie installed.
 * These tests verify the module structure is correct.
 */
describe("pi-ddd-router module structure", () => {
  it("exports a default function (the extension entry point)", async () => {
    const mod = await import("../src/index.ts");
    assert.strictEqual(typeof mod.default, "function");
  });

  it("re-exports createRouter and createExtensionBridge from pi-auggie-router", async () => {
    const mod = await import("../src/index.ts");
    assert.strictEqual(typeof mod.createRouter, "function");
    assert.strictEqual(typeof mod.createExtensionBridge, "function");
  });

  it("re-exports registerDddWorkflow from pi-ddd", async () => {
    const mod = await import("../src/index.ts");
    assert.strictEqual(typeof mod.registerDddWorkflow, "function");
  });

  it("re-exports buildDddSystemPromptAppendix from pi-ddd", async () => {
    const mod = await import("../src/index.ts");
    assert.strictEqual(typeof mod.buildDddSystemPromptAppendix, "function");
  });

  it("re-exports buildDddToolMiddleware from pi-ddd", async () => {
    const mod = await import("../src/index.ts");
    assert.strictEqual(typeof mod.buildDddToolMiddleware, "function");
  });
});
