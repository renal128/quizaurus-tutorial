const root = document.querySelector('#quiz-app-root');

// Create HTML layout
root.innerHTML = `
    <div style="height: 200px; background-color: #aaaaaa; padding: 8px;">
        <button id="start-quiz">Start Quiz</button>
        <div id="question-text"></div>
        <button id="option-1" style="margin: 4px;" hidden="false">Option 1</button>
        <button id="option-2" style="margin: 4px;" hidden="false">Option 2</button>
        <button id="option-3" style="margin: 4px;" hidden="false">Option 3</button>
        <button id="option-4" style="margin: 4px;" hidden="false">Option 4</button>
        <div id="selected-answer"></div>
        <button id="next-question" style="margin: 4px;" disabled="true" hidden="true">Next Question</button>
        <button id="review-results" style="margin: 4px;" hidden="true" disabled="true">Review Results</button>
    </div>`;

const startQuizButton = document.querySelector('#start-quiz');
const questionDiv = document.querySelector('#question-text');
const optionButtons = document.querySelectorAll('#option-1, #option-2, #option-3, #option-4');
const selectedAnswerDiv = document.querySelector('#selected-answer');
const nextQuestionButton = document.querySelector('#next-question');
const reviewResultsButton = document.querySelector('#review-results');

// try to initialize for widgetState, in case the chat page gets reloaded
const selectedAnswers = window.openai.widgetState?.selectedAnswers ?? {};
let currentQuestionIndex = window.openai.widgetState?.currentQuestionIndex ?? 0;

// update UI based on the current state
function refreshUI() {
// const refreshUI = () => {
    // Read questions from window.openai.toolOutput - this is the output of the tool defined in server.ts
    const questions = window.openai.toolOutput?.questions;
    // Initially the widget will be rendered with empty toolOutput. 
    // It will be populated when ChatGPT receives toolOutput from our tool.
    if (!questions) return; 
    
    startQuizButton.hidden = true;
    reviewResultsButton.hidden = false;
    nextQuestionButton.hidden = false;
    optionButtons.forEach((b) => { b.hidden = false; });
    
    const questionData = questions[currentQuestionIndex];
    const isAnswerSelected = currentQuestionIndex === Object.keys(selectedAnswers).length - 1;
    
    questionDiv.textContent = questionData.question;
    optionButtons.forEach((b, i) => { b.textContent = questionData.options[i] });

    if (isAnswerSelected) {
        nextQuestionButton.disabled = currentQuestionIndex === questions.length - 1;
        reviewResultsButton.disabled = currentQuestionIndex !== questions.length - 1;
        optionButtons.forEach((b) => { b.disabled = isAnswerSelected; });
        const isCorrect = questionData.options[questionData.correctIndex] == selectedAnswers[currentQuestionIndex]
        selectedAnswerDiv.textContent = `Your answer: ${selectedAnswers[currentQuestionIndex]} [${isCorrect?'CORRECT':'WRONG'}]`;
    } else {
        nextQuestionButton.disabled = true;
        optionButtons.forEach((b) => { b.disabled = isAnswerSelected; });
        selectedAnswerDiv.textContent = 'Choose an answer';
    }
};

optionButtons.forEach((b) => {
    b.onclick = (event) => {
        const selectedOption = event.target.textContent
        selectedAnswers[currentQuestionIndex] = selectedOption;
        // save and expose selected answers to ChatGPT
        window.openai.setWidgetState({ selectedAnswers, currentQuestionIndex });
        refreshUI();
    };
});

nextQuestionButton.onclick = () => { 
    currentQuestionIndex += 1;
    // save and expose selected answers to ChatGPT
    window.openai.setWidgetState({ selectedAnswers, currentQuestionIndex });
    refreshUI();
};

reviewResultsButton.onclick = () => { 
    // send a prompt to ChatGPT, it will respond in the chat
    window.openai.sendFollowUpMessage({ prompt: "Review my answers and explain mistakes" });
    reviewResultsButton.disabled = true;
};

startQuizButton.onclick = refreshUI;
refreshUI();