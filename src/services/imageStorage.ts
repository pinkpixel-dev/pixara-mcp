import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MIME_TO_EXTENSION } from "../constants.js";
import type { ImageDataItem, SavedImageFile } from "../types.js";

function sanitizePrefix(prefix: string): string {
  return prefix.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60) || "image";
}

function resolveExtension(mediaType: string | undefined, defaultFormat: string): string {
  if (mediaType && MIME_TO_EXTENSION[mediaType]) {
    return MIME_TO_EXTENSION[mediaType];
  }
  return defaultFormat === "jpeg" ? "jpg" : defaultFormat;
}

export interface SaveImagesOptions {
  outputDir: string;
  filenamePrefix?: string;
  defaultFormat: string;
}

export async function decodeAndSaveImages(
  images: ImageDataItem[],
  options: SaveImagesOptions,
): Promise<SavedImageFile[]> {
  const resolvedDir = path.resolve(options.outputDir);
  await mkdir(resolvedDir, { recursive: true });

  const prefix = sanitizePrefix(options.filenamePrefix || "openrouter-image");
  const timestamp = Date.now();

  const saved: SavedImageFile[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const mediaType = image.media_type || `image/${options.defaultFormat === "jpg" ? "jpeg" : options.defaultFormat}`;
    const extension = resolveExtension(image.media_type, options.defaultFormat);
    const filename = `${prefix}-${timestamp}-${i + 1}.${extension}`;
    const filePath = path.join(resolvedDir, filename);

    const buffer = Buffer.from(image.b64_json, "base64");
    await writeFile(filePath, buffer);

    saved.push({
      path: filePath,
      bytes: buffer.byteLength,
      mediaType,
      extension,
    });
  }

  return saved;
}
