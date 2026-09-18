export type AppEnvironment = "alpha" | "development";

type PublicEnvironment = Record<string, string | boolean | undefined>;

export type AppConfig = {
  environment: AppEnvironment;
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function required(env: PublicEnvironment, name: string) {
  const value = env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Fovyn configuration error: ${name} is required.`);
  }
  return value.trim();
}

export function readAppConfig(env: PublicEnvironment): AppConfig {
  const environment = required(env, "VITE_FOVYN_ENVIRONMENT");
  if (environment !== "alpha" && environment !== "development") {
    throw new Error(
      "Fovyn configuration error: VITE_FOVYN_ENVIRONMENT must be alpha or development.",
    );
  }
  const supabaseUrl = required(env, "VITE_SUPABASE_URL");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("Fovyn configuration error: VITE_SUPABASE_URL must be a valid URL.");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("Fovyn configuration error: VITE_SUPABASE_URL must use HTTPS.");
  }
  return {
    environment,
    supabaseUrl: parsedUrl.toString().replace(/\/$/, ""),
    supabasePublishableKey: required(env, "VITE_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export const appConfig = readAppConfig(import.meta.env);
