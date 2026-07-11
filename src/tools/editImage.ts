import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  EditImageInputSchema,
  findSizeConflictError,
  type EditImageInput,
} from "../schemas/image.js";
import { generateImages } from "../services/openrouterClient.js";
import { decodeAndSaveImages } from "../services/imageStorage.js";
import { formatUnknownError } from "../services/errors.js";
import {
  buildGenerationRequest,
  formatGenerationResult,
  resolveInputReferences,
  resolveOutputDir,
} from "./shared.js";

export function registerEditImageTool(server: McpServer): void {
  server.registerTool(
    "pixara_edit_image",
    {
      title: "Edit Image (OpenRouter)",
      description: `Edit or transform an existing image using a text prompt and one or more reference images, via any image-to-image-capable model on OpenRouter.

This calls OpenRouter's Image API with input_references and saves the resulting image(s) to
disk. Reference images can be a local file path, a remote URL, or raw base64 — this tool
handles reading/encoding local files itself, so you never need to pre-encode anything.

Args:
  - model (string): Must support image-to-image, e.g. 'openai/gpt-image-1' or
    'bytedance-seed/seedream-4.5'. Check with pixara_get_model_details first if unsure.
  - prompt (string): Instruction describing the desired edit/transformation.
  - input_references (array, required, 1+): Each entry is one of:
      { source: "file", path: "/abs/or/relative/path.png" }
      { source: "url", url: "https://example.com/photo.jpg" }
      { source: "base64", data: "<base64>", media_type: "image/png" }
  - n, resolution, aspect_ratio, size, quality, output_format, background,
    output_compression, seed, provider_options, output_dir, filename_prefix: same meaning as
    in pixara_generate_image.

Returns:
  Markdown summary listing each saved file's path, media type, size in bytes, and the total
  cost charged by OpenRouter for the request.

Examples:
  - Use when: "Make this photo look like a watercolor painting" with a local file path
  - Use when: "Remove the background from this product photo" with a URL reference
  - Don't use when: there's no reference image at all (use pixara_generate_image)

Error Handling:
  - "Could not read reference image" -> check the file path is correct and readable
  - "Bad request" -> the chosen model may not support img2img; verify with
    pixara_get_model_details
  - "Insufficient OpenRouter credits" -> add credits at https://openrouter.ai/credits`,
      inputSchema: EditImageInputSchema.shape,
      annotations: {
        title: "Edit Image (OpenRouter)",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params: EditImageInput) => {
      const conflictError = findSizeConflictError(params);
      if (conflictError) {
        return { isError: true, content: [{ type: "text" as const, text: conflictError }] };
      }

      try {
        const inputReferences = await resolveInputReferences(params.input_references);
        const request = buildGenerationRequest(params, inputReferences);
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
