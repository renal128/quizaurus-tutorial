import React from "react";
import { Question, QuizState } from "./QuizaurusApp";
import "./theme.css";

interface QuestionScreenProps {
    topic: string;
    difficulty: string;
    currentQuestion: Question;
    currentQuestionIndex: number;
    totalQuestions: number;
    quizState: QuizState;
    selectedAnswerIndex: number | null;
    isLastQuestion: boolean;
    onSubmitAnswer: (index: number) => void;
    onNextQuestion: () => void;
}

export function QuestionScreen({
    topic,
    difficulty,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    quizState,
    selectedAnswerIndex,
    isLastQuestion,
    onSubmitAnswer,
    onNextQuestion,
}: QuestionScreenProps) {
    const isCorrect = selectedAnswerIndex === currentQuestion.correctIndex;

    const getOptionClasses = (index: number) => {
        const classes = ["quiz-option"];
        if (quizState === "feedback") {
            classes.push("quiz-option--disabled");
            if (index === currentQuestion.correctIndex) {
                classes.push("quiz-option--correct");
            } else if (index === selectedAnswerIndex && !isCorrect) {
                classes.push("quiz-option--incorrect");
            }
        } else if (index === selectedAnswerIndex) {
            classes.push("quiz-option--selected");
        }
        return classes.join(" ");
    };

    const getExplanationClasses = () => {
        const classes = ["quiz-explanation"];
        if (quizState === "feedback") {
            classes.push(isCorrect ? "quiz-explanation--correct" : "quiz-explanation--incorrect");
        }
        return classes.join(" ");
    };

    return (
        <div className="quiz-container">
            <div className="quiz-card">
                <div className="quiz-header">
                    <div className="quiz-badge">
                        {topic} ({difficulty.toLowerCase()})
                    </div>
                    <div className="quiz-counter">
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                    </div>
                </div>

                <div className="quiz-progress">
                    <div
                        className="quiz-progress__fill"
                        style={{
                            width: `${((currentQuestionIndex + (quizState === "feedback" ? 1 : 0)) / totalQuestions) * 100}%`
                        }}
                    />
                </div>

                <h2 className="quiz-question">{currentQuestion.question}</h2>

                <div className="quiz-options">
                    {currentQuestion.options.map((option, index) => (
                        <button
                            key={index}
                            className={getOptionClasses(index)}
                            onClick={() => onSubmitAnswer(index)}
                            disabled={quizState === "feedback"}
                        >
                            <span className="quiz-option__letter">
                                {String.fromCharCode(65 + index)}
                            </span>
                            <span className="quiz-option__text">{option}</span>
                        </button>
                    ))}
                </div>

                <div
                    className={getExplanationClasses()}
                    style={{ visibility: quizState === "feedback" ? "visible" : "hidden" }}
                >
                    <strong>{isCorrect ? "✓ " : "✗ "}</strong>
                    {currentQuestion.explanation}
                </div>

                <button className="quiz-button" onClick={onNextQuestion} disabled={quizState === "question"}>
                    {isLastQuestion ? "See Results" : "Next Question"}
                </button>
            </div>
        </div>
    );
}
