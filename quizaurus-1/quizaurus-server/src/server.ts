import { URL, fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { handlePostMessage, handleSseRequest } from "./mcp_server.js";
import express from 'express';
import path from 'path';

/**
 * HTTP endpoint paths for the MCP SSE transport
 * SSE uses two endpoints:
 * 1. GET /mcp - Opens the SSE stream (server -> client messages)
 * 2. POST /mcp/messages - Receives client messages (client -> server)
 */
export const ssePath = "/mcp";
export const postPath = "/mcp/messages";

/**
 * Server configuration
 * Read port from environment variable or default to 8000
 */
const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const app = express()

app.get('/', (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send('Hello World!')
})

function optionsHandler(req: express.Request, res: express.Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, ngrok-skip-browser-warning");
  res.sendStatus(204);
}

async function getSseHandler(req: express.Request, res: express.Response) {
    console.log("[HTTP] Routing to GET SSE handler");
    await handleSseRequest(res);
}

async function postMessageHandler(req: express.Request, res: express.Response) {
  console.log("[HTTP] Routing to POST message handler");
  await handlePostMessage(req, res, new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`));
}

app.options('/', optionsHandler);
app.options(ssePath, optionsHandler);
app.options(postPath, optionsHandler);
app.get(ssePath, getSseHandler);
app.post(postPath, postMessageHandler);

// Serve static assets from your widget's build dir (e.g., after pnpm run build)
// Current file: pizzaz_server_node/src/server.ts
// Assets location: openai-apps-sdk-examples/assets/
// Need to go up 2 levels: ../.. from src/ to reach project root
const filename = fileURLToPath(import.meta.url);
const assetsPath = path.join(dirname(filename), '../../assets');
console.log('📁 Serving static assets from:', assetsPath);
app.use('/assets', express.static(assetsPath));

app.listen(port, () => {
  console.log(`Express app listening on port ${port}`)
})












// /**
//  * Main HTTP server
//  * Routes requests to the appropriate handler based on path and method
//  *
//  * Endpoints:
//  * - OPTIONS /mcp, /mcp/messages: CORS preflight
//  * - GET /mcp: Establish SSE connection
//  * - POST /mcp/messages: Send MCP request
//  */
// const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
//   console.log(`\n[HTTP] ${req.method} ${req.url}`);
//   console.log(`[HTTP] User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
//   console.log(`[HTTP] Origin: ${req.headers.origin || 'none'}`);

//   if (!req.url) {
//     console.log("[HTTP] ERROR: Missing URL");
//     res.writeHead(400).end("Missing URL");
//     return;
//   }

//   const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

//   // Handle CORS preflight requests
//   if (req.method === "OPTIONS" && (url.pathname === ssePath || url.pathname === postPath)) {
//     console.log("[HTTP] Handling CORS preflight");
//     res.writeHead(204, {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers": "content-type"
//     });
//     res.end();
//     return;
//   }

//   // GET /mcp - Establish SSE connection
//   if (req.method === "GET" && url.pathname === ssePath) {
//     console.log("[HTTP] Routing to SSE handler");
//     await handleSseRequest(res);
//     return;
//   }

//   // POST /mcp/messages - Handle MCP requests
//   if (req.method === "POST" && url.pathname === postPath) {
//     console.log("[HTTP] Routing to POST message handler");
//     await handlePostMessage(req, res, url);
//     return;
//   }

//   console.log("[HTTP] ERROR: 404 Not Found");
//   res.writeHead(404).end("Not Found");
// });

// /**
//  * Handle HTTP client errors gracefully
//  * Prevents the server from crashing on malformed requests
//  */
// httpServer.on("clientError", (err: Error, socket) => {
//   console.error("HTTP client error", err);
//   socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
// });

// /**
//  * Start the HTTP server
//  * Once running, clients can connect and use the MCP protocol
//  */
// httpServer.listen(port, () => {
//   console.log("\n" + "=".repeat(70));
//   console.log("🍕 Pizzaz MCP Server Started");
//   console.log("=".repeat(70));
//   console.log(`\nServer URL: http://localhost:${port}`);
//   console.log(`\nEndpoints:`);
//   console.log(`  GET  ${ssePath}           - Establish SSE connection`);
//   console.log(`  POST ${postPath}?sessionId=xxx - Send MCP requests`);
//   console.log(`\nWaiting for connections...`);
//   console.log("=".repeat(70) + "\n");
// });
