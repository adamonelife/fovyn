import { describe, expect, it } from "vitest";
import { growthRegistry } from "./domain";
import { forestAssetFallback, forestEnvironmentAssetKeys, forestIconAssetKeys, forestTreeAssetKeys, versionedForestAssetUrl } from "./forestAssets";
import { forestEnvironmentManifest, forestIconNames, forestTreeManifest } from "./forestManifest";

describe("Forest asset canon", () => {
  it("has exactly one semantic asset key for every locked Tree stage", () => {
    expect(forestTreeAssetKeys).toHaveLength(27);
    expect(new Set(forestTreeAssetKeys).size).toBe(27);
    expect(forestTreeAssetKeys[0]).toBe("forest.tree.stage01");
    expect(forestTreeAssetKeys[26]).toBe("forest.tree.stage27");
    expect(growthRegistry[26]).toBe("Coast Redwood");
  });

  it("maps every Tree to one versioned Storage path and calibrated ground anchor", () => {
    expect(forestTreeManifest).toHaveLength(27);
    expect(new Set(forestTreeManifest.map((entry) => entry.storagePath)).size).toBe(27);
    expect(forestTreeManifest.every((entry) => entry.groundAnchorY > 0 && entry.groundAnchorY <= 1)).toBe(true);
    expect(forestTreeManifest.every((entry) => entry.groundAnchorY >= .68 && entry.groundAnchorY <= .95)).toBe(true);
    expect(forestTreeManifest[0].canonicalName).toBe("Seed");
    expect(forestTreeManifest[26].canonicalName).toBe("Coast Redwood");
  });

  it("has exactly the ten locked V1 environment identities", () => {
    expect(forestEnvironmentAssetKeys).toHaveLength(10);
    expect(forestEnvironmentAssetKeys).toContain("forest.environment.heartwood");
    expect(forestEnvironmentAssetKeys).not.toContain("forest.environment.eternal_forest");
  });

  it("contains the complete custom icon production set", () => {
    expect(forestIconNames).toHaveLength(29);
    expect(forestIconAssetKeys).toHaveLength(29);
    expect(forestIconNames).toContain("heartwood");
    expect(forestIconNames).not.toContain("eternal-forest");
  });

  it("keeps all environment identities unique", () => {
    expect(new Set(forestEnvironmentManifest.map(([key]) => key)).size).toBe(10);
  });

  it("can recover production Tree and environment paths without the remote manifest",()=>{
    expect(forestAssetFallback('forest.tree.stage01')?.storage_path).toContain('tree-01.png');
    expect(forestAssetFallback('forest.environment.heartwood')?.storage_path).toContain('heartwood.png');
    expect(forestAssetFallback('forest.environment.heartwood')?.url).toContain('?v=1');
    expect(forestAssetFallback('forest.unknown')).toBeNull();
  });

  it('changes browser cache identity when an asset version changes',()=>{
    const url='https://example.supabase.co/storage/v1/object/public/fovyn-assets/forest/v1/environments/area-mind.png';
    expect(versionedForestAssetUrl(url,1)).toContain('area-mind.png?v=1');
    expect(versionedForestAssetUrl(url,2)).toContain('area-mind.png?v=2');
    expect(versionedForestAssetUrl(url,1)).not.toBe(versionedForestAssetUrl(url,2));
  });
});
