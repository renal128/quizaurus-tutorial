import React from "react";
import "./theme.css";

interface ResultsScreenProps {
    correctAnswersCount: number;
    totalQuestions: number;
    mistakesCount: number;
    reviewClicked: boolean;
    moreQuestionsClicked: boolean;
    encouragement: string | null;
    successRate: number | null;
    onStartOver: () => void;
    onReviewResults: () => void;
    onMoreQuestions: () => void;
}

export function ResultsScreen({
    correctAnswersCount,
    totalQuestions,
    mistakesCount,
    reviewClicked,
    moreQuestionsClicked,
    encouragement,
    successRate,
    onStartOver,
    onReviewResults,
    onMoreQuestions
}: ResultsScreenProps) {
    const successPct = successRate ? `${(successRate * 100).toFixed(0)}%` : "...";
    return (
        <div className="quiz-container">
            <div className="quiz-card quiz-card--results">
                <h1 className="quiz-encouragement">{encouragement ?? "..."}</h1>

                <div className="quiz-results-container">
                    <div className="quiz-results-grid">
                        <div className="quiz-results-stats">
                            <div className="quiz-results-row">
                                <span className="quiz-results-label">TOTAL:</span>
                                <span className="quiz-results-value">{totalQuestions}</span>
                            </div>
                            <div className="quiz-results-row">
                                <span className="quiz-results-label">CORRECT:</span>
                                <span className="quiz-results-value">{correctAnswersCount}</span>
                            </div>
                            <div className="quiz-results-row">
                                <span className="quiz-results-label">MISTAKES:</span>
                                <span className="quiz-results-value">{mistakesCount}</span>
                            </div>
                        </div>

                        <div className="quiz-results-circle-container">
                            <svg className="quiz-results-circle" viewBox="0 0 120 120">
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="var(--color-incorrect)"
                                    strokeWidth="12"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="var(--color-correct)"
                                    strokeWidth="12"
                                    strokeDasharray={`${(successRate ?? 0) * 339} 339`}
                                    strokeDashoffset="0"
                                    transform="rotate(-90 60 60)"
                                />
                                <text
                                    x="60"
                                    y="60"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="quiz-results-circle-text"
                                >
                                    {successPct}
                                </text>
                            </svg>
                        </div>
                    </div>

                    <div className="quiz-results-actions">
                        <button className="quiz-button" onClick={onStartOver}>
                            Start Over
                        </button>
                        <button className="quiz-button quiz-button--secondary" onClick={onReviewResults} disabled={reviewClicked}>
                            Review Results
                        </button>
                        <button className="quiz-button quiz-button--secondary" onClick={onMoreQuestions} disabled={moreQuestionsClicked}>
                            More Questions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
