import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_OUTPUT_DIR } from "../constants.js";
import type {
  GenerateImagesRequest,
  InputReference,
  SavedImageFile,
} from "../types.js";

interface CommonGenerationFields {
  model: string;
  prompt: string;
  n: number;
  resolution?: string;
  aspect_ratio?: string;
  size?: string;
  quality?: string;
  output_format: string;
  background?: string;
  output_compression?: number;
  seed?: number;
  provider_options?: Record<string, Record<string, unknown>>;
}

export function buildGenerationRequest(
  params: CommonGenerationFields,
  inputReferences?: InputReference[],
): GenerateImagesRequest {
  const request: GenerateImagesRequest = {
    model: params.model,
    prompt: params.prompt,
    n: params.n,
    output_format: params.output_format,
  };

  if (params.resolution) request.resolution = params.resolution;
  if (params.aspect_ratio) request.aspect_ratio = params.aspect_ratio;
  if (params.size) request.size = params.size;
  if (params.quality) request.quality = params.quality;
  if (params.background) request.background = params.background;
  if (params.output_compression !== undefined) {
    request.output_compression = params.output_compression;
  }
  if (params.seed !== undefined) request.seed = params.seed;
  if (params.provider_options) {
    request.provider = { options: params.provider_options };
  }
  if (inputReferences?.length) {
    request.input_references = inputReferences;
  }

  return request;
}

type InputReferenceSource =
  | { source: "file"; path: string }
  | { source: "url"; url: string }
  | { source: "base64"; data: string; media_type: string };

function guessMimeFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function resolveInputReferences(
  refs: InputReferenceSource[],
): Promise<InputReference[]> {
  const resolved: InputReference[] = [];

  for (const ref of refs) {
    if (ref.source === "url") {
      resolved.push({ type: "image_url", image_url: { url: ref.url } });
    } else if (ref.source === "base64") {
      resolved.push({
        type: "image_url",
        image_url: { url: `data:${ref.media_type};base64,${ref.data}` },
      });
    } else {
      let fileData: Buffer;
      try {
        fileData = await readFile(ref.path);
      } catch (error) {
        throw new Error(
          `Error: Could not read reference image at '${ref.path}': ${
            error instanceof Error ? error.message : String(error)
          }. Check that the path is correct and readable.`,
        );
      }
      const mimeType = guessMimeFromExtension(ref.path);
      resolved.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileData.toString("base64")}` },
      });
    }
  }

  return resolved;
}

export function formatGenerationResult(options: {
  model: string;
  saved: SavedImageFile[];
  cost?: number;
}): string {
  const { model, saved, cost } = options;
  const lines: string[] = [];

  lines.push(
    `Generated ${saved.length} image${saved.length === 1 ? "" : "s"} with \`${model}\`.`,
  );
  lines.push("");

  for (const file of saved) {
    lines.push(`- ${file.path} (${file.mediaType}, ${file.bytes.toLocaleString()} bytes)`);
  }

  lines.push("");
  lines.push(`Cost: ${cost !== undefined ? `$${cost.toFixed(4)}` : "unknown"}`);

  return lines.join("\n");
}

export function resolveOutputDir(override?: string): string {
  return override || DEFAULT_OUTPUT_DIR;
}
