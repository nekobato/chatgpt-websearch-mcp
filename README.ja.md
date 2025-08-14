# ChatGPT WebSearch MCP

Claude Codeやその他のMCPクライアント向けに、OpenAI (ChatGPT) APIへのアクセスを提供するローカルMCP stdioサーバーです。Web検索が有効なモデルに対応しています。

---

## 使用方法

### Claude Code

```sh
$ claude mcp add chatgpt-websearch \
	-s user \  # この行を省略すると、プロジェクトスコープでインストールされます
	-e OPENAI_API_KEY=your-api-key \
	-- npx @nekobato/chatgpt-websearch-mcp
```

### またはconfigでの設定

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

### 環境変数

以下の環境変数を使用してデフォルト値を設定できます：

- `OPENAI_API_KEY` (必須): OpenAI APIキー
- `OPENAI_DEFAULT_MODEL` (オプション): 使用するデフォルトモデル（デフォルト: gpt-5）
- `REASONING_EFFORT` (オプション): 推論モデルのデフォルト推論effortレベル（minimal|low|medium|high）
- `SEARCH_CONTEXT_SIZE` (オプション): デフォルトの詳細度レベル（low|medium|high）
- `OPENAI_MAX_RETRIES` (オプション): デフォルトの最大リトライ回数（デフォルト: 3）
- `OPENAI_API_TIMEOUT` (オプション): デフォルトのAPIタイムアウト（ミリ秒）。設定されていない場合、effortレベルに基づいて自動調整：
  - `minimal/low`: 60000（1分）
  - `medium`: 120000（2分）
  - `high`: 300000（5分）

## API

### MCPツール

- `ask_chatgpt`: ChatGPTにプロンプトを送信してレスポンスを受信
  - `prompt` (必須): 送信するプロンプト
  - `model` (オプション): 使用するモデル（デフォルト: OPENAI_DEFAULT_MODEL環境変数またはgpt-5）
  - `system` (オプション): コンテキストと動作を設定するシステムプロンプト
  - `temperature` (オプション): レスポンス生成の温度（0-2、デフォルト: 0.7）- 推論モデルでは利用不可
  - `effort` (オプション): 推論effortレベル（minimal|low|medium|high、デフォルト: REASONING_EFFORT環境変数）- 推論モデル専用
  - `verbosity` (オプション): 出力の詳細度（low|medium|high、デフォルト: SEARCH_CONTEXT_SIZE環境変数）- 推論モデル専用
  - `maxTokens` (オプション): 最大出力トークン数
  - `maxRetries` (オプション): 最大APIリトライ回数（デフォルト: OPENAI_MAX_RETRIES環境変数または3）
  - `timeoutMs` (オプション): リクエストタイムアウト（ミリ秒）。effortレベルに基づいて自動調整（high=300秒、medium=120秒、low/minimal=60秒）
  - `useStreaming` (オプション): タイムアウトを防ぐためにストリーミングモードを強制。medium/high effort推論モデルでは自動有効化

## 開発

### 要件

- Node.js 22+
- `OPENAI_API_KEY`にOpenAI APIキー

### コマンド

```bash
# 依存関係のインストール
pnpm install

# 開発モードで実行
pnpm dev

# プロダクション用にビルド
pnpm build

# テストを実行
pnpm test

# コードをリント
pnpm lint

# コードをフォーマット
pnpm format
```

## ライセンス

MIT License
