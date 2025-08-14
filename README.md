# ChatGPT WebSearch MCP

A local MCP stdio server that provides access to the OpenAI (ChatGPT) API for Claude Code and other MCP clients. Supports models with web search capabilities.

---

## Usage

### Claude Code

```sh
$ claude mcp add chatgpt-websearch \
	-s user \  # If you omit this line, it will be installed in the project scope
	-e OPENAI_API_KEY=your-api-key \
	-- npx @nekobato/chatgpt-websearch-mcp
```

### Or configure in settings

```jsonc
{
  "mcpServers": {
    "chatgpt-websearch": {
      "command": "npx",
      "args": ["@nekobato/chatgpt-websearch-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-api-key",
        ...
      },
    },
  },
}
```

### Environment Variables

The following environment variables can be used to set default values:

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `OPENAI_DEFAULT_MODEL` (optional): Default model to use (default: gpt-5)
- `REASONING_EFFORT` (optional): Default reasoning effort level for reasoning models (minimal|low|medium|high)
- `SEARCH_CONTEXT_SIZE` (optional): Default verbosity level (low|medium|high)
- `OPENAI_MAX_RETRIES` (optional): Default maximum retry attempts (default: 3)
- `OPENAI_API_TIMEOUT` (optional): Default API timeout in milliseconds. If not set, auto-adjusts based on effort level:
  - `minimal/low`: 60000 (1 minute)
  - `medium`: 120000 (2 minutes)
  - `high`: 300000 (5 minutes)

## API

### MCP Tools

- `ask_chatgpt`: Send a prompt to ChatGPT and receive a response
  - `prompt` (required): The prompt to send
  - `model` (optional): The model to use (default: from OPENAI_DEFAULT_MODEL env var or gpt-5)
  - `system` (optional): System prompt to set context and behavior
  - `temperature` (optional): Temperature for response generation (0-2, default: 0.7) - Not available for reasoning models
  - `effort` (optional): Reasoning effort level (minimal|low|medium|high, default: from REASONING_EFFORT env var) - For reasoning models only
  - `verbosity` (optional): Output verbosity (low|medium|high, default: from SEARCH_CONTEXT_SIZE env var) - For reasoning models only
  - `maxTokens` (optional): Maximum output tokens
  - `maxRetries` (optional): Maximum API retry attempts (default: from OPENAI_MAX_RETRIES env var or 3)
  - `timeoutMs` (optional): Request timeout in milliseconds. Auto-adjusts based on effort level (high=300s, medium=120s, low/minimal=60s)
  - `useStreaming` (optional): Force streaming mode to prevent timeouts. Auto-enabled for medium/high effort reasoning models

## Development

### Requirements

- Node.js 22+
- An OpenAI API key in `OPENAI_API_KEY`

### Commands

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

## License

MIT License