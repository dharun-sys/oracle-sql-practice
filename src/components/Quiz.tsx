import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as auth from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Trophy, RotateCcw, Brain, AlertCircle, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

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
}

interface QuizProps {
  questionSetId: string;
  onBack: () => void;
}

export default function Quiz({ questionSetId, onBack }: QuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<number, string[]>>(new Map());
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [remoteSaveStatus, setRemoteSaveStatus] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [savedQuestions, setSavedQuestions] = useState<Set<number>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState<Set<number>>(new Set());
  const [incorrectAnswers, setIncorrectAnswers] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  // Load persisted state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`quizState_${questionSetId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
        setScore(parsed.score || 0);
        setIsStarted(parsed.isStarted || false);
        setIsComplete(parsed.isComplete || false);
        setAnsweredQuestions(new Set(parsed.answeredQuestions || []));
        setSavedQuestions(new Set(parsed.savedQuestions || []));
        setCorrectAnswers(new Set(parsed.correctAnswers || []));
        setIncorrectAnswers(new Set(parsed.incorrectAnswers || []));
        setUserAnswers(new Map(parsed.userAnswers || []));
      } catch (error) {
        console.error('Failed to load quiz state:', error);
      }
    }
  }, [questionSetId]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      currentQuestionIndex,
      score,
      isStarted,
      isComplete,
      answeredQuestions: Array.from(answeredQuestions),
      savedQuestions: Array.from(savedQuestions),
      correctAnswers: Array.from(correctAnswers),
      incorrectAnswers: Array.from(incorrectAnswers),
      userAnswers: Array.from(userAnswers.entries()),
    };
    localStorage.setItem(`quizState_${questionSetId}`, JSON.stringify(stateToSave));
  }, [currentQuestionIndex, score, isStarted, isComplete, answeredQuestions, savedQuestions, correctAnswers, incorrectAnswers, userAnswers, questionSetId]);

  // Load questions dynamically based on questionSetId
  useEffect(() => {
    const shuffle = <T,>(arr: T[]) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const loadQuestions = async () => {
      try {
        const questionsData = await import(`../data/${questionSetId}.json`);
        const transformedQuestions: Question[] = questionsData.default.results.map((q: any) => {
          const answers: Answer[] = q.prompt.answers.map((answer: string, index: number) => {
            const answerId = String.fromCharCode(97 + index); // a, b, c, d...
            return {
              id: answerId,
              text: answer,
              isCorrect: q.correct_response.includes(answerId),
              feedback: q.prompt.feedbacks[index] || "",
            };
          });

          // Randomize displayed order of answers to prevent memorization
          const shuffledAnswers = shuffle(answers);

          return {
            id: q.id,
            type: q.assessment_type,
            question: q.prompt.question,
            answers: shuffledAnswers,
            explanation: q.prompt.explanation,
            section: q.section,
            links: q.prompt.links || [],
          };
        });

        setQuestions(transformedQuestions);
      } catch (error) {
        console.error('Failed to load questions:', error);
      }
    };
    loadQuestions();
  }, [questionSetId]);

  // Load selected answers when navigating between questions
  useEffect(() => {
    const savedAnswers = userAnswers.get(currentQuestionIndex);
    if (savedAnswers) {
      setSelectedAnswers(savedAnswers);
    } else {
      setSelectedAnswers([]);
    }
    
    // Check if this question was already answered
    if (answeredQuestions.has(currentQuestionIndex)) {
      setShowExplanation(true);
    } else {
      setShowExplanation(false);
    }
  }, [currentQuestionIndex, userAnswers, answeredQuestions]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (answerId: string) => {
    if (showExplanation) return;

    let newAnswers: string[];
    if (currentQuestion.type === "multiple-choice") {
      newAnswers = [answerId];
    } else {
      newAnswers = selectedAnswers.includes(answerId)
        ? selectedAnswers.filter((id) => id !== answerId)
        : [...selectedAnswers, answerId];
    }
    
    setSelectedAnswers(newAnswers);
    setUserAnswers(prev => new Map(prev).set(currentQuestionIndex, newAnswers));
  };

  const handleSaveAnswer = () => {
    if (selectedAnswers.length > 0) {
      setUserAnswers(prev => new Map(prev).set(currentQuestionIndex, selectedAnswers));
      setSavedQuestions(prev => new Set(prev).add(currentQuestionIndex));
      
      // Auto-navigate to next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  };

  const handleSubmit = () => {
    const correctAnswerIds = currentQuestion.answers
      .filter((a) => a.isCorrect)
      .map((a) => a.id)
      .sort();
    
    // copy and sort user selection to avoid mutating state (Array.prototype.sort mutates)
    const userSorted = [...selectedAnswers].sort();

    const isCorrect =
      userSorted.length === correctAnswerIds.length &&
      userSorted.every((id, idx) => id === correctAnswerIds[idx]);

    if (isCorrect) {
      setScore(score + 1);
      setCorrectAnswers(prev => new Set(prev).add(currentQuestionIndex));
    } else {
      setIncorrectAnswers(prev => new Set(prev).add(currentQuestionIndex));
    }

    setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
    setShowExplanation(true);
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    localStorage.removeItem(`quizState_${questionSetId}`);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowExplanation(false);
    setScore(0);
    setIsComplete(false);
    setIsStarted(false);
    setAnsweredQuestions(new Set());
    setSavedQuestions(new Set());
    setCorrectAnswers(new Set());
    setIncorrectAnswers(new Set());
    setUserAnswers(new Map());
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

        const userSorted = [...userAnswer].sort();
        const isCorrect = userSorted.length === correctAnswerIds.length && userSorted.every((id, idx) => id === correctAnswerIds[idx]);

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
    setAnsweredQuestions(new Set(Array.from(userAnswers.keys())));
    return finalScore;
  };

  const handleFinalSubmit = () => {
    // compute results and mark complete
    calculateResults();
    setIsComplete(true);
  };

  // When quiz completes, save result locally and attempt to save to Supabase
  useEffect(() => {
    if (!isComplete) return;

    const percentage = Math.round((score / questions.length) * 100);
    const result = {
      // stable uuid so duplicates are detectable and primary-key safe
      id: (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Date.now().toString(),
      date: new Date().toISOString(),
      score,
      total: questions.length,
      percentage,
      questions,
      userAnswers: Array.from(userAnswers.entries()),
      correctAnswers: Array.from(correctAnswers),
      incorrectAnswers: Array.from(incorrectAnswers),
    } as any;

    // persist locally (aggregate list)
    try {
      const existing = localStorage.getItem("quizResults");
      const arr = existing ? JSON.parse(existing) : [];
      arr.push(result);
      localStorage.setItem("quizResults", JSON.stringify(arr));
    } catch (err) {
      console.error("Failed to save quiz result locally:", err);
    }

    // attempt remote save, but avoid duplicate inserts by tracking saved ids
    (async () => {
      try {
        setRemoteSaveStatus("saving");

        const token = localStorage.getItem("auth_token");
        if (!token) {
          setRemoteSaveStatus("no auth_token in localStorage");
          return;
        }

        const sessionUserId = await auth.verifySessionToken(token);
        if (!sessionUserId) {
          setRemoteSaveStatus("invalid session token");
          return;
        }

        const user = await auth.findUserById(sessionUserId);
        if (!user) {
          setRemoteSaveStatus("user not found");
          return;
        }
        const registerNo = user.register_no || null;

        // guard against duplicate saves
        const savedIdsRaw = localStorage.getItem("savedResultIds");
        const savedIds: string[] = savedIdsRaw ? JSON.parse(savedIdsRaw) : [];
        if (savedIds.includes(result.id)) {
          console.log("Result already saved, skipping remote insert", result.id);
          setRemoteSaveStatus("already-saved");
          return;
        }

        const setLabels: Record<string, string> = {
          questions: "Practice Set 1",
          questions1: "Practice Set 2",
          questions2: "Practice Set 3",
          questions3: "Practice Set 4",
          questions4: "Practice Set 5",
          questions6: "Practice Set 6",
        };

        const testName = setLabels[questionSetId] || `Practice: ${questionSetId}`;

        // ensure register_no is explicit and authoritative (prefer DB value)
        const payload = {
          id: result.id,
          user_id: user.id,
          register_no: registerNo || null,
          test_name: testName,
          test_type: "practice",
          student_name: user.student_name || null,
          score: result.score,
          total_questions: result.total,
          questions_answered: Array.isArray(result.userAnswers) ? result.userAnswers.length : 0,
          percentage: result.percentage,
          taken_at: result.date,
        } as any;

        console.log("Inserting practice payload:", payload);

        const { data, error } = await supabase.from("test_logs").insert(payload).select();
        if (error) {
          console.error("Supabase insert error:", error);
          setRemoteSaveStatus("error: " + (error.message || JSON.stringify(error)));
          return;
        }

        // mark as saved
        savedIds.push(result.id);
        localStorage.setItem("savedResultIds", JSON.stringify(savedIds));

        console.log("Quiz result saved to Supabase", data);
        setRemoteSaveStatus("saved");

        // Cleanup local state for practice quizzes: we don't need to preserve local copies
        try {
          // remove persisted quiz state so user can take unlimited practices
          localStorage.removeItem(`quizState_${questionSetId}`);

          // remove this result from local quizResults aggregate
          const existingResults = localStorage.getItem("quizResults");
          if (existingResults) {
            try {
              const arr = JSON.parse(existingResults);
              const filtered = arr.filter((r: any) => r.id !== result.id);
              localStorage.setItem("quizResults", JSON.stringify(filtered));
            } catch (e) {
              console.warn("Failed to clean quizResults local entry:", e);
            }
          }
        } catch (e) {
          console.warn("Cleanup after save failed:", e);
        }
      } catch (err: any) {
        console.error("savePracticeResultRemote error:", err);
        setRemoteSaveStatus("error: " + (err?.message || String(err)));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  const handleQuestionJump = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      handleQuestionJump(currentQuestionIndex - 1);
    }
  };

  const getAnswerStyle = (answer: Answer) => {
    if (!showExplanation) {
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

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
              <Brain className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Oracle SQL Quiz
            </h1>
            <p className="text-xl text-muted-foreground">
              Test your knowledge with {questions.length} challenging questions
            </p>
          </div>
          <div className="bg-secondary rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Questions</span>
              <span className="font-semibold text-foreground">{questions.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Question Types</span>
              <span className="font-semibold text-foreground">Multiple Choice & Multi-Select</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Instant Feedback</span>
              <span className="font-semibold text-foreground">Detailed Explanations</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full text-lg py-6"
              onClick={() => setIsStarted(true)}
            >
              Start Quiz
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              Back to Question Sets
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center animate-bounce">
              <Trophy className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-foreground">Quiz Complete!</h2>
            <p className="text-xl text-muted-foreground">
              Here's how you performed
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-8 space-y-4">
            <div className="text-6xl font-bold text-primary">
              {score} / {questions.length}
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {percentage}% Correct
            </div>
            <Progress value={percentage} className="h-3" />
              {remoteSaveStatus && (
                <div className="text-sm mt-2">Server: {remoteSaveStatus === "saving" ? "Saving result to server..." : remoteSaveStatus}</div>
              )}
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={onBack}
            >
              Back to Question Sets
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar with Question Navigation */}
      <div className="w-64 border-r bg-card p-4 space-y-4 hidden lg:block">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">Questions</h3>
          <Progress
            value={((currentQuestionIndex + 1) / questions.length) * 100}
            className="h-2"
          />
          <div className="text-xs text-muted-foreground text-center">
            {currentQuestionIndex + 1} / {questions.length}
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-250px)]">
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

        <div className="space-y-2 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!showExplanation}
              className="flex-1"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleFinalSubmit}
            className="w-full mt-2"
          >
            Submit Quiz
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRestart}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Quiz
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="w-full"
          >
            Back to Sets
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 py-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Score: {score} / {questions.length}
              </div>
            </div>
            <Progress
              value={((currentQuestionIndex + 1) / questions.length) * 100}
              className="h-2"
            />
            
            {/* Mobile Navigation */}
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="flex-shrink-0"
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
                  disabled={!showExplanation}
                  className="flex-shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Desktop Score Header */}
          <div className="hidden lg:flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Question {currentQuestionIndex + 1}
            </h2>
            <div className="text-sm font-medium text-muted-foreground">
              Score: {score} / {questions.length}
            </div>
          </div>

        {/* Question Card */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-info-bg border-l-4 border-info-border p-4 md:p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-info-border flex-shrink-0 mt-1" />
                <div>
                  {/* Show a neutral instruction before answering; after submission show correct/incorrect feedback */}
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {showExplanation
                      ? incorrectAnswers.has(currentQuestionIndex)
                        ? "Incorrect answer. Review the explanation and resources to learn more."
                        : "Correct — well done! Review the explanation and resources to learn more."
                      : currentQuestion.type === "multi-select"
                      ? "Select all correct answers"
                      : "Review the available responses."}
                  </p>
                  {!showExplanation && (
                    <p className="text-xs text-muted-foreground">
                      {currentQuestion.type === "multi-select"
                        ? "Select all correct answers"
                        : "Choose the correct answer"}
                    </p>
                  )}
                </div>
              </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Question Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block px-3 py-1 bg-secondary text-foreground text-xs font-semibold rounded">
                  Question {currentQuestionIndex + 1}
                </span>
                <span className="inline-block px-3 py-1 bg-secondary text-foreground text-xs font-semibold rounded">
                  {currentQuestion.section}
                </span>
              </div>
              <div
                className="text-base md:text-lg text-foreground leading-relaxed quiz-content"
                dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
              />
            </div>

            {/* Answers */}
            {!showExplanation ? (
              <div className="space-y-3">
                {currentQuestion.answers.map((answer, idx) => (
                  <button
                    key={answer.id}
                    onClick={() => handleAnswerSelect(answer.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${getAnswerStyle(
                      answer
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <div
                        className="flex-1 text-sm md:text-base quiz-content"
                        dangerouslySetInnerHTML={{ __html: answer.text }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {currentQuestion.answers.map((answer, idx) => (
                  <div
                    key={answer.id}
                    className={`p-4 rounded-lg border-2 transition-all ${getAnswerStyle(
                      answer
                    )}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {answer.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : selectedAnswers.includes(answer.id) ? (
                          <XCircle className="w-5 h-5 text-destructive" />
                        ) : (
                          <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                            {String.fromCharCode(65 + idx)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div
                          className="text-sm md:text-base quiz-content"
                          dangerouslySetInnerHTML={{ __html: answer.text }}
                        />
                        {answer.feedback && (
                          <p className="text-sm text-muted-foreground">
                            {answer.feedback}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Explanation */}
            {showExplanation && currentQuestion.explanation && (
              <div className="bg-secondary p-4 md:p-6 rounded-lg space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Explanation
                </h3>
                <div
                  className="text-sm text-muted-foreground leading-relaxed quiz-content"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                />
                {currentQuestion.links && currentQuestion.links.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-2">
                      Additional Resources:
                    </p>
                    <ul className="space-y-1">
                      {currentQuestion.links.map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link}
                            target="_blank"
                            // onClick={() => navigate(`${link}`)}
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {!showExplanation ? (
                <>
                  <Button
                    onClick={handleSubmit}
                    disabled={selectedAnswers.length === 0}
                    className="flex-1"
                  >
                    Submit Answer
                  </Button>
                  <Button
                    onClick={handleSkip}
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNext}
                  className="w-full"
                >
                  {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
    </div>
  );
}
