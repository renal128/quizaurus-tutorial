/**
 * MCP (Model Context Protocol) Server for Pizzaz Widget Demo
 *
 * This server demonstrates how to build an MCP server that:
 * 1. Exposes tools that the AI model can call
 * 2. Serves UI component resources (HTML templates)
 * 3. Returns structured data to hydrate interactive widgets
 * 4. Uses Server-Sent Events (SSE) for real-time communication
 */

import { type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";

// Core MCP SDK imports for creating the server
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// SSE transport for real-time streaming communication with the AI model
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// Zod for runtime schema validation of tool inputs
import { z } from "zod";
import { postPath } from "./server.js";
import path from "node:path";
import { promises as fs } from "node:fs";

/**
 * Session tracking type
 * Each SSE connection gets its own MCP server instance and transport
 */
type McpSessionRecord = {
  server: McpServer; // The MCP server instance for this session
  transport: SSEServerTransport; // The SSE transport managing the connection
};

/**
 * Active sessions map
 * Tracks all currently connected clients by session ID
 */
const mcpSessions = new Map<string, McpSessionRecord>();

const mcpServer = new McpServer({
  name: 'demo-server',
  version: '1.0.0'
},
  {
    capabilities: {
      resources: {}, // Advertise that we support resource operations
      tools: {} // Advertise that we support tool operations
    }
  });


async function getInlineJs(filename: string) {
  const jsPath = path.join("../quizaurus-web/dist", filename);
  let code = await fs.readFile(jsPath, "utf8");

  // prevent accidental </script> termination
  return code.replace(/<\/script/g, "<\\/script");
}

async function getInlineCss(filename: string) {
  const jsPath = path.join("../quizaurus-web/dist", filename);
  let styles = await fs.readFile(jsPath, "utf8");
  return styles;
}

const quizaurusJs = await getInlineJs('QuizaurusApp.js')
const quizaurusCss = await getInlineCss('QuizaurusApp.css')
export const STATIC_DOMAIN = 'https://brenda-unharped-superoratorically.ngrok-free.dev'

// UI resource (quiz runner)
mcpServer.registerResource(
  "quiz-runner",
  "ui://widget/quiz-runner.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/quiz-runner.html",
        mimeType: "text/html+skybridge",
        text: `
<div id="quizaurus-root"></div>
<style>
${quizaurusCss}
</style>
<script type="module">
${quizaurusJs}
</script>
    `.trim()
      },
    ],
  })
);

mcpServer.registerTool(
  "score-quiz-results",
  {
    title: "Prepare quiz results",
    description: "Given raw quiz results, calculate stats to present to the user.",
    inputSchema: {
      correctAnswersCount: z.number().describe("correct answers count"),
      totalQuestionsCount: z.number().describe("total questions count"),
    }
  },
  async (args) => {
    const { correctAnswersCount, totalQuestionsCount } = args;
    const successRate = 1.0 * correctAnswersCount / totalQuestionsCount;

    // TODO localize
    let encouragement = "Keep practicing!";
    if (successRate >= 0.9) encouragement = "Excellent!";
    else if (successRate >= 0.7) encouragement = "Good job!";
    else if (successRate >= 0.5) encouragement = "Not bad!";

    return {
        content: [],
        structuredContent: {
          encouragement,
          successRate,
        }
    };
  }
);

