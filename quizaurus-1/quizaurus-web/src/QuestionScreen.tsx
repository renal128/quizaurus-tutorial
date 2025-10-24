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

    const ajaxGet = () => {
        // make a get request to https://brenda-unharped-superoratorically.ngrok-free.dev/
        // add ngrok header to not get their wall
        fetch("https://brenda-unharped-superoratorically.ngrok-free.dev/", {
            headers: {
                "ngrok-skip-browser-warning": "true"
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
            })
            .catch(error => {
                console.error(error);
            });
    }

    const callTool = async () => {
        const response = await window.openai.callTool(
            "prepare-quiz-results",
            {
                test: "yoyoyo"
            }
        );

        console.log(response)
        console.log(JSON.stringify(response))
        console.log(response.structuredContent?["testtest"]:"")
        console.log(response.result)
        console.log(JSON.stringify(response.result))
    }

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

                <button
                    onClick={callTool}>
                    MCP call
                </button>

                <button
                    onClick={ajaxGet}
                >
                    simple call
                </button>

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
