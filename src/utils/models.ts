export const REASONING_MODELS = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'o3',
  'o3-pro',
  'o4-mini',
] as const;

export const REGULAR_MODELS = ['gpt-4.1', 'gpt-4.1-mini'] as const;

export const ALL_SUPPORTED_MODELS = [
  ...REASONING_MODELS,
  ...REGULAR_MODELS,
] as const;

export type SupportedModel = (typeof ALL_SUPPORTED_MODELS)[number];

export function isReasoningModel(model: string): boolean {
  return REASONING_MODELS.includes(model as any);
}

export function isSupportedModel(model: string): model is SupportedModel {
  return ALL_SUPPORTED_MODELS.includes(model as any);
}

export interface ReasoningParams {
  effort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
}

export interface ChatParams {
  model: string;
  prompt: string;
  temperature?: number;
  stream?: boolean;
  maxTokens?: number;
  reasoning?: ReasoningParams;
}
