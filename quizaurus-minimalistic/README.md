# Quizaurus MCP Server

A minimalistic demo MCP (Model Context Protocol) server for the Quizaurus ChatGPT App.

## Quick Start

### Prerequisites

- Node.js v16+ (download from [nodejs.org](https://nodejs.org))

### Install & Run

```bash
npm install
npm start
```

The server runs on `http://localhost:8000/mcp`

## Expose to the Web

Use ngrok to make your local server publicly accessible:

1. Create a free account at [ngrok.com](https://ngrok.com)
2. Install ngrok:
   ```bash
   brew install ngrok          # or download from ngrok.com
   ```
3. Run ngrok:
   ```bash
   ngrok http 8000
   ```

This creates a public URL like `https://xxxx-xx-xxx-xxx-xx.ngrok.io/mcp`

## Adding to ChatGPT

_Instructions coming soon._

## Technologies

- MCP (Model Context Protocol)
- Express.js
- TypeScript
- Zod
