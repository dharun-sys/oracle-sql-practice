import { useState, useEffect } from "react";
import Quiz from "@/components/Quiz";
import MockTest from "@/components/MockTest";
import { QuestionSetSelector } from "@/components/QuestionSetSelector";

const Index = () => {
  const [selectedSet, setSelectedSet] = useState<string | null>(() => {
    return localStorage.getItem("selectedSet") || null;
  });
  const [isMockTest, setIsMockTest] = useState(() => {
    return localStorage.getItem("isMockTest") === "true";
  });
  const [reviewTestId, setReviewTestId] = useState<string | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    if (selectedSet) {
      localStorage.setItem("selectedSet", selectedSet);
    } else {
      localStorage.removeItem("selectedSet");
    }
  }, [selectedSet]);

  useEffect(() => {
    localStorage.setItem("isMockTest", String(isMockTest));
  }, [isMockTest]);

  const handleBackFromMockTest = () => {
    setIsMockTest(false);
    setReviewTestId(null);
    // Clear any remaining mock test state
    localStorage.removeItem("isMockTest");
  };

  if (isMockTest || reviewTestId) {
    return <MockTest onBack={handleBackFromMockTest} reviewTestId={reviewTestId || undefined} />;
  }

  if (!selectedSet) {
    return (
      <QuestionSetSelector 
        onSelectSet={setSelectedSet}
        onStartMockTest={() => {
          // Clear all session-specific localStorage when starting a new mock test
          localStorage.removeItem("mockTest_questions");
          localStorage.removeItem("mockTest_currentQuestionIndex");
          localStorage.removeItem("mockTest_userAnswers");
          localStorage.removeItem("mockTest_answeredQuestions");
          localStorage.removeItem("mockTest_savedQuestions");
          localStorage.removeItem("mockTest_timeRemaining");
          localStorage.removeItem("mockTest_isStarted");
          localStorage.removeItem("mockTest_isComplete");
          localStorage.removeItem("mockTest_startTime");
          setIsMockTest(true);
        }}
        onReviewTest={(testId) => setReviewTestId(testId)}
      />
    );
  }

  return <Quiz questionSetId={selectedSet} onBack={() => setSelectedSet(null)} />;
};

export default Index;
