import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_PATH } from "@/lib/constants";
import Quiz from "@/components/Quiz";
import MockTest from "@/components/MockTest";
import { QuestionSetSelector } from "@/components/QuestionSetSelector";

const Index = () => {
  const navigate = useNavigate();

  const [authUser, setAuthUser] = useState<{ register_no?: string; student_name?: string | null; isAdmin?: boolean } | null>(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("auth_user");
    // optionally clear other session data if needed
    navigate("/login");
  };
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

  const header = (
    <div className="flex justify-end items-center p-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate("/profile")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/profile")}
        className="mr-4 text-sm text-gray-700 cursor-pointer hover:underline"
      >
        {authUser?.student_name ? authUser.student_name : authUser?.register_no ? `User: ${authUser.register_no}` : null}
      </div>
      {authUser?.isAdmin && (
        <button
          onClick={() => navigate(ADMIN_PATH)}
          className="mr-4 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Admin Page
        </button>
      )}
      <button
        onClick={async () => {
          const ok = window.confirm("This will clear all local app data (localStorage, sessionStorage, IndexedDB and cookies) and sign you out. Continue?");
          if (!ok) return;
          try {
            // clear storages
            localStorage.clear();
            sessionStorage.clear();

            // attempt to clear all indexedDB databases (if supported)
            try {
              if (indexedDB && (indexedDB as any).databases) {
                const dbs = await (indexedDB as any).databases();
                for (const db of dbs) {
                  if (db && db.name) {
                    indexedDB.deleteDatabase(db.name);
                  }
                }
              }
            } catch (e) {
              // ignore indexedDB cleanup errors
              console.warn("IndexedDB cleanup failed", e);
            }

            // clear cookies for current domain/path
            try {
              document.cookie.split(";").forEach(function(c) {
                const name = c.split("=")[0].trim();
                if (!name) return;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              });
            } catch (e) {
              console.warn("Cookie cleanup failed", e);
            }

            // navigate to login after clearing
            navigate("/login");
          } catch (err) {
            console.error("Failed to clear app data:", err);
            alert("Failed to clear some app data. Check console for details.");
          }
        }}
        className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 mr-2"
      >
        Reset App Data
      </button>
    </div>
  );

  if (isMockTest || reviewTestId) {
    return (
      <div>
        {header}
        <MockTest onBack={handleBackFromMockTest} reviewTestId={reviewTestId || undefined} />
      </div>
    );
  }

  if (!selectedSet) {
    return (
      <div>
        {header}
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
      </div>
    );
  }

  return (
    <div>
      {header}
      <Quiz questionSetId={selectedSet} onBack={() => setSelectedSet(null)} />
    </div>
  );
};

export default Index;
