#!/usr/bin/env node
/**
 * Pixara — MCP server exposing OpenRouter's Image API (/api/v1/images) as tools:
 * generate, edit (img2img), list models, and inspect per-provider model details.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGenerateImageTool } from "./tools/generateImage.js";
import { registerEditImageTool } from "./tools/editImage.js";
import { registerListImageModelsTool } from "./tools/listImageModels.js";
import { registerGetModelDetailsTool } from "./tools/getModelDetails.js";

const server = new McpServer({
  name: "pixara-mcp",
  version: "1.0.1",
});

registerGenerateImageTool(server);
registerEditImageTool(server);
registerListImageModelsTool(server);
registerGetModelDetailsTool(server);

async function main(): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error(
      "ERROR: OPENROUTER_API_KEY environment variable is required. " +
        "Get one at https://openrouter.ai/keys and set it before starting this server.",
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("pixara-mcp running via stdio");
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
