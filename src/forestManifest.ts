import { growthRegistry } from "./domain";

export const FOREST_ASSET_VERSION = 1 as const;
export const FOREST_STORAGE_ROOT = `forest/v${FOREST_ASSET_VERSION}` as const;

export type ForestDepthPreference = "far" | "mid" | "near";
export type ForestVisualHeightClass="seed"|"sprout"|"young_plant"|"small_tree"|"medium_tree"|"large_tree"|"giant_tree";
export type ForestVisualFootprintClass="tiny"|"narrow"|"balanced"|"broad"|"monumental";
export type ForestTreeManifestEntry = {
  assetKey: string;
  stage: number;
  canonicalName: (typeof growthRegistry)[number];
  storagePath: string;
  width: number;
  height: number;
  groundAnchorY: number;
  defaultScale: number;
  visualHeightClass:ForestVisualHeightClass;
  visualFootprintClass:ForestVisualFootprintClass;
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

export const canonicalTreeScales = [
  .08,.16,.27,.42,.48,.52,.56,.50,.54,.58,.61,.64,.66,.60,.67,.64,.72,.78,.76,.72,.76,.79,.98,.82,.86,.90,1.08,
] as const;

const heightClass=(stage:number):ForestVisualHeightClass=>stage===1?'seed':stage===2?'sprout':stage===3?'young_plant':stage<=7?'small_tree':stage<=15?'medium_tree':stage<=22?'large_tree':'giant_tree';
const broadStages=new Set([5,6,7,8,9,11,13,14,15,17,18,19,26]);
const narrowStages=new Set([4,10,12,16,20,21,22,24,25]);
const footprintClass=(stage:number):ForestVisualFootprintClass=>stage<=3?'tiny':stage===23||stage===27?'monumental':broadStages.has(stage)?'broad':narrowStages.has(stage)?'narrow':'balanced';

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
    defaultScale: canonicalTreeScales[index],
    visualHeightClass:heightClass(stage),visualFootprintClass:footprintClass(stage),
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
