import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CHARACTER_LIMIT } from "../constants.js";
import {
  GetModelDetailsInputSchema,
  ResponseFormat,
  type GetModelDetailsInput,
} from "../schemas/image.js";
import { fetchModelEndpoints } from "../services/openrouterClient.js";
import { formatUnknownError } from "../services/errors.js";
import type { EndpointInfo } from "../types.js";

function formatMarkdown(model: string, endpoints: EndpointInfo[]): string {
  const lines: string[] = [`# Endpoint Details: \`${model}\``, ""];

  if (!endpoints.length) {
    lines.push("No endpoints found for this model. Check the model id via " +
      "pixara_list_image_models.");
    return lines.join("\n");
  }

  for (const endpoint of endpoints) {
    lines.push(
      `## Provider: ${endpoint.provider_name ?? endpoint.provider_slug ?? "unknown"}` +
        (endpoint.supports_streaming ? " (supports streaming)" : ""),
    );

    if (endpoint.pricing?.length) {
      lines.push("**Pricing:**");
      for (const entry of endpoint.pricing) {
        const variant = entry.variant ? ` (${entry.variant})` : "";
        const cost = entry.cost_usd !== undefined ? `$${entry.cost_usd}` : "unknown";
        lines.push(`- ${entry.billable ?? "?"}${variant}: ${cost} / ${entry.unit ?? "?"}`);
      }
    }

    if (endpoint.supported_parameters) {
      lines.push("**Supported parameters:**");
      for (const [key, descriptor] of Object.entries(endpoint.supported_parameters)) {
        if (descriptor.type === "enum") {
          lines.push(`- ${key}: enum [${descriptor.values.join(", ")}]`);
        } else if (descriptor.type === "range") {
          lines.push(`- ${key}: range ${descriptor.min}-${descriptor.max}`);
        } else {
          lines.push(`- ${key}: supported`);
        }
      }
    }

    if (endpoint.allowed_passthrough_parameters?.length) {
      lines.push(
        `**Allowed passthrough params** (for provider_options): ${endpoint.allowed_passthrough_parameters.join(", ")}`,
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

function formatJson(model: string, endpoints: EndpointInfo[]): string {
  return JSON.stringify({ model, endpoints }, null, 2);
}

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.slice(0, CHARACTER_LIMIT) +
    "\n\n[Response truncated. This model has many provider endpoints — consider using " +
    "response_format='json' and processing programmatically.]"
  );
}

export function registerGetModelDetailsTool(server: McpServer): void {
  server.registerTool(
    "pixara_get_model_details",
    {
      title: "Get Model Details (OpenRouter)",
      description: `Get per-provider pricing, supported parameters, and passthrough options for one OpenRouter image model.

This is a read-only, no-cost call. Use it before pixara_generate_image /
pixara_edit_image to confirm exactly which parameters a model/provider supports and what
it costs — unsupported parameters are silently ignored or rejected by the API, so checking
first avoids wasted/failed calls.

Args:
  - model (string, required): OpenRouter model slug, e.g. 'black-forest-labs/flux.2-pro'.
  - response_format ('markdown'|'json', default 'markdown').

Returns:
  Per-provider breakdown: pricing (billable type, unit, price, tier/variant), supported
  parameter descriptors (enum values, numeric ranges, or plain booleans), and any
  allowed_passthrough_parameters for use with the generate/edit tools' provider_options field.

Examples:
  - Use when: "How much does flux.2-pro cost and what steps/guidance params does it take?"
  - Use when: "Does gpt-image-1 support transparent backgrounds on this provider?"
  - Don't use when: browsing across many models (use pixara_list_image_models instead)

Error Handling:
  - "Resource not found" / empty endpoints -> the model id may be wrong; verify with
    pixara_list_image_models`,
      inputSchema: GetModelDetailsInputSchema.shape,
      annotations: {
        title: "Get Model Details (OpenRouter)",
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: GetModelDetailsInput) => {
      try {
        const { endpoints } = await fetchModelEndpoints(params.model);

        const text =
          params.response_format === ResponseFormat.JSON
            ? formatJson(params.model, endpoints)
            : formatMarkdown(params.model, endpoints);

        return { content: [{ type: "text" as const, text: truncate(text) }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: formatUnknownError(error) }],
        };
      }
    },
  );
}
