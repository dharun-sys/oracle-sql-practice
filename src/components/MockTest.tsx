import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as auth from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Trophy, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

interface Question {
  id: number;
  type: "multiple-choice" | "multi-select";
  question: string;
  answers: Answer[];
  explanation: string;
  section: string;
  links: string[];
  setName: string;
}

interface MockTestProps {
  onBack: () => void;
}

interface MockTestResult {
  id: string;
  date: string;
  score: number;
  total: number;
  percentage: number;
  timeSpent: string;
  questions: Question[];
  userAnswers: [number, string[]][];
  correctAnswers: number[];
  incorrectAnswers: number[];
}

interface MockTestProps {
  onBack: () => void;
  reviewTestId?: string;
}

export default function MockTest({ onBack, reviewTestId }: MockTestProps) {
  // When reviewTestId is provided we will load review content from the server
  // (test_logs.questions_snapshot) — do not read localStorage in that case.
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (reviewTestId) return [];
    const saved = localStorage.getItem("mockTest_questions");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => 0);
  const [userAnswers, setUserAnswers] = useState<Map<number, string[]>>(() => new Map());
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(() => !!reviewTestId);
  const [isStarted, setIsStarted] = useState(() => !!reviewTestId);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(() => new Set());
  const [savedQuestions, setSavedQuestions] = useState<Set<number>>(() => new Set());
  const [timeRemaining, setTimeRemaining] = useState(() => reviewTestId ? 0 : (() => {
    const saved = localStorage.getItem("mockTest_timeRemaining");
    return saved ? parseInt(saved) : 90 * 60;
  })());
  const [startTime, setStartTime] = useState<number | null>(() => reviewTestId ? null : (() => {
    const saved = localStorage.getItem("mockTest_startTime");
    return saved ? parseInt(saved) : null;
  })());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResults, setShowResults] = useState(!!reviewTestId);
  const [isReviewMode, setIsReviewMode] = useState(!!reviewTestId);
  const [remoteSaveStatus, setRemoteSaveStatus] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<Set<number>>(() => new Set());
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<number>>(() => new Set());

  // Load and shuffle questions from all 6 sets
  useEffect(() => {
    const loadRandomQuestions = async () => {
      // Skip loading if in review mode or if questions exist
      if (reviewTestId || questions.length > 0) return;
      
      const allQuestions: Question[] = [];
      const questionSets = ["questions", "questions1", "questions2", "questions3", "questions4", "questions6"];
      const seenQuestionIds = new Set<number>();
      
      const shuffle = <T,>(arr: T[]) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      for (const setName of questionSets) {
        try {
          const questionsData = await import(`../data/${setName}.json`);
          const transformedQuestions: Question[] = questionsData.default.results
            .filter((q: any) => {
              // Skip if we've already seen this question ID
              if (seenQuestionIds.has(q.id)) {
                return false;
              }
              seenQuestionIds.add(q.id);
              return true;
            })
            .map((q: any) => {
              const answers: Answer[] = q.prompt.answers.map((answer: string, index: number) => {
                const answerId = String.fromCharCode(97 + index);
                return {
                  id: answerId,
                  text: answer,
                  isCorrect: q.correct_response.includes(answerId),
                  feedback: q.prompt.feedbacks[index] || "",
                };
              });

              // Randomize displayed order of answers for each question
              const shuffledAnswers = shuffle(answers);

              return {
                id: q.id,
                type: q.assessment_type,
                question: q.prompt.question,
                answers: shuffledAnswers,
                explanation: q.prompt.explanation,
                section: q.section,
                links: q.prompt.links || [],
                setName,
              };
            });
          allQuestions.push(...transformedQuestions);
        } catch (error) {
          console.error(`Failed to load ${setName}:`, error);
        }
      }

      // Shuffle and take 57 random questions
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, 57);
      setQuestions(selectedQuestions);
      localStorage.setItem("mockTest_questions", JSON.stringify(selectedQuestions));
    };

    loadRandomQuestions();
  }, [questions.length, reviewTestId]);

  // Persist state to localStorage
  useEffect(() => {
    if (isStarted && !isReviewMode) {
      localStorage.setItem("mockTest_currentQuestionIndex", String(currentQuestionIndex));
    }
  }, [currentQuestionIndex, isStarted, isReviewMode]);

  useEffect(() => {
    if (isStarted && !isReviewMode) {
      localStorage.setItem("mockTest_userAnswers", JSON.stringify(Array.from(userAnswers.entries())));
    }
  }, [userAnswers, isStarted, isReviewMode]);

  useEffect(() => {
    if (isStarted && !isReviewMode) {
      localStorage.setItem("mockTest_answeredQuestions", JSON.stringify(Array.from(answeredQuestions)));
    }
  }, [answeredQuestions, isStarted, isReviewMode]);

  useEffect(() => {
    if (isStarted && !isReviewMode) {
      localStorage.setItem("mockTest_savedQuestions", JSON.stringify(Array.from(savedQuestions)));
    }
  }, [savedQuestions, isStarted, isReviewMode]);

  useEffect(() => {
    if (isStarted && !isReviewMode) {
      localStorage.setItem("mockTest_timeRemaining", String(timeRemaining));
    }
  }, [timeRemaining, isStarted, isReviewMode]);

  useEffect(() => {
    if (!isReviewMode) localStorage.setItem("mockTest_isStarted", String(isStarted));
  }, [isStarted, isReviewMode]);

  useEffect(() => {
    if (!isReviewMode) localStorage.setItem("mockTest_isComplete", String(isComplete));
  }, [isComplete, isReviewMode]);

  useEffect(() => {
    if (!isReviewMode && startTime !== null) {
      localStorage.setItem("mockTest_startTime", String(startTime));
    }
  }, [startTime, isReviewMode]);

  // Timer countdown
  useEffect(() => {
    if (!isStarted || isComplete) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - calculate and save results
          const finalScore = calculateResults();
          saveMockTestResult(finalScore);
          setIsComplete(true);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isComplete, questions, userAnswers]);

  // Load selected answers when navigating
  useEffect(() => {
    const savedAnswers = userAnswers.get(currentQuestionIndex);
    if (savedAnswers) {
      setSelectedAnswers(savedAnswers);
    } else {
      setSelectedAnswers([]);
    }
  }, [currentQuestionIndex, userAnswers]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateResults = () => {
    let finalScore = 0;
    const correct = new Set<number>();
    const incorrect = new Set<number>();

    questions.forEach((question, index) => {
      const userAnswer = userAnswers.get(index);
      if (userAnswer) {
        const correctAnswerIds = question.answers
          .filter((a) => a.isCorrect)
          .map((a) => a.id)
          .sort();
        
        const isCorrect =
          userAnswer.length === correctAnswerIds.length &&
          userAnswer.sort().every((id, idx) => id === correctAnswerIds[idx]);

        if (isCorrect) {
          finalScore++;
          correct.add(index);
        } else {
          incorrect.add(index);
        }
      }
    });

    setScore(finalScore);
    setCorrectAnswers(correct);
    setIncorrectAnswers(incorrect);
    return finalScore;
  };

  const saveMockTestResult = (finalScore: number) => {
    const percentage = Math.round((finalScore / 57) * 100);
    const timeSpent = formatTime((90 * 60) - timeRemaining);
    
    const result: MockTestResult = {
      id: (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Date.now().toString(),
      date: new Date().toISOString(),
      score: finalScore,
      total: 57,
      percentage,
      timeSpent,
      questions,
      userAnswers: Array.from(userAnswers.entries()),
      correctAnswers: Array.from(correctAnswers),
      incorrectAnswers: Array.from(incorrectAnswers),
    };

    // Only persist to localStorage if this result already exists there (e.g. user took test offline
    // and we previously saved it locally). For new submissions we rely on the DB only.
    try {
      const existingResults = localStorage.getItem("mockTestResults");
      if (existingResults) {
        const parsed = JSON.parse(existingResults) as any[];
        const idx = parsed.findIndex(r => r && r.id === result.id);
        if (idx >= 0) {
          // update existing local entry with the authoritative result
          parsed[idx] = result;
          localStorage.setItem("mockTestResults", JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Failed to update local mockTestResults (non-fatal)', e);
    }

    // also attempt to persist remotely to Supabase
    try {
      // fire-and-forget; don't block UI
      setRemoteSaveStatus("saving");
      // avoid duplicate inserts: check saved ids
      const savedIdsRaw = localStorage.getItem("savedResultIds");
      const savedIds: string[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];
      if (savedIds.includes(result.id)) {
        console.log("Mock result already saved, skipping remote insert", result.id);
        setRemoteSaveStatus("already-saved");
      } else {
        saveMockTestResultRemote(result)
          .then(() => {
            console.log("Mock test result saved to Supabase");
            savedIds.push(result.id);
            localStorage.setItem("savedResultIds", JSON.stringify(savedIds));
            setRemoteSaveStatus("saved");
          })
          .catch((err) => {
            console.error("Failed to save mock test to Supabase:", err);
            setRemoteSaveStatus("error: " + (err?.message || String(err)));
          });
      }
    } catch (err) {
      console.error("Failed to enqueue Supabase save:", err);
      setRemoteSaveStatus("error: " + (err?.message || String(err)));
    }
  };

  async function saveMockTestResultRemote(result: MockTestResult) {
    try {
  const token = localStorage.getItem("auth_token");
  if (!token) return;
  const sessionUserId = await auth.verifySessionToken(token);
  if (!sessionUserId) return;
  const user = await auth.findUserById(sessionUserId);
  if (!user) return;
  const registerNo = user.register_no || null;

      // Build questions_map: { <question_id>: ["a","c"] }
      const questionsMap: Record<string, string[]> = {};
      for (const [index, answers] of result.userAnswers) {
        const q = result.questions[index];
        const qid = q?.id ?? String(index);
        questionsMap[String(qid)] = answers;
      }

      const payload = {
        user_id: user.id,
        register_no: registerNo || null,
        test_name: "Oracle SQL Mock Test",
        test_type: "mock",
        student_name: user.student_name || null,
        score: result.score,
        total_questions: result.total,
        questions_answered: Array.isArray(result.userAnswers) ? result.userAnswers.length : 0,
        percentage: result.percentage,
        time_spent: result.timeSpent,
        taken_at: result.date,
        // store the map of question id -> selected answer ids (so review can be reconstructed server-side)
        questions_map: questionsMap,
        // optional snapshot of questions (helps render review exactly as the user saw it)
        questions_snapshot: result.questions,
      } as any;

      console.log("Inserting mock payload:", payload);

      const { data, error } = await supabase.from("test_logs").insert(payload).select();
      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error("saveMockTestResultRemote error:", err);
      throw err;
    }
  }

  // When reviewTestId is present, prefer to load the review from server-side `test_logs`
  useEffect(() => {
    if (!reviewTestId) return;

    let mounted = true;
    (async () => {
      try {
        // Try to fetch the test_log by id
        const { data, error } = await supabase
          .from('test_logs')
          .select('*')
          .eq('id', reviewTestId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          console.warn('No remote test_log found for review id', reviewTestId);
          return;
        }

        // If questions_snapshot and questions_map exist, use them to reconstruct review
        const qsnap = data.questions_snapshot as any[] | undefined;
        const qmap = data.questions_map as Record<string, string[]> | undefined;

        if (qsnap && qmap && mounted) {
          // set questions to snapshot
          setQuestions(qsnap as Question[]);

          // Build userAnswers map keyed by question index (0..)
          const idToIndex = new Map<number, number>();
          (qsnap as any[]).forEach((q: any, idx: number) => {
            idToIndex.set(Number(q.id), idx);
          });

          const ua = new Map<number, string[]>();
          for (const [qidStr, answers] of Object.entries(qmap)) {
            const qidNum = Number(qidStr);
            const idx = idToIndex.get(qidNum);
            if (typeof idx === 'number') {
              ua.set(idx, answers as string[]);
            }
          }

          setUserAnswers(ua);
          // Recalculate results from restored questions and answers
          // small delay to ensure state applied
          setTimeout(() => {
            calculateResults();
            setIsComplete(true);
            setShowResults(true);
            setIsReviewMode(true);
            setCurrentQuestionIndex(0);
          }, 0);
        }
      } catch (err) {
        console.error('Failed to load remote test_log for review:', err);
        // fallback to existing localStorage-based review which is already handled by initializers
      }
    })();

    return () => { mounted = false; };
  }, [reviewTestId]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (answerId: string) => {
    if (showResults) return;

    let newAnswers: string[];
    if (currentQuestion.type === "multiple-choice") {
      newAnswers = [answerId];
    } else {
      newAnswers = selectedAnswers.includes(answerId)
        ? selectedAnswers.filter((id) => id !== answerId)
        : [...selectedAnswers, answerId];
    }
    
    setSelectedAnswers(newAnswers);
  };

  const handleSaveAnswer = () => {
    if (selectedAnswers.length > 0) {
      setUserAnswers(prev => new Map(prev).set(currentQuestionIndex, selectedAnswers));
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
      setSavedQuestions(prev => new Set(prev).add(currentQuestionIndex));
      
      // Auto-navigate to next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handleClearChoice = () => {
    setSelectedAnswers([]);
  };

  const handleFinalSubmit = () => {
    setShowSubmitDialog(true);
  };

  const confirmSubmit = () => {
    const finalScore = calculateResults();
    const correct = new Set<number>();
    const incorrect = new Set<number>();

    questions.forEach((question, index) => {
      const userAnswer = userAnswers.get(index);
      if (userAnswer) {
        const correctAnswerIds = question.answers
          .filter((a) => a.isCorrect)
          .map((a) => a.id)
          .sort();
        
        const isCorrect =
          userAnswer.length === correctAnswerIds.length &&
          userAnswer.sort().every((id, idx) => id === correctAnswerIds[idx]);

        if (isCorrect) {
          correct.add(index);
        } else {
          incorrect.add(index);
        }
      }
    });

    setCorrectAnswers(correct);
    setIncorrectAnswers(incorrect);
    
    // Save result with correct/incorrect answers
    const percentage = Math.round((finalScore / 57) * 100);
    const timeSpent = formatTime((90 * 60) - timeRemaining);
    
    const result: MockTestResult = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: finalScore,
      total: 57,
      percentage,
      timeSpent,
      questions,
      userAnswers: Array.from(userAnswers.entries()),
      correctAnswers: Array.from(correct),
      incorrectAnswers: Array.from(incorrect),
    };

    // Only persist to localStorage if an entry with this id already exists locally.
    try {
      const existingResults = localStorage.getItem("mockTestResults");
      if (existingResults) {
        const parsed = JSON.parse(existingResults) as any[];
        const idx = parsed.findIndex(r => r && r.id === result.id);
        if (idx >= 0) {
          parsed[idx] = result;
          localStorage.setItem("mockTestResults", JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Failed to update local mockTestResults on confirmSubmit (non-fatal)', e);
    }
    // persist remote copy as well
    try {
      setRemoteSaveStatus("saving");
      saveMockTestResultRemote(result)
        .then(() => {
          console.log("Mock test result saved to Supabase");
          setRemoteSaveStatus("saved");
        })
        .catch((err) => {
          console.error("Failed to save mock test to Supabase:", err);
          setRemoteSaveStatus("error: " + (err?.message || String(err)));
        });
    } catch (err) {
      console.error("Failed to enqueue Supabase save:", err);
      setRemoteSaveStatus("error: " + (err?.message || String(err)));
    }
    
    setShowResults(true);
    setIsComplete(true);
    setShowSubmitDialog(false);
    
    // Clear all mock test data from localStorage to allow new tests
    localStorage.removeItem("mockTest_questions");
    localStorage.removeItem("mockTest_currentQuestionIndex");
    localStorage.removeItem("mockTest_userAnswers");
    localStorage.removeItem("mockTest_answeredQuestions");
    localStorage.removeItem("mockTest_savedQuestions");
    localStorage.removeItem("mockTest_timeRemaining");
    localStorage.removeItem("mockTest_isStarted");
    localStorage.removeItem("mockTest_isComplete");
    localStorage.removeItem("mockTest_startTime");
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinishAttempt = () => {
    handleFinalSubmit();
  };

  const handleQuestionJump = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const getAnswerStyle = (answer: Answer) => {
    if (!isReviewMode) {
      return selectedAnswers.includes(answer.id)
        ? "border-primary bg-primary/5"
        : "border-border hover:border-primary/50 hover:bg-secondary";
    }

    if (answer.isCorrect) {
      return "border-success/30 bg-success-bg";
    }

    if (selectedAnswers.includes(answer.id) && !answer.isCorrect) {
      return "border-destructive/30 bg-destructive-bg";
    }

    return "border-border bg-secondary";
  };

  // Start Screen (only show if not in review mode)
  if (!isStarted && !isReviewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Oracle SQL Mock Test
            </h1>
            <p className="text-xl text-muted-foreground">
              Test your knowledge with a timed practice exam
            </p>
          </div>
          <div className="bg-secondary rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Questions</span>
              <span className="font-semibold text-foreground">57</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time Limit</span>
              <span className="font-semibold text-foreground">1 hour and 30 minutes</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Question Source</span>
              <span className="font-semibold text-foreground">Random from all 6 sets</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Review</span>
              <span className="font-semibold text-foreground">Available after submission</span>
            </div>
          </div>
          <div className="bg-info-bg border border-info-border rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-info-border flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm">
                <p className="font-semibold mb-1">Important Information:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>You can submit the test early if needed</li>
                  <li>Navigate between questions anytime</li>
                  <li>Review your answers after submission</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full text-lg py-6"
              onClick={() => {
                // Clear ALL session-specific localStorage data before starting
                localStorage.removeItem("mockTest_questions");
                localStorage.removeItem("mockTest_currentQuestionIndex");
                localStorage.removeItem("mockTest_userAnswers");
                localStorage.removeItem("mockTest_answeredQuestions");
                localStorage.removeItem("mockTest_savedQuestions");
                localStorage.removeItem("mockTest_timeRemaining");
                localStorage.removeItem("mockTest_isStarted");
                localStorage.removeItem("mockTest_isComplete");
                localStorage.removeItem("mockTest_startTime");
                
                // Reset all state for fresh test
                setQuestions([]);
                setCurrentQuestionIndex(0);
                setUserAnswers(new Map());
                setSelectedAnswers([]);
                setAnsweredQuestions(new Set());
                setSavedQuestions(new Set());
                setTimeRemaining(90 * 60);
                setIsComplete(false);
                setScore(0);
                setCorrectAnswers(new Set());
                setIncorrectAnswers(new Set());
                setShowResults(false);
                
                setIsStarted(true);
                setStartTime(Date.now());
              }}
            >
              Start Mock Test
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Results Screen
  if (isComplete && !isReviewMode) {
    const percentage = Math.round((score / 57) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center animate-bounce">
              <Trophy className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-foreground">Mock Test Complete!</h2>
            <p className="text-xl text-muted-foreground">
              Here's how you performed
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-8 space-y-4">
            <div className="text-6xl font-bold text-primary">
              {score} / 57
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {percentage}% Correct
            </div>
            <Progress value={percentage} className="h-3" />
            <div className="text-sm text-muted-foreground">
              Time: {formatTime((90 * 60) - timeRemaining)}
            </div>
            {remoteSaveStatus && (
              <div className="text-sm mt-2">
                Server: {remoteSaveStatus === "saving" ? "Saving result to server..." : remoteSaveStatus}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setIsReviewMode(true);
                setCurrentQuestionIndex(0);
              }}
            >
              Review Answers
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Loading
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading mock test...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card p-4 space-y-4 hidden lg:flex lg:flex-col lg:h-screen lg:fixed lg:left-0 lg:top-0">
        {isReviewMode ? (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground text-center">Review Mode</h3>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <div className="text-sm text-muted-foreground mb-1">Final Score</div>
              <div className="text-2xl font-bold text-primary">
                {score} / 57
              </div>
              <div className="text-lg font-semibold text-foreground">
                {Math.round((score / 57) * 100)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">Time Remaining</h3>
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className={`text-2xl font-bold text-center ${timeRemaining < 300 ? 'text-destructive' : 'text-foreground'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">Progress</h3>
          <Progress
            value={((currentQuestionIndex + 1) / 57) * 100}
            className="h-2"
          />
          <div className="text-xs text-muted-foreground text-center">
            {currentQuestionIndex + 1} / 57
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-4 gap-2 pr-4">
            {questions.map((_, index) => {
              const isSaved = savedQuestions.has(index);
              const isAnswered = answeredQuestions.has(index);
              const isCorrect = correctAnswers.has(index);
              const isIncorrect = incorrectAnswers.has(index);
              const isCurrent = currentQuestionIndex === index;
              
              return (
                <Button
                  key={index}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuestionJump(index)}
                  className={`w-full relative ${
                    isCorrect && !isCurrent
                      ? "border-success bg-success/10 hover:bg-success/20"
                      : isIncorrect && !isCurrent
                      ? "border-destructive bg-destructive/10 hover:bg-destructive/20"
                      : isSaved && !isCurrent
                      ? "border-primary bg-primary/10 hover:bg-primary/20"
                      : ""
                  }`}
                >
                  {index + 1}
                  {isSaved && !isCorrect && !isIncorrect && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="space-y-2 pt-4 border-t flex-shrink-0">
          {isReviewMode ? (
            <>
              <div className="bg-secondary rounded p-2 mb-2">
                <div className="text-xs text-center text-muted-foreground">Final Score</div>
                <div className="text-lg font-bold text-center">{score} / 57 ({Math.round((score / 57) * 100)}%)</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="w-full"
              >
                Back to Home
              </Button>
            </>
          ) : (
            <>
              <div className="text-xs text-center text-muted-foreground mb-2">
                Answered: {answeredQuestions.size} / 57
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleFinalSubmit}
                className="w-full"
              >
                Submit Test
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 py-8 overflow-y-auto lg:ml-64">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Mobile Timer/Score */}
          <div className="lg:hidden">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                {isReviewMode ? (
                  <>
                    <div>
                      <div className="text-xs text-muted-foreground">Final Score</div>
                      <div className="text-xl font-bold text-foreground">
                        {score} / 57
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Percentage</div>
                      <div className="text-xl font-bold text-primary">
                        {Math.round((score / 57) * 100)}%
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs text-muted-foreground">Time Remaining</div>
                      <div className={`text-xl font-bold ${timeRemaining < 300 ? 'text-destructive' : 'text-foreground'}`}>
                        {formatTime(timeRemaining)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Progress</div>
                      <div className="text-xl font-bold">
                        {currentQuestionIndex + 1} / 57
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <ScrollArea className="flex-1">
                  <div className="flex gap-2 pb-2">
                    {questions.map((_, index) => {
                      const isSaved = savedQuestions.has(index);
                      const isCorrect = correctAnswers.has(index);
                      const isIncorrect = incorrectAnswers.has(index);
                      const isCurrent = currentQuestionIndex === index;
                      
                      return (
                        <Button
                          key={index}
                          variant={isCurrent ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleQuestionJump(index)}
                          className={`flex-shrink-0 min-w-[40px] relative ${
                            isCorrect && !isCurrent
                              ? "border-success bg-success/10"
                              : isIncorrect && !isCurrent
                              ? "border-destructive bg-destructive/10"
                              : isSaved && !isCurrent
                              ? "border-primary bg-primary/10"
                              : ""
                          }`}
                        >
                          {index + 1}
                          {isSaved && !isCorrect && !isIncorrect && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentQuestionIndex === 56}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              {isReviewMode ? (
                <div className="bg-secondary rounded p-2 mt-2">
                  <div className="text-xs text-center text-muted-foreground">Final Score</div>
                  <div className="text-base font-bold text-center">{score} / 57 ({Math.round((score / 57) * 100)}%)</div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mt-2">
                    <div className="text-xs text-muted-foreground">
                      Answered: {answeredQuestions.size} / 57
                    </div>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleFinalSubmit}
                    className="w-full mt-2"
                  >
                    Submit Test
                  </Button>
                </>
              )}
            </Card>
          </div>

          {/* Question Card */}
          <Card className="p-0 overflow-hidden">
            <div className="bg-info-bg border-l-4 border-info-border p-4 md:p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-info-border flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Question {currentQuestionIndex + 1} - {currentQuestion.type === "multi-select" ? "Multiple Select" : "Multiple Choice"}
                  </p>
                  <div 
                    className="text-sm text-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {currentQuestion.answers.map((answer, idx) => (
                <button
                  key={answer.id}
                  onClick={() => handleAnswerSelect(answer.id)}
                  disabled={isReviewMode}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${getAnswerStyle(
                    answer
                  )} ${!isReviewMode ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-current flex-shrink-0 mt-0.5">
                      {isReviewMode && answer.isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      )}
                      {isReviewMode && selectedAnswers.includes(answer.id) && !answer.isCorrect && (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      {!isReviewMode && (
                        <span className="text-xs font-bold">{String.fromCharCode(65 + idx)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: answer.text }}
                      />
                      {isReviewMode && answer.feedback && (
                        <p className="text-xs text-muted-foreground mt-2">{answer.feedback}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {isReviewMode && (
              <div className="bg-secondary border-t p-6">
                <h3 className="font-semibold text-foreground mb-2">Explanation</h3>
                <div 
                  className="text-sm text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                />
              </div>
            )}

            <div className="p-6 pt-0 flex gap-3">
              {!isReviewMode ? (
                <>
                  <Button
                    onClick={handleClearChoice}
                    disabled={selectedAnswers.length === 0}
                    variant="outline"
                    className="flex-1"
                  >
                    Clear Choice
                  </Button>
                  <Button
                    onClick={handleSaveAnswer}
                    disabled={selectedAnswers.length === 0}
                    variant="outline"
                    className="flex-1"
                  >
                    Save Answer
                  </Button>
                  <Button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === 56}
                    variant="outline"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === 56}
                    variant="outline"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Mock Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your test? You have answered {answeredQuestions.size} out of 57 questions.
              {answeredQuestions.size < 57 && " Unanswered questions will be marked as incorrect."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>Submit Test</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}