import { z } from "zod";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export const ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "4:5",
  "5:4",
  "1:2",
  "2:1",
  "9:21",
  "21:9",
] as const;

export const RESOLUTIONS = ["512", "1K", "2K", "4K"] as const;
export const QUALITIES = ["auto", "low", "medium", "high"] as const;
export const OUTPUT_FORMATS = ["png", "jpeg", "webp"] as const;
export const BACKGROUNDS = ["auto", "transparent", "opaque"] as const;

const generationFields = {
  model: z
    .string()
    .min(1, "model is required")
    .describe(
      "OpenRouter model slug, e.g. 'black-forest-labs/flux-1.1-pro' or 'openai/gpt-image-1'. " +
        "Use pixara_list_image_models to discover available models.",
    ),
  prompt: z
    .string()
    .min(1, "prompt is required")
    .max(4000, "prompt must not exceed 4000 characters")
    .describe("Text description of the desired image."),
  n: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe("Number of images to generate (1-10). Not all models support n > 1."),
  resolution: z
    .enum(RESOLUTIONS)
    .optional()
    .describe("Resolution tier: '512', '1K', '2K', or '4K'. Don't combine with 'size'."),
  aspect_ratio: z
    .enum(ASPECT_RATIOS)
    .optional()
    .describe("Aspect ratio, e.g. '16:9' or '1:1'. Don't combine with 'size'."),
  size: z
    .string()
    .optional()
    .describe(
      "Convenience shorthand for either a tier ('2K') or explicit dimensions ('2048x2048'). " +
        "Don't combine with 'resolution' or 'aspect_ratio'.",
    ),
  quality: z
    .enum(QUALITIES)
    .optional()
    .describe("Quality tier: 'auto', 'low', 'medium', or 'high'."),
  output_format: z
    .enum(OUTPUT_FORMATS)
    .default("png")
    .describe("Output image format: 'png', 'jpeg', or 'webp'."),
  background: z
    .enum(BACKGROUNDS)
    .optional()
    .describe(
      "Background handling: 'auto', 'transparent', or 'opaque'. 'transparent' requires " +
        "output_format 'png' or 'webp'.",
    ),
  output_compression: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe("Compression level 0-100, only applies to 'webp'/'jpeg' output_format."),
  seed: z.number().int().optional().describe("Seed for deterministic generation, where supported."),
  provider_options: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      "Provider-specific passthrough params, keyed by provider slug, e.g. " +
        "{ 'black-forest-labs': { steps: 40, guidance: 3 } }. Check pixara_get_model_details " +
        "for each provider's allowed_passthrough_parameters before using this.",
    ),
  output_dir: z
    .string()
    .optional()
    .describe("Directory to save generated images into. Defaults to OPENROUTER_IMAGE_OUTPUT_DIR."),
  filename_prefix: z
    .string()
    .optional()
    .describe("Prefix for saved image filenames (default: 'openrouter-image')."),
};

export function findSizeConflictError(value: {
  size?: string;
  resolution?: string;
  aspect_ratio?: string;
}): string | undefined {
  if (value.size && (value.resolution || value.aspect_ratio)) {
    return (
      "Error: 'size' cannot be combined with 'resolution' or 'aspect_ratio' — pass only one " +
      "of these. Use 'size' as a convenience shorthand, or 'resolution'/'aspect_ratio' for " +
      "finer control, not both."
    );
  }
  return undefined;
}

export const GenerateImageInputSchema = z.object({ ...generationFields }).strict();

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const InputReferenceSchema = z.discriminatedUnion("source", [
  z
    .object({
      source: z.literal("file"),
      path: z.string().min(1).describe("Absolute or relative path to a local image file."),
    })
    .strict(),
  z
    .object({
      source: z.literal("url"),
      url: z.string().url().describe("Publicly reachable URL of a reference image."),
    })
    .strict(),
  z
    .object({
      source: z.literal("base64"),
      data: z.string().min(1).describe("Raw base64-encoded image data (no data: prefix)."),
      media_type: z
        .string()
        .min(1)
        .describe("MIME type of the data, e.g. 'image/png' or 'image/jpeg'."),
    })
    .strict(),
]);

export const EditImageInputSchema = z
  .object({
    ...generationFields,
    input_references: z
      .array(InputReferenceSchema)
      .min(1, "at least one input_references entry is required")
      .describe(
        "Reference image(s) to edit/transform. Each entry is a local file path, a remote URL, " +
          "or raw base64 data — the tool handles reading/encoding for you.",
      ),
  })
  .strict();

export type EditImageInput = z.infer<typeof EditImageInputSchema>;

export const ListImageModelsInputSchema = z
  .object({
    filter: z
      .string()
      .optional()
      .describe("Case-insensitive substring match against model id or name."),
    provider: z
      .string()
      .optional()
      .describe("Filter to models whose id starts with this provider prefix, e.g. 'openai'."),
    supports_img2img: z
      .boolean()
      .optional()
      .describe("Only include models that support image-to-image via input_references."),
    supports_streaming: z
      .boolean()
      .optional()
      .describe("Only include models that support SSE streaming."),
    supports_transparent_background: z
      .boolean()
      .optional()
      .describe("Only include models that support transparent backgrounds."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(30)
      .describe("Maximum number of models to return (1-100)."),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of models to skip, for pagination."),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for humans or 'json' for machine processing."),
  })
  .strict();

export type ListImageModelsInput = z.infer<typeof ListImageModelsInputSchema>;

export const GetModelDetailsInputSchema = z
  .object({
    model: z
      .string()
      .min(1, "model is required")
      .describe("OpenRouter model slug to inspect, e.g. 'openai/gpt-image-1'."),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for humans or 'json' for machine processing."),
  })
  .strict();

export type GetModelDetailsInput = z.infer<typeof GetModelDetailsInputSchema>;
