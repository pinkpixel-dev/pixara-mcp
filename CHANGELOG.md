# Changelog

All notable changes to this project are documented here.

## [1.0.0] - 2026-07-11

### Added

- Initial release: Pixara, an MCP server for OpenRouter's Image API (`/api/v1/images`)
- `pixara_generate_image` — text-to-image generation across any OpenRouter image model
- `pixara_edit_image` — image-to-image editing with local file, URL, or base64 reference inputs
- `pixara_list_image_models` — model discovery with filtering and pagination
- `pixara_get_model_details` — per-provider pricing and supported-parameter lookup
- Generated images are decoded and saved to disk with configurable output directory
- Actionable error handling for OpenRouter's documented error codes (400/401/402/429/503)

### Fixed

- `pixara_get_model_details` was 404ing on every call — `fetchModelEndpoints()` was encoding
  the `/` in `provider/model-name` IDs as `%2F`, breaking the endpoint route. Fixed by encoding
  each path segment individually instead of the whole ID. Caught via a live smoke test against
  the real API before shipping.
- `pixara_list_image_models`'s `supports_streaming` and `supports_transparent_background`
  filters were checking the wrong fields (a `supported_parameters.stream` key that doesn't
  exist, and mere presence of `background` rather than checking its enum values include
  `transparent`). Fixed against the real API response shape.
