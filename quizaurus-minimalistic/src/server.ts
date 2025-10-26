import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import path from 'path';
import cors from 'cors';

// Create an MCP server
const mcpServer = new McpServer({
    name: 'quizaurus-server',
    version: '0.0.1'
});

// Add the tool that receives and validates questions, and starts a quiz
mcpServer.registerTool(
    'render-quiz',
    {
        title: 'Render Quiz',
        description: `
            Create and render a quiz. 
            The tool expects to receive high-quality single-answer questions 
            that match the schema in input/structuredContent: 
            each item needs { question, options[], correctIndex, explanation }.
            Use 5–10 questions unless the user requests a specific 
            number of questions (but make sure that it's under 50).
            Do not provide any sensitive or personal user information to this tool.`,
        _meta: {
            "openai/outputTemplate": "ui://widget/interactive-quiz.html", // <- hook to the resource
        },
        inputSchema: {
            topic: z.string().describe("Quiz topic (e.g., 'US history')."),
            difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
            questions: z.array(
                z.object({
                    question: z.string(),
                    options: z.array(z.string()).min(4).max(4),
                    correctIndex: z.number().int(),
                    explanation: z.string().optional(),
                })
            ),
        },
    },
    async (toolInput) => {
        const { topic, difficulty, questions } = toolInput;

        // Here you can run any server-side logic to process the input from ChatGPT and 
        // prepare toolOutput that would be fed into the frontend widget code.
        // E.g. you can receive search filters and return matching items.

        // We don't need any server-side logic in this example,
        // so we will just do some basic validation.
        const validQuestions = (questions ?? []).filter((q) => {
            const isValid = q && typeof q.question === "string" &&
                Array.isArray(q.options) && q.options.length == 4 &&
                Number.isInteger(q.correctIndex) &&
                q.correctIndex >= 0 && q.correctIndex < q.options.length
            if (!isValid) {
                console.error("Invalid question:", q);
            }
            return isValid;
        });

        return {
            // Optional narration beneath the component
            content: [{ type: "text", text: `Starting a ${difficulty} quiz on ${topic}.` }],
            // `structuredContent` will be available as `toolOutput` in the frontend widget code
            structuredContent: {
                topic,
                difficulty,
                questions: validQuestions,
            },
            // Private to the component; not visible to the model
            _meta: { "openai/locale": "en" },
        };
    }
);

// Add a resource that contains the frontend code for rendering the widget
mcpServer.registerResource(
    'interactive-quiz',
    "ui://widget/interactive-quiz.html", // must match `openai/outputTemplate` in the tool definition above
    {},
    async (uri) => ({
        contents: [
            {
                uri: uri.href,
                mimeType: "text/html+skybridge",
                // Below is the HTML code for the widget. 
                // It creates a root div and loads the script from src/dist/script.js, which finds
                // the root div by its ID and renders the widget components in it.
                text: `<div id="quiz-app-root">
                           <script type="module" src="http://localhost:8000/assets/script.js"></script>
                       </div>`
            }
        ]
    })
);

// Set up Express and HTTP transport
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on('close', () => {
        transport.close();
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

// Serve static assets.
// dist/script.js will be available at /assets/script.js
const filename = fileURLToPath(import.meta.url);
const assetsPath = path.join(dirname(filename), 'dist');
app.use('/assets', cors(), express.static(assetsPath));

const port = parseInt(process.env.PORT || '8000');
app.listen(port, () => {
    console.log(`MCP Server running on http://localhost:${port}/mcp`);
}).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
});