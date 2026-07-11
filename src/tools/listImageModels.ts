import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTER_LIMIT } from "../constants.js";
import {
  ListImageModelsInputSchema,
  ResponseFormat,
  type ListImageModelsInput,
} from "../schemas/image.js";
import { fetchImageModels } from "../services/openrouterClient.js";
import { formatUnknownError } from "../services/errors.js";
import type { ImageModelInfo } from "../types.js";

function hasParameter(model: ImageModelInfo, paramKey: string): boolean {
  return Boolean(model.supported_parameters && paramKey in model.supported_parameters);
}

function supportsTransparentBackground(model: ImageModelInfo): boolean {
  const descriptor = model.supported_parameters?.background;
  return Boolean(descriptor && descriptor.type === "enum" && descriptor.values.includes("transparent"));
}

function matchesFilters(model: ImageModelInfo, params: ListImageModelsInput): boolean {
  if (params.filter) {
    const needle = params.filter.toLowerCase();
    const haystack = `${model.id} ${model.name ?? ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (params.provider && !model.id.startsWith(params.provider)) {
    return false;
  }
  if (params.supports_img2img && !hasParameter(model, "input_references")) {
    return false;
  }
  if (params.supports_streaming && !model.supports_streaming) {
    return false;
  }
  if (params.supports_transparent_background && !supportsTransparentBackground(model)) {
    return false;
  }
  return true;
}

function formatMarkdown(models: ImageModelInfo[], total: number, params: ListImageModelsInput): string {
  const lines: string[] = [`# OpenRouter Image Models`, ""];
  lines.push(`Showing ${models.length} of ${total} matching models (offset ${params.offset}).`);
  lines.push("");

  for (const model of models) {
    lines.push(`## ${model.name ?? model.id} (\`${model.id}\`)`);
    if (model.description) lines.push(model.description);
    if (model.supported_parameters) {
      const keys = Object.keys(model.supported_parameters);
      if (keys.length) lines.push(`Supported parameters: ${keys.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatJson(models: ImageModelInfo[], total: number, params: ListImageModelsInput): string {
  const hasMore = total > params.offset + models.length;
  const response = {
    total,
    count: models.length,
    offset: params.offset,
    models,
    has_more: hasMore,
    ...(hasMore ? { next_offset: params.offset + models.length } : {}),
  };
  return JSON.stringify(response, null, 2);
}

function truncate(text: string, count: number, total: number): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  const ratio = Math.max(1, Math.floor(count / 2));
  return (
    text.slice(0, CHARACTER_LIMIT) +
    `\n\n[Response truncated — showing partial results out of ${count} (${total} total). ` +
    `Use 'limit'/'offset' or a narrower 'filter' to reduce results. Try limit=${ratio}.]`
  );
}

export function registerListImageModelsTool(server: McpServer): void {
  server.registerTool(
    "pixara_list_image_models",
    {
      title: "List Image Models (OpenRouter)",
      description: `List image-generation models available on OpenRouter, with filtering and pagination.

This is a read-only, no-cost call (no image is generated). Use it to discover model IDs
before calling pixara_generate_image or pixara_edit_image, or to find models with a
specific capability.

Args:
  - filter (string, optional): Case-insensitive substring match against model id or name.
  - provider (string, optional): Restrict to models whose id starts with this prefix, e.g.
    'openai', 'black-forest-labs'.
  - supports_img2img (boolean, optional): Only models that accept input_references.
  - supports_streaming (boolean, optional): Only models that support SSE streaming.
  - supports_transparent_background (boolean, optional): Only models supporting transparent
    backgrounds.
  - limit (number, 1-100, default 30), offset (number, default 0): Pagination.
  - response_format ('markdown'|'json', default 'markdown').

Returns:
  For JSON: { total, count, offset, models: [...], has_more, next_offset? }
  For Markdown: a heading per model with id, description, and supported parameter names.

Examples:
  - Use when: "What image models can do transparent backgrounds?" ->
    supports_transparent_background=true
  - Use when: "Show me FLUX models" -> filter='flux'
  - Don't use when: you already know the exact model id (skip straight to generate_image)`,
      inputSchema: ListImageModelsInputSchema.shape,
      annotations: {
        title: "List Image Models (OpenRouter)",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: ListImageModelsInput) => {
      try {
        const { data } = await fetchImageModels();
        const filtered = data.filter((model) => matchesFilters(model, params));
        const page = filtered.slice(params.offset, params.offset + params.limit);

        const text =
          params.response_format === ResponseFormat.JSON
            ? formatJson(page, filtered.length, params)
            : formatMarkdown(page, filtered.length, params);

        return {
          content: [{ type: "text" as const, text: truncate(text, page.length, filtered.length) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: formatUnknownError(error) }],
        };
      }
    },
  );
}
