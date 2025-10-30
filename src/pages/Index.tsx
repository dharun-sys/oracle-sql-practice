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

  if (isMockTest) {
    return <MockTest onBack={() => setIsMockTest(false)} />;
  }

  if (!selectedSet) {
    return (
      <QuestionSetSelector 
        onSelectSet={setSelectedSet}
        onStartMockTest={() => setIsMockTest(true)}
      />
    );
  }

  return <Quiz questionSetId={selectedSet} onBack={() => setSelectedSet(null)} />;
};

export default Index;
