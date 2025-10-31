import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_PATH } from "@/lib/constants";
import { deleteSessionToken } from "@/lib/auth";
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

  const handleLogout = async () => {
    const ok = window.confirm("Sign out?\nYou will be returned to the login screen.");
    if (!ok) return;

    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          await deleteSessionToken(token);
        } catch (e) {
          // non-fatal: still clear client-side even if server call fails
          console.warn("Failed to delete server session token:", e);
        }
      }

      // Clear client-side auth state only (don't clear other app data)
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
      sessionStorage.clear();

      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Logout failed. Check console for details.");
    }
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
    <div className="flex items-center justify-between p-4">
      {/* left group */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/discussion')}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Discussions
        </button>
      </div>

      {/* right group - compact, wrapped for small screens */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/profile')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
          className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-md shadow-sm text-sm text-gray-800 hover:shadow-md"
          title={authUser?.student_name || authUser?.register_no || undefined}
        >
          <span className="font-medium">
            {authUser?.student_name ? authUser.student_name : authUser?.register_no ? `User: ${authUser.register_no}` : 'Guest'}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </div>

        {authUser?.isAdmin && (
          <button
            onClick={() => navigate(ADMIN_PATH)}
            className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            Admin
          </button>
        )}

        <button
          onClick={async () => {
            const ok = window.confirm('This will clear all local app data (localStorage, sessionStorage, IndexedDB and cookies) and sign you out. Continue?');
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
                console.warn('IndexedDB cleanup failed', e);
              }

              // clear cookies for current domain/path
              try {
                document.cookie.split(';').forEach(function(c) {
                  const name = c.split('=')[0].trim();
                  if (!name) return;
                  document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                });
              } catch (e) {
                console.warn('Cookie cleanup failed', e);
              }

              // navigate to login after clearing
              navigate('/login');
            } catch (err) {
              console.error('Failed to clear app data:', err);
              alert('Failed to clear some app data. Check console for details.');
            }
          }}
          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
        >
          Clear App Data
        </button>

        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Logout
        </button>
      </div>
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
