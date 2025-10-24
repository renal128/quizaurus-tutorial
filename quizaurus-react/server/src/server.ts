import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import path from "node:path";
import { promises as fs } from "node:fs";

// Create an MCP server
const mcpServer = new McpServer({
    name: 'quizaurus-server',
    version: '1.0.0'
});

// Filter out and log invalid questions if any
function validatedQuestions(questions: any[]) {
    return questions.filter((item) => {
        const isValid = item && typeof item.question === "string" &&
            Array.isArray(item.options) && item.options.length == 4 &&
            Number.isInteger(item.correctIndex) &&
            item.correctIndex >= 0 && item.correctIndex < item.options.length
        if (!isValid) {
            console.error("Invalid question:", item);
        }
        return isValid;
    });
}

// Add the MCP tool that receives and validates questions, and starts a quiz
mcpServer.registerTool(
    'render-quiz',
    {
        title: 'Render Quiz',
        description: `
            Use this when the user requests an interactive quiz.
            The tool expects to receive high-quality single-answer questions 
            that match the schema in input/structuredContent: 
            each item needs { question, options[], correctIndex, explanation }.
            Use 5–10 questions unless the user requests a specific 
            number of questions.
            The questions will be shown to the user by the tool as an interactive quiz.
            Do not print the questions or answers in chat when you use this tool.
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
            ).min(1).max(40),
        },
    },
    async (toolInput) => {
        const { topic, difficulty, questions } = toolInput;

        // Here you can run any server-side logic to process the input from ChatGPT and 
        // prepare toolOutput that would be fed into the frontend widget code.
        // E.g. you can receive search filters and return matching items.

        // We don't need any server-side logic in this example,
        // so we will just do some basic validation.
        const validQuestions = validatedQuestions(questions);

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

// Add an MCP resource that contains the frontend code for rendering the widget
mcpServer.registerResource(
    'interactive-quiz',
    // resource URI must match `openai/outputTemplate` in the tool definition above
    "ui://widget/interactive-quiz.html", 
    {},
    async (uri) => {
        // copy frontend script and css
        const quizaurusJs = await fs.readFile("../web/dist/QuizaurusWidget.js", "utf8");
        const quizaurusCss = await fs.readFile("../web/dist/QuizaurusWidget.css", "utf8");
        // Here we inject CSS and JS files that we read from server's filesystem.
        // The JS contains React code that will find the div by id ("quizaurus-root") and
        // will use it as a root of the React app.
        //
        // Note: For production, you can host CSS/JS on a CDN instead of inlining.
        // Reference them like: <link rel="stylesheet" href="https://cdn.example.com/style.css">
        // and: <script src="https://cdn.example.com/app.js"></script>
        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: "text/html+skybridge",
                    text: `
                        <div id="quizaurus-root"></div>
                        <style>
                            ${quizaurusCss}
                        </style>
                        <script type="module">
                            ${quizaurusJs}
                        </script>
                    `
                }
            ]
        }
    }
);

// This is another tool that will be invoked after the user answers the last question.
// It will calculate the % of correct answers and provide an encouraging message.
// (yes, this could be done on the client-side, we're doing it on the server just
// to demo the openai.callTool() functionality)
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

// Set up Express and HTTP transport
const expressApp = express();
expressApp.use(express.json());

expressApp.post('/mcp', async (req, res) => {
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

const port = parseInt(process.env.PORT || '8000');
expressApp.listen(port, () => {
    console.log(`MCP Server running on http://localhost:${port}/mcp`);
}).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
});