mcpServer.registerTool(
  "start-quiz",
  {
    title: "Make an interactive quiz",
    description: `
Create and render a quiz. 
The tool expects to receive high-quality single-answer questions 
that match the schema in input/structuredContent: 
each item needs { question, options[], correctIndex, explanation }.
Use 5–10 questions unless the user requests a specific 
number of questions (but make sure that it's under 50).
Do not provide any sensitive or personal user information to this tool.
    `.trim(),
    _meta: {
      "openai/outputTemplate": "ui://widget/quiz-runner.html", // <- hook to the resource
    },
    inputSchema: {
      topic: z.string().describe("Quiz topic (e.g., 'US history')."),
      difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
      questions: z.array(
        z.object({
          question: z.string(),
          options: z.array(z.string()).min(2),
          correctIndex: z.number().int(),
          explanation: z.string().optional(),
        })
      ),
    },
  },
  async (args) => {
    console.log(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n${args}`);
    const { topic, difficulty = "medium", questions = [] } = args;

    // Trust but verify indexes
    const safeQuestions = (questions ?? []).filter((q: { question: any; options: string | any[]; correctIndex: number; }) =>
      q && typeof q.question === "string" &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 && q.correctIndex < q.options.length
    );

    return {
      // Optional narration beneath the component
      content: [{ type: "text", text: `Starting a ${difficulty} quiz on ${topic}.` }],
      // What your UI reads via window.openai.toolOutput
      structuredContent: {
        topic,
        difficulty,
        questions: safeQuestions,
      },
      // Private to the component; not visible to the model
      _meta: { "openai/locale": "en" },
    };
  }
);





/**
 * Handles GET /mcp requests to establish SSE connections
 * SSE (Server-Sent Events) allows the server to push real-time updates to clients
 *
 * Flow:
 * 1. Client makes GET request to /mcp
 * 2. Server creates a new MCP server instance for this session
 * 3. Server creates SSE transport and keeps connection open
 * 4. Server can now push messages to client via SSE
 * 5. Client sends requests via POST to /mcp/messages
 */
export async function handleSseRequest(res: ServerResponse) {
  console.log("\n=== NEW SSE CONNECTION ===");
  console.log("Time:", new Date().toISOString());

  res.setHeader("Access-Control-Allow-Origin", "*"); // Enable CORS

  // Create a new MCP server instance for this session

  // Create SSE transport - manages the SSE connection
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId; // Auto-generated unique ID

  console.log("Session ID:", sessionId);

  // Track this session
  // sessions.set(sessionId, { server, transport });
  mcpSessions.set(sessionId, { server: mcpServer, transport });


  // Clean up when client disconnects
  transport.onclose = async () => {
    console.log("\n=== SSE CONNECTION CLOSED ===");
    console.log("Session ID:", sessionId);
    console.log("Time:", new Date().toISOString());
    // sessions.delete(sessionId);
    mcpSessions.delete(sessionId);
    // await server.close();
    // await mcpServer.close();
  };

  // Handle transport errors
  transport.onerror = (error) => {
    console.error("\n=== SSE TRANSPORT ERROR ===");
    console.error("Session ID:", sessionId);
    console.error("Error:", error);
  };

  try {
    // Connect the MCP server to the SSE transport
    // This starts the MCP protocol communication
    // await server.connect(transport);
    await mcpServer.connect(transport);
    console.log("SSE connection established successfully");
  } catch (error) {
    // sessions.delete(sessionId);
    mcpSessions.delete(sessionId);
    console.error("\n=== FAILED TO START SSE SESSION ===");
    console.error("Session ID:", sessionId);
    console.error("Error:", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

/**
 * Handles POST /mcp/messages requests
 * This is how clients send MCP requests to the server
 *
 * Flow:
 * 1. Client POSTs JSON-RPC message to /mcp/messages?sessionId=xxx
 * 2. Server looks up the session by ID
 * 3. Server routes the message to the appropriate MCP server instance
 * 4. Server processes the request (e.g., ListTools, CallTool)
 * 5. Response is sent back via the SSE stream (not the POST response)
 */
export async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  console.log("\n=== POST MESSAGE RECEIVED ===");
  console.log("Time:", new Date().toISOString());

  res.setHeader("Access-Control-Allow-Origin", "*"); // Enable CORS
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  // Extract session ID from query parameter
  const sessionId = url.searchParams.get("sessionId");

  console.log("Session ID:", sessionId);

  if (!sessionId) {
    console.log("ERROR: Missing sessionId");
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  // Look up the session
  // const session = sessions.get(sessionId);
  const session = mcpSessions.get(sessionId);

  if (!session) {
    console.log("ERROR: Unknown session");
    // console.log("Available sessions:", Array.from(sessions.keys()));
    res.writeHead(404).end("Unknown session");
    return;
  }

  // Read the request body to log it
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parsedBody = JSON.parse(body);
      console.log("Request method:", parsedBody.method);
      console.log("Request ID:", parsedBody.id);
      if (parsedBody.params) {
        console.log("Request params:", JSON.stringify(parsedBody.params, null, 2));
      }
    } catch (e) {
      console.log("Request body:", body);
    }
  });

  try {
    // Forward the message to the transport for processing
    // The transport will parse the JSON-RPC message and route it to the server
    await session.transport.handlePostMessage(req, res);
    console.log("Message processed successfully");
  } catch (error) {
    console.error("\n=== FAILED TO PROCESS MESSAGE ===");
    console.error("Session ID:", sessionId);
    console.error("Error:", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}
