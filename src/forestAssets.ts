import { supabase } from "./supabase";
import { growthRegistry } from "./domain";

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
  default_scale: number;
  mobile_scale_modifier: number;
  desktop_scale_modifier: number;
  url: string;
};

const columns = "asset_key,asset_version,variant,asset_kind,stage,canonical_name,storage_path,mime_type,width,height,anchor_x,anchor_y,default_scale,mobile_scale_modifier,desktop_scale_modifier";

export async function getForestAsset(assetKey: string, variant: ForestAssetVariant = "default"): Promise<ForestAsset | null> {
  const { data, error } = await supabase
    .from("forest_asset_manifest")
    .select(columns)
    .eq("asset_key", assetKey)
    .eq("status", "ready")
    .in("variant", variant === "default" ? ["default"] : [variant, "default"])
    .order("asset_version", { ascending: false });
  if (error) {
    console.warn("Forest asset lookup failed", { assetKey, variant });
    return null;
  }
  const rows = (data ?? []) as unknown as Omit<ForestAsset, "url">[];
  const row = rows.find((item) => item.variant === variant) ?? rows.find((item) => item.variant === "default");
  if (!row?.storage_path) return null;
  const { data: publicAsset } = supabase.storage.from(FOREST_ASSET_BUCKET).getPublicUrl(row.storage_path);
  return { ...row, url: publicAsset.publicUrl };
}

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

