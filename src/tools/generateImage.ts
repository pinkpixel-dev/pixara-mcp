import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  GenerateImageInputSchema,
  findSizeConflictError,
  type GenerateImageInput,
} from "../schemas/image.js";
import { generateImages } from "../services/openrouterClient.js";
import { decodeAndSaveImages } from "../services/imageStorage.js";
import { formatUnknownError } from "../services/errors.js";
import { buildGenerationRequest, formatGenerationResult, resolveOutputDir } from "./shared.js";

export function registerGenerateImageTool(server: McpServer): void {
  server.registerTool(
    "pixara_generate_image",
    {
      title: "Generate Image (OpenRouter)",
      description: `Generate an image from a text prompt using any image model available on OpenRouter.

This calls OpenRouter's dedicated Image API (not chat completions) and saves the resulting
image(s) to disk, returning the file path(s), model used, and cost. It does NOT edit or use
reference images — for image-to-image/editing, use pixara_edit_image instead.

Args:
  - model (string): OpenRouter model slug, e.g. 'black-forest-labs/flux-1.1-pro' or
    'openai/gpt-image-1'. Use pixara_list_image_models to discover options.
  - prompt (string): Text description of the desired image.
  - n (number, 1-10, default 1): Number of images to generate. Not all models support n > 1.
  - resolution ('512'|'1K'|'2K'|'4K', optional): Resolution tier.
  - aspect_ratio (string, optional): e.g. '16:9', '1:1'. Don't combine with 'size'.
  - size (string, optional): Convenience tier or explicit dimensions. Don't combine with
    resolution/aspect_ratio.
  - quality ('auto'|'low'|'medium'|'high', optional)
  - output_format ('png'|'jpeg'|'webp', default 'png')
  - background ('auto'|'transparent'|'opaque', optional): 'transparent' requires png/webp.
  - output_compression (0-100, optional): webp/jpeg only.
  - seed (number, optional): For deterministic generation where supported.
  - provider_options (object, optional): Provider-specific passthrough params. Check
    pixara_get_model_details first for allowed keys.
  - output_dir (string, optional): Where to save images (default: OPENROUTER_IMAGE_OUTPUT_DIR).
  - filename_prefix (string, optional): Prefix for saved filenames.

Returns:
  Markdown summary listing each saved file's path, media type, size in bytes, and the total
  cost charged by OpenRouter for the request.

Examples:
  - Use when: "Generate a picture of a red panda astronaut" -> model + prompt only
  - Use when: "Make a transparent-background product shot" -> background='transparent',
    output_format='png'
  - Don't use when: you have a reference image to transform (use pixara_edit_image)

Error Handling:
  - "Insufficient OpenRouter credits" -> add credits at https://openrouter.ai/credits
  - "Bad request" / conflicting params -> re-check with pixara_get_model_details
  - "Rate limited" -> wait and retry`,
      inputSchema: GenerateImageInputSchema.shape,
      annotations: {
        title: "Generate Image (OpenRouter)",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: GenerateImageInput) => {
      const conflictError = findSizeConflictError(params);
      if (conflictError) {
        return { isError: true, content: [{ type: "text" as const, text: conflictError }] };
      }

      try {
        const request = buildGenerationRequest(params);
        const response = await generateImages(request);

        const saved = await decodeAndSaveImages(response.data, {
          outputDir: resolveOutputDir(params.output_dir),
          filenamePrefix: params.filename_prefix,
          defaultFormat: params.output_format,
        });

        const text = formatGenerationResult({
          model: params.model,
          saved,
          cost: response.usage?.cost,
        });

        return { content: [{ type: "text" as const, text }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: formatUnknownError(error) }],
        };
      }
    },
  );
}
