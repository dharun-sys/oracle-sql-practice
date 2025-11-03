import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as auth from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface QuestionSet {
  id: string;
  name: string;
  description: string;
  count: number;
}

interface QuestionSetSelectorProps {
  onSelectSet: (setId: string) => void;
}

const questionSets: QuestionSet[] = [
  { id: "questions", name: "Question Set 1", description: "Oracle Database Fundamentals", count: 80 },
  { id: "questions1", name: "Question Set 2", description: "Table Joins and SQL Syntax", count: 20 },
  { id: "questions2", name: "Question Set 3", description: "Transaction Management", count: 40 },
  { id: "questions3", name: "Question Set 4", description: "Date/Time Functions", count: 80 },
  { id: "questions4", name: "Question Set 5", description: "Sequences and Constraints", count: 80 },
  { id: "questions6", name: "Question Set 6", description: "Advanced SQL Queries", count: 80 },
];

interface QuestionSetSelectorPropsExtended extends QuestionSetSelectorProps {
  onStartMockTest?: () => void;
  onReviewTest?: (testId: string) => void;
}

export function QuestionSetSelector({ onSelectSet, onStartMockTest, onReviewTest }: QuestionSetSelectorPropsExtended) {
  // Load mock test history from server when possible; fall back to localStorage for guests
  const [mockTestHistory, setMockTestHistory] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          // fallback to localStorage for unauthenticated users
          const results = localStorage.getItem("mockTestResults");
          if (results && mounted) setMockTestHistory(JSON.parse(results).reverse());
          return;
        }

        const sessionUserId = await auth.verifySessionToken(token);
        if (!sessionUserId) {
          const results = localStorage.getItem("mockTestResults");
          if (results && mounted) setMockTestHistory(JSON.parse(results).reverse());
          return;
        }

        // fetch latest mock test logs for this user
        const { data, error } = await supabase
          .from('test_logs')
          // fetch questions_map so we can ensure review is available server-side
          .select('id, taken_at, score, total_questions, percentage, time_spent, questions_map')
          .eq('user_id', sessionUserId)
          .eq('test_type', 'mock')
          // only include rows which actually have questions_map stored (server-side review available)
          .not('questions_map', 'is', null)
          .order('taken_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        if (mounted && data) {
          // normalize to the shape the UI expects
          const normalized = (data as any[])
            // data already filtered to rows with questions_map != null, but be defensive
            .filter(r => r.questions_map !== null && r.questions_map !== undefined)
            .map((row: any) => ({
              id: row.id,
              date: row.taken_at || row.created_at || new Date().toISOString(),
              score: row.score,
              total: row.total_questions || row.total || 57,
              percentage: row.percentage,
              timeSpent: row.time_spent || row.timeSpent || '',
            }));

          setMockTestHistory(normalized);
        }
      } catch (err) {
        console.warn('Failed to fetch mock test history from server, falling back to localStorage', err);
        const results = localStorage.getItem("mockTestResults");
        if (results && mounted) setMockTestHistory(JSON.parse(results).reverse());
      }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Oracle SQL Practice
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose a question set or take a full mock test
          </p>
        </div>

        {/* Mock Test Button */}
        {onStartMockTest && (
          <div className="mb-8">
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold mb-2">Take a Mock Test</h2>
                  <p className="text-muted-foreground">
                    57 random questions from all sets • 1 hour and 30 minutes time limit
                  </p>
                </div>
                <Button 
                  size="lg" 
                  onClick={onStartMockTest}
                  className="w-full md:w-auto"
                >
                  Start Mock Test
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Mock Test History */}
        {mockTestHistory.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Mock Test History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockTestHistory.map((result) => (
                <Card key={result.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(result.date).toLocaleDateString()}
                    </span>
                    <span className={`text-lg font-bold ${
                      result.percentage >= 70 ? 'text-success' : 
                      result.percentage >= 50 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {result.percentage}%
                    </span>
                  </div>
                  <div className="text-sm space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score:</span>
                      <span className="font-semibold">{result.score} / {result.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-semibold">{result.timeSpent}</span>
                    </div>
                  </div>
                  {onReviewTest && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onReviewTest(result.id)}
                    >
                      Review Test
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Question Sets */}
        <h2 className="text-2xl font-bold mb-4">Practice by Question Set</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionSets.map((set) => (
            <Card
              key={set.id}
              className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary/50"
              onClick={() => onSelectSet(set.id)}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{set.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{set.description}</p>
                  <div className="text-sm font-medium text-primary">
                    {set.count} Questions
                  </div>
                </div>
                <Button className="w-full mt-4" variant="default">
                  Start Practice
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
