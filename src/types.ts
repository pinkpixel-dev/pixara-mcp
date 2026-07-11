export interface ImageDataItem {
  b64_json: string;
  media_type?: string;
}

export interface ImageUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
}

export interface OpenRouterImageResponse {
  created: number;
  data: ImageDataItem[];
  usage?: ImageUsage;
}

export interface InputReferenceImageUrl {
  url: string;
}

export interface InputReference {
  type: "image_url";
  image_url: InputReferenceImageUrl;
}

export interface ProviderOptions {
  options?: Record<string, Record<string, unknown>>;
}

export interface GenerateImagesRequest {
  model: string;
  prompt: string;
  n?: number;
  resolution?: string;
  aspect_ratio?: string;
  size?: string;
  quality?: string;
  output_format?: string;
  background?: string;
  output_compression?: number;
  seed?: number;
  input_references?: InputReference[];
  provider?: ProviderOptions;
}

export interface ParameterDescriptorEnum {
  type: "enum";
  values: string[];
}

export interface ParameterDescriptorRange {
  type: "range";
  min: number;
  max: number;
}

export interface ParameterDescriptorBoolean {
  type: "boolean";
}

export type ParameterDescriptor =
  | ParameterDescriptorEnum
  | ParameterDescriptorRange
  | ParameterDescriptorBoolean;

export interface ImageModelInfo {
  id: string;
  name?: string;
  description?: string;
  supported_parameters?: Record<string, ParameterDescriptor>;
  supports_streaming?: boolean;
  [key: string]: unknown;
}

export interface ImageModelsListResponse {
  data: ImageModelInfo[];
}

export interface PricingEntry {
  billable?: string;
  unit?: string;
  cost_usd?: number;
  variant?: string;
  [key: string]: unknown;
}

export interface EndpointInfo {
  provider_slug?: string;
  provider_name?: string;
  pricing?: PricingEntry[];
  supported_parameters?: Record<string, ParameterDescriptor>;
  allowed_passthrough_parameters?: string[];
  supports_streaming?: boolean;
  [key: string]: unknown;
}

export interface ModelEndpointsResponse {
  endpoints: EndpointInfo[];
}

export interface SavedImageFile {
  path: string;
  bytes: number;
  mediaType: string;
  extension: string;
}
