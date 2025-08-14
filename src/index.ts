#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ALL_SUPPORTED_MODELS, type SupportedModel } from './utils/models.js';
import { ChatGPTClient, type ChatRequest } from './core/chatgpt-client.js';

const server = new Server(
  {
    name: 'chatgpt-websearch',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const client = new ChatGPTClient();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ask_chatgpt',
        description:
          'Ask ChatGPT a question and get a response. Supports both regular models (with temperature) and reasoning models (with effort/verbosity).',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt to send to ChatGPT',
            },
            model: {
              type: 'string',
              // 注意書きが無いとClaude Codeは古いモデルを使おうとする。アホ。
              description: `The model to use (default: from OPENAI_DEFAULT_MODEL env var or gpt-5). Unless specified by the user, you should not set this model parameter. Supported models: ${ALL_SUPPORTED_MODELS.join(', ')}`,
              enum: [...ALL_SUPPORTED_MODELS],
              default: process.env.OPENAI_DEFAULT_MODEL || 'gpt-5',
            },
            system: {
              type: 'string',
              description:
                'System prompt to set context and behavior for the AI',
            },
            temperature: {
              type: 'number',
              description:
                'Temperature for response generation (0-2). Not available for reasoning models (gpt-5, o1, o3, etc.)',
              default: 0.7,
            },
            effort: {
              type: 'string',
              description:
                'Reasoning effort level: minimal, low, medium, high (default: from REASONING_EFFORT env var). For reasoning models only.',
              enum: ['minimal', 'low', 'medium', 'high'],
              default: process.env.REASONING_EFFORT || undefined,
            },
            verbosity: {
              type: 'string',
              description:
                'Output verbosity level: low, medium, high (default: from VERBOSITY env var). For reasoning models only.',
              enum: ['low', 'medium', 'high'],
              default: process.env.VERBOSITY || undefined,
            },
            searchContextSize: {
              type: 'string',
              description:
                'Search context size: low, medium, high (default: from SEARCH_CONTEXT_SIZE env var). For reasoning models only.',
              enum: ['low', 'medium', 'high'],
              default: process.env.SEARCH_CONTEXT_SIZE || undefined,
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum number of output tokens',
            },
            maxRetries: {
              type: 'number',
              description:
                'Maximum number of API retry attempts (default: from OPENAI_MAX_RETRIES env var or 3)',
              default: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
            },
            timeoutMs: {
              type: 'number',
              description:
                'Request timeout in milliseconds. Auto-adjusts based on effort level: high=300s, medium=120s, low/minimal=60s. Can be overridden with OPENAI_API_TIMEOUT env var.',
            },
            useStreaming: {
              type: 'boolean',
              description:
                'Force streaming mode to prevent timeouts during long reasoning tasks. Defaults to auto (true for medium/high effort reasoning models).',
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'ask_chatgpt') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const {
    prompt,
    model = process.env.OPENAI_DEFAULT_MODEL || 'gpt-5',
    system,
    temperature = 0.7,
    effort = (process.env.REASONING_EFFORT as
      | 'minimal'
      | 'low'
      | 'medium'
      | 'high') || undefined,
    verbosity = (process.env.VERBOSITY as 'low' | 'medium' | 'high') ||
      undefined,
    searchContextSize = (process.env.SEARCH_CONTEXT_SIZE as
      | 'low'
      | 'medium'
      | 'high') || undefined,
    maxTokens,
    maxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
    timeoutMs: userTimeoutMs,
    useStreaming,
  } = request.params.arguments as {
    prompt: string;
    model?: string;
    system?: string;
    temperature?: number;
    effort?: 'minimal' | 'low' | 'medium' | 'high';
    verbosity?: 'low' | 'medium' | 'high';
    searchContextSize?: 'low' | 'medium' | 'high';
    maxTokens?: number;
    maxRetries?: number;
    timeoutMs?: number;
    useStreaming?: boolean;
  };

  // Dynamic timeout based on effort level for reasoning models
  let timeoutMs = userTimeoutMs;
  if (timeoutMs === undefined) {
    if (effort === 'high') {
      // 5 minutes for high effort reasoning
      timeoutMs = parseInt(process.env.OPENAI_API_TIMEOUT || '300000');
    } else if (effort === 'medium') {
      // 2 minutes for medium effort reasoning
      timeoutMs = parseInt(process.env.OPENAI_API_TIMEOUT || '120000');
    } else {
      // Default 1 minute for low/minimal effort or regular models
      timeoutMs = parseInt(process.env.OPENAI_API_TIMEOUT || '60000');
    }
  }

  // Use streaming for reasoning models with medium/high effort to prevent timeouts
  // Can be overridden by useStreaming parameter
  const shouldUseStreaming =
    useStreaming !== undefined
      ? useStreaming
      : effort === 'medium' || effort === 'high';

  const chatRequest: ChatRequest = {
    prompt,
    model: model as SupportedModel,
    system,
    temperature,
    effort,
    verbosity,
    searchContextSize,
    maxTokens,
    maxRetries,
    timeoutMs,
    stream: shouldUseStreaming, // Use streaming for long-running reasoning tasks
  };

  try {
    if (shouldUseStreaming) {
      // Use streaming to prevent timeout, but accumulate response for MCP
      console.error('Starting streaming request for reasoning model...');
      let accumulatedContent = '';
      let chunkCount = 0;

      for await (const chunk of client.chatStream(chatRequest)) {
        if (!chunk.done && chunk.content) {
          accumulatedContent += chunk.content;
          chunkCount++;

          // Show progress to prevent timeout perception
          if (chunkCount % 10 === 0) {
            console.error(
              `Received ${chunkCount} chunks, accumulated ${accumulatedContent.length} characters...`
            );
          }
        }

        if (chunk.done) {
          console.error(
            `Streaming completed. Total chunks: ${chunkCount}, content length: ${accumulatedContent.length}`
          );
          break;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: accumulatedContent,
          },
        ],
      };
    } else {
      // Use regular non-streaming mode
      const response = await client.chat(chatRequest);

      return {
        content: [
          {
            type: 'text',
            text: response.content,
          },
        ],
      };
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);

    // Provide helpful timeout message for reasoning models
    if (error.message?.includes('timeout') && effort === 'high') {
      throw new Error(
        `Request timed out after ${timeoutMs}ms. Reasoning models with high effort can take several minutes. ` +
          `Consider increasing OPENAI_API_TIMEOUT environment variable or setting a higher timeoutMs value. ` +
          `Current timeout: ${timeoutMs}ms`
      );
    }

    throw new Error(`Failed to call ChatGPT: ${error.message}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ChatGPT WebSearch MCP server running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
