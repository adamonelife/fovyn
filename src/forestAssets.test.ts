import { describe, expect, it } from "vitest";
import { growthRegistry } from "./domain";
import { forestEnvironmentAssetKeys, forestTreeAssetKeys } from "./forestAssets";

describe("Forest asset canon", () => {
  it("has exactly one semantic asset key for every locked Tree stage", () => {
    expect(forestTreeAssetKeys).toHaveLength(27);
    expect(new Set(forestTreeAssetKeys).size).toBe(27);
    expect(forestTreeAssetKeys[0]).toBe("forest.tree.stage01");
    expect(forestTreeAssetKeys[26]).toBe("forest.tree.stage27");
    expect(growthRegistry[26]).toBe("Coast Redwood");
  });

  it("has exactly the ten locked V1 environment identities", () => {
    expect(forestEnvironmentAssetKeys).toHaveLength(10);
    expect(forestEnvironmentAssetKeys).toContain("forest.environment.heartwood");
    expect(forestEnvironmentAssetKeys).not.toContain("forest.environment.eternal_forest");
  });
});

