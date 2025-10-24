const root = document.querySelector('#quizaurus-root');

// create HTML layout
root.innerHTML = `
    <button id="start-quiz" class="action-button">Start Quiz</button>
    <div id="quiz-container" class="container" hidden>
        <div id="question-text" class="question"></div>
        <div class="options-container">
            <button id="option-1" class="option">Option 1</button>
            <button id="option-2" class="option">Option 2</button>
            <button id="option-3" class="option">Option 3</button>
            <button id="option-4" class="option">Option 4</button>
        </div>
        <div id="selected-answer" class="selected-answer"></div>
        <div class="bottom-buttons-container">
            <button id="review-results" class="action-button" disabled>Review Results</button>
            <button id="next-question" class="action-button" disabled>Next Question</button>
        </div>
    </div>`;

const startQuizButton = document.querySelector('#start-quiz');
const questionDiv = document.querySelector('#question-text');
const optionButtons = document.querySelectorAll('#option-1, #option-2, #option-3, #option-4');
const selectedAnswerDiv = document.querySelector('#selected-answer');
const nextQuestionButton = document.querySelector('#next-question');
const reviewResultsButton = document.querySelector('#review-results');
const quizContainer = document.querySelector('#quiz-container');

// try to initialize for widgetState, in case the chat page gets reloaded
const selectedAnswers = window.openai.widgetState?.selectedAnswers ?? {};
let currentQuestionIndex = window.openai.widgetState?.currentQuestionIndex ?? 0;

// update UI based on the current state
function refreshUI() {
    // Read questions from window.openai.toolOutput - this is the output of the tool defined in server.ts
    const questions = window.openai.toolOutput?.questions;
    // Initially the widget will be rendered with empty toolOutput. 
    // It will be populated when ChatGPT receives toolOutput from our tool.
    if (!questions) {
        console.log("Questions have not yet been provided. Try again in a few sec.")
        return; 
    }
    
    startQuizButton.hidden = true;
    quizContainer.hidden = false;
    
    const questionData = questions[currentQuestionIndex];
    const currentQuestionAnswered = currentQuestionIndex in selectedAnswers;
    
    questionDiv.textContent = questionData.question;
    optionButtons.forEach((b, i) => { b.textContent = questionData.options[i] });

    if (currentQuestionAnswered) {
        const isLastQuestion = currentQuestionIndex === questions.length - 1;
        nextQuestionButton.disabled = isLastQuestion;
        reviewResultsButton.disabled = !isLastQuestion;
        optionButtons.forEach((b) => { b.disabled = true; });
        const isCorrect = questionData.options[questionData.correctIndex] === selectedAnswers[currentQuestionIndex]
        selectedAnswerDiv.textContent = `Your answer: ${selectedAnswers[currentQuestionIndex]} [${isCorrect?'CORRECT':'WRONG'}]`;
    } else {
        nextQuestionButton.disabled = true;
        optionButtons.forEach((b) => { b.disabled = false; });
        selectedAnswerDiv.textContent = '[Choose an answer]';
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
    window.openai.sendFollowUpMessage({ prompt: `The user has completed a quiz. 
        Looking at the questions from toolOutput and user's responses in widgetState, give the user feedback for each question. 
        Don't mention any technical details about response indices, toolOutput and widgetState in the response.
        Don't invoke the app.`});
    reviewResultsButton.disabled = true;
};

startQuizButton.onclick = refreshUI;
refreshUI();