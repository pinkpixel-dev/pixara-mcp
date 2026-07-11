export const API_BASE_URL = "https://openrouter.ai/api/v1";
export const IMAGES_ENDPOINT = `${API_BASE_URL}/images`;
export const IMAGE_MODELS_ENDPOINT = `${API_BASE_URL}/images/models`;

export const CHARACTER_LIMIT = 25000;

export const DEFAULT_OUTPUT_DIR =
  process.env.OPENROUTER_IMAGE_OUTPUT_DIR || "./generated-images";

export const REQUEST_TIMEOUT_MS = 120_000;

export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
