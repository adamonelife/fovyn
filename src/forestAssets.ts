import { supabase } from "./supabase";
import { growthRegistry } from "./domain";
import { FOREST_ASSET_VERSION, FOREST_STORAGE_ROOT, forestEnvironmentManifest, forestIconNames, forestTreeManifest } from "./forestManifest";
import {loadTreeScale} from './treeScaleRepository';

export const FOREST_ASSET_BUCKET = "fovyn-assets";
export const forestTreeAssetKeys = growthRegistry.map((_, index) =>
  `forest.tree.stage${String(index + 1).padStart(2, "0")}`,
);
export const forestEnvironmentAssetKeys = [
  "forest.environment.nursery",
  "forest.environment.clearing",
  "forest.environment.area.health",
  "forest.environment.area.mind",
  "forest.environment.area.self",
  "forest.environment.area.people",
  "forest.environment.area.work",
  "forest.environment.area.wealth",
  "forest.environment.dormant_woods",
  "forest.environment.heartwood",
] as const;
export const forestIconAssetKeys = forestIconNames.map((name) => `forest.icon.${name.replaceAll("-", "_")}`);

export type ForestAssetVariant = "default" | "desktop" | "mobile";
export type ForestAsset = {
  asset_key: string;
  asset_version: number;
  variant: ForestAssetVariant;
  asset_kind: "tree" | "environment" | "icon" | "brand";
  stage: number | null;
  canonical_name: string;
  storage_path: string;
  mime_type: string;
  width: number;
  height: number;
  anchor_x: number;
  anchor_y: number;
  ground_anchor_y: number;
  default_scale: number;
  mobile_scale_modifier: number;
  desktop_scale_modifier: number;
  z_bias: number;
  depth_preference: "far" | "mid" | "near";
  environment_key: string | null;
  is_active: boolean;
  url: string;
};

const columns = "asset_key,asset_version,variant,asset_kind,stage,canonical_name,storage_path,mime_type,width,height,anchor_x,anchor_y,ground_anchor_y,default_scale,mobile_scale_modifier,desktop_scale_modifier,z_bias,depth_preference,environment_key,is_active";

export function versionedForestAssetUrl(publicUrl:string,assetVersion:number){
  const url=new URL(publicUrl);
  url.searchParams.set('v',String(assetVersion));
  return url.toString();
}

export function forestAssetFallback(assetKey:string):ForestAsset|null{
  const tree=forestTreeManifest.find(item=>item.assetKey===assetKey);
  if(tree){const {data}=supabase.storage.from(FOREST_ASSET_BUCKET).getPublicUrl(tree.storagePath);return{asset_key:tree.assetKey,asset_version:FOREST_ASSET_VERSION,variant:'default',asset_kind:'tree',stage:tree.stage,canonical_name:tree.canonicalName,storage_path:tree.storagePath,mime_type:'image/png',width:tree.width,height:tree.height,anchor_x:.5,anchor_y:tree.groundAnchorY,ground_anchor_y:tree.groundAnchorY,default_scale:tree.defaultScale,mobile_scale_modifier:tree.mobileScaleModifier,desktop_scale_modifier:tree.desktopScaleModifier,z_bias:tree.zBias,depth_preference:tree.depthPreference,environment_key:null,is_active:true,url:versionedForestAssetUrl(data.publicUrl,FOREST_ASSET_VERSION)}}
  const environment=forestEnvironmentManifest.find(([key])=>`forest.environment.${key.startsWith('area-')?`area.${key.slice(5)}`:key.replaceAll('-','_')}`===assetKey);
  if(environment){const storagePath=`${FOREST_STORAGE_ROOT}/environments/${environment[0]}.png`,{data}=supabase.storage.from(FOREST_ASSET_BUCKET).getPublicUrl(storagePath);return{asset_key:assetKey,asset_version:FOREST_ASSET_VERSION,variant:'default',asset_kind:'environment',stage:null,canonical_name:environment[1],storage_path:storagePath,mime_type:'image/png',width:1536,height:1024,anchor_x:.5,anchor_y:.5,ground_anchor_y:1,default_scale:1,mobile_scale_modifier:1,desktop_scale_modifier:1,z_bias:0,depth_preference:'mid',environment_key:environment[0],is_active:true,url:versionedForestAssetUrl(data.publicUrl,FOREST_ASSET_VERSION)}}
  return null;
}

export async function getForestAsset(assetKey: string, variant: ForestAssetVariant = "default"): Promise<ForestAsset | null> {
  const stageMatch=assetKey.match(/^forest\.tree\.stage(\d{2})$/),stage=stageMatch?Number(stageMatch[1]):null;
  const [{ data, error },calibration] = await Promise.all([supabase
    .from("forest_asset_manifest")
    .select(columns)
    .eq("asset_key", assetKey)
    .eq("status", "ready")
    .in("variant", variant === "default" ? ["default"] : [variant, "default"])
    .order("asset_version", { ascending: false }),stage?loadTreeScale(stage):Promise.resolve(null)]);
  if (error) {
    console.warn("Forest asset lookup failed", { assetKey, variant });
    return forestAssetFallback(assetKey);
  }
  const rows = (data ?? []) as unknown as Omit<ForestAsset, "url">[];
  const row = rows.find((item) => item.variant === variant) ?? rows.find((item) => item.variant === "default");
  if (!row?.storage_path) return forestAssetFallback(assetKey);
  const { data: publicAsset } = supabase.storage.from(FOREST_ASSET_BUCKET).getPublicUrl(row.storage_path);
  return { ...row,default_scale:calibration?.canonical_visual_scale??row.default_scale, url: versionedForestAssetUrl(publicAsset.publicUrl,row.asset_version) };
}

export const localForestManifest = {
  trees: forestTreeManifest,
  environments: forestEnvironmentManifest,
  icons: forestIconNames,
} as const;

export async function preloadForestAssets(assetKeys: readonly string[], variant: ForestAssetVariant = "default") {
  const assets = (await Promise.all(assetKeys.map((key) => getForestAsset(key, variant)))).filter((asset): asset is ForestAsset => Boolean(asset));
  if (typeof Image === "undefined") return assets;
  assets.forEach((asset) => {
    const image = new Image();
    image.decoding = "async";
    image.src = asset.url;
  });
  return assets;
}

export function retryForestImage(image: HTMLImageElement, asset: ForestAsset, attempt: number) {
  if (attempt > 1) return false;
  image.src = `${asset.url}${asset.url.includes("?") ? "&" : "?"}retry=${Date.now()}`;
  return true;
}
