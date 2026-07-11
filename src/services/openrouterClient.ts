import {
  IMAGES_ENDPOINT,
  IMAGE_MODELS_ENDPOINT,
  REQUEST_TIMEOUT_MS,
} from "../constants.js";
import type {
  GenerateImagesRequest,
  ImageModelsListResponse,
  ModelEndpointsResponse,
  OpenRouterImageResponse,
} from "../types.js";
import { toApiError } from "./errors.js";

function requireApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not set. Restart the server with a valid key.",
    );
  }
  return key;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireApiKey()}`,
    "Content-Type": "application/json",
  };

  if (process.env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  }
  if (process.env.OPENROUTER_SITE_NAME) {
    headers["X-Title"] = process.env.OPENROUTER_SITE_NAME;
  }

  return headers;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateImages(
  request: GenerateImagesRequest,
): Promise<OpenRouterImageResponse> {
  const response = await fetchWithTimeout(IMAGES_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as OpenRouterImageResponse;
}

export async function fetchImageModels(): Promise<ImageModelsListResponse> {
  const response = await fetchWithTimeout(IMAGE_MODELS_ENDPOINT, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as ImageModelsListResponse;
}

export async function fetchModelEndpoints(
  modelId: string,
): Promise<ModelEndpointsResponse> {
  // Model IDs are "provider/model-name" — the slash is a path separator, not literal data,
  // so each segment is encoded individually rather than encoding the whole id (which would
  // turn "/" into "%2F" and break the route).
  const encodedPath = modelId.split("/").map(encodeURIComponent).join("/");
  const response = await fetchWithTimeout(
    `${IMAGE_MODELS_ENDPOINT}/${encodedPath}/endpoints`,
    {
      method: "GET",
      headers: buildHeaders(),
    },
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as ModelEndpointsResponse;
}
