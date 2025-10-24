import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useToolOutput } from "./openAiHooks";
import { QuestionScreen } from "./QuestionScreen";
import { ResultsScreen } from "./ResultsScreen";

export type QuizState = "question" | "feedback" | "results";

export interface Question {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

interface QuizData {
    topic: string;
    difficulty: string;
    questions: Question[];
}

function App() {
    const toolOutput = useToolOutput() as QuizData | null;

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
    const [quizState, setQuizState] = useState<QuizState>("question");
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [reviewClicked, setReviewClicked] = useState(false);
    const [moreQuestionsClicked, setMoreQuestionsClicked] = useState(false);
    const [encouragement, setEncouragement] = useState<string | null>(null);
    const [successRate, setSuccessRate] = useState<number | null>(null);

    if (!toolOutput) {
        return (
            <div className="quiz-container">
                <div className="quiz-card quiz-card--loading">
                    <div className="quiz-loading">
                        <div className="quiz-loading__spinner"></div>
                        <p className="quiz-loading__text">Generating your quiz...</p>
                    </div>
                </div>
            </div>
        );
    }

    const { questions, topic, difficulty } = toolOutput;
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
    const correctAnswersCount = userAnswers.filter(
        (answer, idx) => answer === questions[idx].correctIndex
    ).length;
    const mistakesCount = userAnswers.length - correctAnswersCount;

    const handleSubmitAnswer = async (index: number) => {
        if (quizState === "question") {
            setSelectedAnswerIndex(index);
            setUserAnswers([...userAnswers, index]);
            setQuizState("feedback");

            // Call setWidgetState to make user's answers visible to ChatGPT
            await window.openai.setWidgetState({
                userAnswers: [...userAnswers, index]
            });
        }
    };

    const handleNextQuestion = async () => {
        if (isLastQuestion) {
            setQuizState("results");
            const toolResponse = await window.openai.callTool(
                "score-quiz-results",
                {
                    correctAnswersCount,
                    totalQuestionsCount: totalQuestions,
                }
            ) as { structuredContent: { encouragement: string, successRate: number } };
            setEncouragement(toolResponse.structuredContent.encouragement);
            setSuccessRate(toolResponse.structuredContent.successRate);
        } else {
            setSelectedAnswerIndex(null);
            setQuizState("question");
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleStartOver = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswerIndex(null);
        setQuizState("question");
        setUserAnswers([]);
        setReviewClicked(false);
        setMoreQuestionsClicked(false);
        setEncouragement(null);
        setSuccessRate(null);
    };

    const handleReviewResults = async () => {
        setReviewClicked(true);

        const results_json = []
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i]
            results_json.push({
                question: question.question,
                correctOption: question.options[question.correctIndex],
                selectedOption: question.options[userAnswers[i]]
            })
        }
        await window.openai.sendFollowUpMessage({
            prompt: `
                The user has completed a quiz. Below is a JSON object containing the sequence of questions. 
                For each question is has the question itself, the correct answer and the user's answer.
                Looking at that object, give the user feedback for each question. 
                If the user's answer matches the correct answer, keep it minimalistic and concise.
                If the user's answer doesn't match the correct answer, provide a short explanation, including
                some information that helps understand and memorize the answer.
        
                Don't mention any technical details about response indices, toolOutput and widgetState in the response.
                
                ${JSON.stringify(results_json)}
            `
        });
    };

    const handleMoreQuestions = async () => {
        setMoreQuestionsClicked(true);
        await window.openai.sendFollowUpMessage({
            prompt: "Generate another quiz with new questions on the same topic."
        });
    };

    if (quizState === "results") {
        return (
            <ResultsScreen
                correctAnswersCount={correctAnswersCount}
                totalQuestions={totalQuestions}
                mistakesCount={mistakesCount}
                onStartOver={handleStartOver}
                onReviewResults={handleReviewResults}
                onMoreQuestions={handleMoreQuestions}
                encouragement={encouragement}
                successRate={successRate}
                reviewClicked={reviewClicked}
                moreQuestionsClicked={moreQuestionsClicked}
            />
        );
    }

    return (
        <QuestionScreen
            topic={topic}
            difficulty={difficulty}
            currentQuestion={currentQuestion}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            quizState={quizState}
            selectedAnswerIndex={selectedAnswerIndex}
            isLastQuestion={isLastQuestion}
            onSubmitAnswer={handleSubmitAnswer}
            onNextQuestion={handleNextQuestion}
        />
    );
}

createRoot(document.getElementById("quizaurus-root")!).render(<App />);
