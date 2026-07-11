# Pixara MCP Server

An MCP server that gives Claude (or any MCP client) direct access to OpenRouter's Image API —
generate images, edit/transform existing ones, and browse the model catalog, all through four
tools.

I built this because OpenRouter shipped a dedicated Image API (`/api/v1/images`, separate from
chat completions) that gives you one endpoint in front of FLUX, GPT Image, Imagen, Stable
Diffusion, Recraft, Ideogram, Midjourney, and more. There wasn't an MCP server for it yet, so
here's one.

## Features

- **Generate images** from a text prompt against any OpenRouter image model
- **Edit/transform images** (img2img) using a local file, a URL, or raw base64 as the reference — the tool reads and encodes local files for you
- **List models** with filtering by provider, name, and capability (img2img, streaming, transparent background), plus pagination
- **Inspect a model's endpoint details** — per-provider pricing, supported parameters, and allowed passthrough options — before you spend a call on something it doesn't support
- Generated images are decoded and saved to disk (not dumped into the conversation as base64), so responses stay small and you get a real file path back
- Actionable error messages for the common failure modes: bad/conflicting params, invalid key, insufficient credits, rate limits, provider unavailable

Not included in this version: SSE streaming (progressive partial renders). OpenRouter supports
it, but it doesn't map cleanly onto a single MCP tool call, so it's on the roadmap instead of
in v1.

## Installation

Requires Node.js 18+.

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` (or set these in your MCP client's config, see below):

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Get one at [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_IMAGE_OUTPUT_DIR` | No | Where generated images are saved. Defaults to `./generated-images` |
| `OPENROUTER_SITE_URL` | No | Sent as `HTTP-Referer` — lets OpenRouter attribute traffic to your app |
| `OPENROUTER_SITE_NAME` | No | Sent as `X-Title` — shows up in OpenRouter's rankings/dashboard |

## Using it with Claude Desktop / Claude Code

Add this to your MCP config (`claude_desktop_config.json` for Desktop, or your Claude Code MCP
settings):

```json
{
  "mcpServers": {
    "pixara": {
      "command": "node",
      "args": ["/absolute/path/to/openrouter-image-mcp/dist/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key-here"
      }
    }
  }
}
```

Restart the client and you should see the four `pixara_*` tools available.

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

## Project docs

- [OVERVIEW.md](OVERVIEW.md) — technical reference for how the server is put together
- [CHANGELOG.md](CHANGELOG.md) — what's changed release to release
- [ROADMAP.md](ROADMAP.md) — what's planned next

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

Made with 💖 by [Pink Pixel](https://pinkpixel.dev)
