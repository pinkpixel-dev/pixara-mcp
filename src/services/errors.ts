export class OpenRouterApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OpenRouterApiError";
  }
}

interface OpenRouterErrorBody {
  error?: {
    message?: string;
    code?: string | number;
  };
}

export async function toApiError(response: Response): Promise<OpenRouterApiError> {
  const status = response.status;
  let body: OpenRouterErrorBody = {};
  try {
    body = (await response.json()) as OpenRouterErrorBody;
  } catch {
    // response body wasn't JSON; fall through to status-based message
  }

  const upstreamMessage = body?.error?.message;

  switch (status) {
    case 400:
      return new OpenRouterApiError(
        `Error: Bad request${upstreamMessage ? ` — ${upstreamMessage}` : ""}. ` +
          "Check for unsupported or conflicting parameters (e.g. don't combine 'size' with " +
          "'resolution'/'aspect_ratio'). Use pixara_get_model_details to see exactly " +
          "which parameters this model supports before retrying.",
        status,
      );
    case 401:
      return new OpenRouterApiError(
        "Error: Invalid or missing OpenRouter API key. Check that OPENROUTER_API_KEY is set " +
          "correctly (get one at https://openrouter.ai/keys).",
        status,
      );
    case 402:
      return new OpenRouterApiError(
        "Error: Insufficient OpenRouter credits. Add credits to your account at " +
          "https://openrouter.ai/credits before retrying.",
        status,
      );
    case 429:
      return new OpenRouterApiError(
        "Error: Rate limited by OpenRouter. Wait a moment before retrying, or reduce request " +
          "frequency.",
        status,
      );
    case 503:
      return new OpenRouterApiError(
        `Error: The model/provider is temporarily unavailable${upstreamMessage ? ` — ${upstreamMessage}` : ""}. ` +
          "Try again shortly, or use pixara_list_image_models to pick an alternative model.",
        status,
      );
    default:
      return new OpenRouterApiError(
        `Error: OpenRouter request failed with status ${status}${upstreamMessage ? ` — ${upstreamMessage}` : ""}.`,
        status,
      );
  }
}

export function formatUnknownError(error: unknown): string {
  if (error instanceof OpenRouterApiError) {
    return error.message;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Error: Request timed out. The model may be slow under load — try again, or pick a faster model with pixara_list_image_models.";
  }
  if (error instanceof Error) {
    return `Error: Unexpected error occurred: ${error.message}`;
  }
  return `Error: Unexpected error occurred: ${String(error)}`;
}
