# Quizaurus MCP Server

A minimalistic demo MCP server for the Quizaurus ChatGPT App using React.

## File structure

- `quizaurus-react/`
   
   - `server/` - code for the MCP server
   
      - `src/server.ts` - MCP server

      - `package.json` - project dependencies and build scripts
      - `tsconfig.json` - TypeScript config

   - `web/` - code for the React app (frontend widget)
   
      - `src/`

         - `openAiHooks.ts` - React hooks copied from OpenAI documentation: https://developers.openai.com/apps-sdk/build/custom-ux
         - `openAiTypes.ts` - types copied from OpenAI documentation: https://developers.openai.com/apps-sdk/build/custom-ux
         - `QuestionScreen.tsx` - React component for showing a question
         - `QuizaurusApp.tsx` - React App
         - `ResultsScreen.tsx` - React component for showing quiz results
         - `test.html` - HTML page with mocked data for quick local testing
         - `theme.css` - styles


      - `dist/` - compiled assets for frontend (including them here for convenience, you can recompile them from sources in `web/src`)

            - `QuizaurusWidget.js` - compiled JavaScript code for the widget
            - `QuizaurusWidget.css` - compiled styles for the widget

      - `package.json` - project dependencies and build scripts

## Quick Start

### Prerequisites

- Node.js v16+ (download from [nodejs.org](https://nodejs.org))
- Standard paid ChatGPT subscription (to enable Developer mode)

### Install & Run

Open a terminal, navigate to `quizaurus-react/server`, and run:

```bash
npm install
npm start
```

The server will run on `http://localhost:8000/mcp`

### Expose to the Web

Use ngrok to make your local server publicly accessible:
(do it in a separate terminal, the server started above must keep running)

1. Create a free account at [ngrok.com](https://ngrok.com)
2. Install ngrok:
   ```bash
   brew install ngrok          # or download from ngrok.com
   ```
3. Connect `ngrok` on your machine to your ngrok account by configuring it with your auth token: https://ngrok.com/docs/getting-started#2-connect-your-account
4. Run ngrok:
   ```bash
   ngrok http 8000
   ```

This opens a tunnel making your local server publicly accessible at a public URL like `https://xxxx-xx-xxx-xxx-xx.ngrok.io/mcp` (see it in the output)

### Adding to ChatGPT

1. Go to [ChatGPT website => Settings => Apps & Connectors](https://chatgpt.com/#settings/Connectors)
2. Scroll down, click on "Advanced Settings" and enable the "Developer mode" toggle. (if you don't see it, make sure you have a paid subscription)
3. Go back and click "Create" on top
4. Fill out the form: using your `https://xxxx-xx-xxx-xxx-xx.ngrok.io/mcp` link from ngrok (don't forget the `/mcp` part), and select "No authentication".
5. Prompt ChatGPT with something like `@Quizaurus <or whatever you named the app during creation> make an interactive quiz about <X>`

## Technologies

- Express.js
- Typescript MCP SDK
- Zod (for MCP schema)
- React
