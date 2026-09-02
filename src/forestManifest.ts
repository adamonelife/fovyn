import { growthRegistry } from "./domain";

export const FOREST_ASSET_VERSION = 1 as const;
export const FOREST_STORAGE_ROOT = `forest/v${FOREST_ASSET_VERSION}` as const;

export type ForestDepthPreference = "far" | "mid" | "near";
export type ForestTreeManifestEntry = {
  assetKey: string;
  stage: number;
  canonicalName: (typeof growthRegistry)[number];
  storagePath: string;
  width: number;
  height: number;
  groundAnchorY: number;
  defaultScale: number;
  mobileScaleModifier: number;
  desktopScaleModifier: number;
  zBias: number;
  depthPreference: ForestDepthPreference;
};

const dimensions: ReadonlyArray<readonly [number, number]> = [
  [1536, 1024], [1024, 1536], [1024, 1536], [1024, 1536], [1536, 1024],
  [1165, 1350], [1024, 1536], [1182, 1331], [1024, 1536], [1024, 1536],
  [1024, 1536], [1024, 1536], [1024, 1536], [1024, 1536], [1024, 1536],
  [1224, 1285], [1536, 1024], [1312, 1199], [1305, 1206], [1024, 1536],
  [1024, 1536], [1145, 1374], [1024, 1536], [1024, 1536], [1024, 1536],
  [1024, 1536], [1024, 1536],
];

// Initial production calibration. Forest Lab is the only place these values are tuned.
const groundAnchors = [
  .72, .74, .76, .76, .72, .94, .94, .94, .69, .69, .70, .69, .69, .69,
  .68, .94, .94, .94, .94, .94, .94, .94, .95, .95, .95, .94, .95,
] as const;

const defaultScales = [
  .42, .46, .50, .55, .58, .66, .68, .67, .70, .72, .74, .76, .78, .78,
  .80, .80, .82, .84, .85, .88, .89, .90, .92, .92, .93, .94, .96,
] as const;

export const forestTreeManifest: readonly ForestTreeManifestEntry[] = growthRegistry.map((canonicalName, index) => {
  const stage = index + 1;
  const [width, height] = dimensions[index];
  return {
    assetKey: `forest.tree.stage${String(stage).padStart(2, "0")}`,
    stage,
    canonicalName,
    storagePath: `${FOREST_STORAGE_ROOT}/trees/tree-${String(stage).padStart(2, "0")}.png`,
    width,
    height,
    groundAnchorY: groundAnchors[index],
    defaultScale: defaultScales[index],
    mobileScaleModifier: stage < 4 ? 1.08 : .9,
    desktopScaleModifier: stage < 4 ? .95 : 1,
    zBias: stage < 4 ? 2 : 0,
    depthPreference: stage < 4 ? "near" : stage < 16 ? "mid" : "far",
  } satisfies ForestTreeManifestEntry;
});

export const forestEnvironmentManifest = [
  ["nursery", "Nursery"],
  ["clearing", "The Clearing"],
  ["area-health", "Health"],
  ["area-mind", "Mind"],
  ["area-self", "Self"],
  ["area-people", "People"],
  ["area-work", "Work"],
  ["area-wealth", "Wealth"],
  ["dormant-woods", "Dormant Woods"],
  ["heartwood", "Heartwood"],
] as const;

export const forestIconNames = [
  "home", "goals", "nursery", "history", "account", "canopy", "clearing",
  "climate", "trail", "roots", "growth-rings", "dormant", "dormant-woods",
  "heartwood", "landmarks", "water", "feed", "prune", "tend", "root-for",
  "bloom", "plant-together", "share-with-vine", "health", "mind", "self",
  "people", "work", "wealth",
] as const;

export function environmentStoragePath(name: (typeof forestEnvironmentManifest)[number][0]) {
  return `${FOREST_STORAGE_ROOT}/environments/${name}.png`;
}

export function iconStoragePath(name: (typeof forestIconNames)[number]) {
  return `${FOREST_STORAGE_ROOT}/icons/${name}.svg`;
}

