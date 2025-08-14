import OpenAI, { ClientOptions } from 'openai';
import {
  isSupportedModel,
  ALL_SUPPORTED_MODELS,
  type SupportedModel,
} from '../utils/models.js';

export interface ChatRequest {
  prompt: string;
  model: SupportedModel;
  system?: string;
  temperature?: number;
  effort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  searchContextSize?: 'low' | 'medium' | 'high';
  maxTokens?: number;
  maxRetries?: number;
  timeoutMs?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export class ChatGPTClient {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  private createOpenAIClient(request: ChatRequest): OpenAI {
    const options: ClientOptions = {
      apiKey: this.openai.apiKey,
    };

    if (request.maxRetries !== undefined) {
      options.maxRetries = request.maxRetries;
    }

    if (request.timeoutMs !== undefined) {
      options.timeout = request.timeoutMs;
    }

    return new OpenAI(options);
  }

  private validateRequest(request: ChatRequest): void {
    if (!this.openai.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    if (!isSupportedModel(request.model)) {
      throw new Error(
        `Unsupported model "${request.model}". Supported models are: ${ALL_SUPPORTED_MODELS.join(', ')}`
      );
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.validateRequest(request);

    const client = this.createOpenAIClient(request);

    try {
      return await this.callResponsesAPI(request, client, false);
    } catch (error: any) {
      throw new Error(`Failed to call ChatGPT: ${error.message}`);
    }
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    this.validateRequest(request);

    const client = this.createOpenAIClient(request);

    try {
      yield* this.streamResponsesAPI(request, client);
    } catch (error: any) {
      throw new Error(`Failed to call ChatGPT: ${error.message}`);
    }
  }

  private async callResponsesAPI(
    request: ChatRequest,
    client: OpenAI,
    stream: boolean
  ): Promise<ChatResponse> {
    const requestBody: any = {
      model: request.model,
      input: request.prompt,
      stream,
      tools: [
        {
          type: 'web_search',
          search_context_size:
            request.searchContextSize ||
            process.env.SEARCH_CONTEXT_SIZE ||
            'medium',
        },
      ],
      tool_choice: 'auto',
      parallel_tool_calls: true,
    };

    if (request.effort) {
      requestBody.reasoning = { effort: request.effort };
    }
    if (request.verbosity) {
      requestBody.text = { verbosity: request.verbosity };
    }
    if (request.maxTokens) {
      requestBody.max_output_tokens = request.maxTokens;
    }

    const completion = await client.responses.create(requestBody);
    const responseContent = (completion as any).output_text || '';

    return {
      content: responseContent,
      model: request.model,
      usage: (completion as any).usage,
    };
  }

  private async *streamResponsesAPI(
    request: ChatRequest,
    client: OpenAI
  ): AsyncGenerator<StreamChunk> {
    const requestBody: any = {
      model: request.model,
      input: request.prompt,
      stream: true,
    };

    if (request.effort) {
      requestBody.reasoning = { effort: request.effort };
    }
    if (request.verbosity) {
      requestBody.text = { verbosity: request.verbosity };
    }
    if (request.maxTokens) {
      requestBody.max_output_tokens = request.maxTokens;
    }

    const completion = await client.responses.create(requestBody);

    for await (const event of completion as any) {
      if (event.type === 'response.output_text.delta') {
        yield {
          content: event.delta,
          done: false,
        };
      }
    }

    yield {
      content: '',
      done: true,
    };
  }
}
