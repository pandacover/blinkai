export class OpenRouterKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterKeyError";
  }
}

export type ServerConfig = {
  openRouterApiKey: string;
  dataDir: string;
};

export type EnvLike = Record<string, string | undefined>;

const KEY_GUIDANCE =
  "Set OPENROUTER_API_KEY in a gitignored .env at the app root (see .env.example). Get a key at https://openrouter.ai/keys.";

export function loadServerConfig(
  env: EnvLike = process.env as EnvLike,
  options: { appRoot?: string } = {},
): ServerConfig {
  const rawKey = env.OPENROUTER_API_KEY;
  const openRouterApiKey = typeof rawKey === "string" ? rawKey.trim() : "";

  if (!openRouterApiKey) {
    throw new OpenRouterKeyError(
      `Missing or invalid OPENROUTER_API_KEY. ${KEY_GUIDANCE}`,
    );
  }

  const appRoot = options.appRoot ?? process.cwd();
  const dataDir =
    typeof env.BLINKAI_DATA_DIR === "string" && env.BLINKAI_DATA_DIR.trim()
      ? env.BLINKAI_DATA_DIR.trim()
      : `${appRoot}/data`;

  return { openRouterApiKey, dataDir };
}
