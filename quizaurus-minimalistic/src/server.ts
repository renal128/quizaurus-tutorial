import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

// Create an MCP server
const server = new McpServer({
    name: 'quizaurus-server',
    version: '0.0.1'
});

// Add an addition tool
server.registerTool(
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
server.registerResource(
    'interactive-quiz',
    // resource URI must match `openai/outputTemplate` in the tool definition above
    "ui://widget/interactive-quiz.html", 
    {},
    async (uri) => ({
        contents: [
            {
                uri: uri.href,
                mimeType: "text/html+skybridge",
                // Below is the code that renders the widget in an iframe.
                // It shows the first question, let's choose an answer and tells if the answer is correct.
                text: `
                <div id="hello-world-root">
                    <div style="height: 100px">
                        <button id="refresh-button">Refresh</button>
                        <div id="question-text"></div>
                        <button id="option-1">Option 1</button>
                        <button id="option-2">Option 2</button>
                        <button id="option-3">Option 3</button>
                        <button id="option-4">Option 4</button>
                        <div id="selected-answer"></div>
                    </div>

                    <script type="module">
                        const refreshButton = document.querySelector('#refresh-button');
                        const questionDiv = document.querySelector('#question-text');
                        const optionButtons = document.querySelectorAll('#option-1, #option-2, #option-3, #option-4');
                        const selectedAnswerDiv = document.querySelector('#selected-answer');
                        
                        const selectOption = (event, isCorrect) => {
                            const selectedOption = event.target.textContent
                            selectedAnswerDiv.textContent = selectedOption + ' - ' + isCorrect;
                            window.openai.setWidgetState({
                                selectedAnswer: event.target.textContent
                            })
                        };

                        const initialize = () => {
                            const questions = window.openai.toolOutput?.questions;
                            if (!questions) return;

                            const questionData = questions[0];
                            const correctIndex = questionData.correctIndex;
                            questionDiv.textContent = questionData.question;
                            for (let i = 0; i < optionButtons.length; i++) {
                                optionButtons[i].textContent = questionData.options[i];
                                optionButtons[i].addEventListener('click', (event) => selectOption(event, i == correctIndex))
                            }
                        };
                        
                        refreshButton.addEventListener('click', initialize);

                        initialize();
                    </script>
                </div>
                `
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

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '8000');
app.listen(port, () => {
    console.log(`MCP Server running on http://localhost:${port}/mcp`);
}).on('error', error => {
    console.error('Server error:', error);
    process.exit(1);
});