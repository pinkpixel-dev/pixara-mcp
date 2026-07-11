# Pixara MCP Server

<p align="center">
  <img src="./logo.png" alt=Logo" width="300" />
</p>

An MCP server that gives LLMs direct access to OpenRouter's Image API to generate images, edit/transform existing ones, and browse the model catalog, all through 4 tools.

I built this because I saw that OpenRouter announced a new Image API (`/api/v1/images`) that gives you one endpoint to use image generation and image editing models like GPT Image, Nano Banana, Flux, Recraft, and more. Use the `pixara_list_image_models` tool to see the full, current models list from OpenRouter.

## Features

- **Generate images** from a text prompt against any OpenRouter image model
- **Edit/transform images** (img2img) using a local file, a URL, or raw base64 as the reference, and the tool reads and encodes local files for you
- **List models** with filtering by provider, name, and capability (img2img, streaming, transparent background), plus pagination
- **Inspect a model's endpoint details:** per-provider pricing, supported parameters, and allowed passthrough options — before you spend a call on something it doesn't support
- Generated images are decoded and saved to disk, so responses stay small and a file path is returned
- Clear error messages for common failure modes: bad/conflicting params, invalid key, insufficient credits, rate limits, provider unavailable

## Quick start (recommended)

Pixara is published on npm as [`@pinkpixel/pixara-mcp`](https://www.npmjs.com/package/@pinkpixel/pixara-mcp).
The easiest way to use it is via `npx` — no install, no cloning, no build step. 

Add this to your MCP config (`claude_desktop_config.json`) for Claude Desktop, or your MCP client's .json config file:

```json
{
  "mcpServers": {
    "pixara": {
      "command": "npx",
      "args": ["-y", "@pinkpixel/pixara-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key-here",
        "OPENROUTER_IMAGE_OUTPUT_DIR": "/absolute/path/to/wherever/you/want/images"
      }
    }
  }
}
```

Restart the client and you should see the four `pixara_*` tools available. `npx -y` fetches
and caches the package on first run, so there's nothing to update manually. New versions get
picked up automatically.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Get one at [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_IMAGE_OUTPUT_DIR` | No | Where generated images are saved. Defaults to `./pixara-images` |

The server just reads these from `process.env` — there's no `.env` file loading built in.
Whether you're running via `npx` or from source, set these in the `env` block of your MCP
config, as shown above. `OPENROUTER_IMAGE_OUTPUT_DIR` is optional — leave it out and images
save to `./pixara-images` relative to wherever the server process runs; set it to an
absolute path if you want a predictable location regardless of the client's working directory.

## Installing from source

For local development, or if you'd rather not rely on `npx`:

Requires Node.js 18+.

```bash
git clone https://github.com/sizzlebop/pixara-mcp.git
cd pixara-mcp
npm install
npm run build
```

Then point your MCP config at the built file instead of `npx`:

```json
{
  "mcpServers": {
    "pixara": {
      "command": "node",
      "args": ["/absolute/path/to/openrouter-image-mcp/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key-here",
        "OPENROUTER_IMAGE_OUTPUT_DIR": "/absolute/path/to/wherever/you/want/images"
      }
    }
  }
}
```

## Tools

### `pixara_generate_image`

Text-to-image. Required: `model`, `prompt`. Optional: `n`, `resolution`, `aspect_ratio`,
`size`, `quality`, `output_format`, `background`, `output_compression`, `seed`,
`provider_options`, `output_dir`, `filename_prefix`.

Don't combine `size` with `resolution`/`aspect_ratio` — pick one or the other, the tool will
reject the call with a clear message if you mix them.

### `pixara_edit_image`

Same params as `generate_image`, plus a required `input_references` array. Each entry is one
of:

```json
{ "source": "file", "path": "/path/to/photo.png" }
{ "source": "url", "url": "https://example.com/photo.jpg" }
{ "source": "base64", "data": "<base64>", "media_type": "image/png" }
```

### `pixara_list_image_models`

Read-only, free (no image billing). Filter by `filter` (substring), `provider`, or capability
booleans (`supports_img2img`, `supports_streaming`, `supports_transparent_background`).
Paginated with `limit`/`offset`.

### `pixara_get_model_details`

Read-only, free. Pass a `model` slug, get back per-provider pricing and exactly which
parameters/passthrough options that provider supports. Worth calling before you use
`provider_options`, since unsupported params get silently dropped or rejected by the API.

## How it decides where to save images

Every generate/edit call decodes the base64 image(s) OpenRouter returns and writes them to
`OPENROUTER_IMAGE_OUTPUT_DIR` (or a per-call `output_dir` override), named
`{prefix}-{timestamp}-{index}.{ext}`. The extension follows `output_format`, except for
vector output (Recraft's SVG models), which is detected via the response's `media_type` and
written as `.svg` regardless of what `output_format` was requested.

## Limitations

- No SSE streaming support yet (see Roadmap)
- Model capabilities vary a lot by provider, and OpenRouter's catalog moves fast — always
  trust `pixara_list_image_models`/`pixara_get_model_details` over any hardcoded list
- This is new — OpenRouter's Image API has only been out a couple of weeks, so expect model
  IDs and params to shift over time

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

Made with 💖 by [Pink Pixel](https://pinkpixel.dev)
