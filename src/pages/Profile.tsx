import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import * as auth from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StatRow = {
  key: string;
  name: string;
  attempts: number;
  bestPercentage: number | null;
};

export default function Profile() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [registerNoState, setRegisterNoState] = useState<string | null>(null);

  // Define the 7 tests we want to show. `dbName` should match what `Quiz.tsx` inserts into test_logs
  const tests = [
    { key: "mock", displayName: "Mock Test" },
    { key: "questions", displayName: "Question Set 1", dbName: "Practice Set 1" },
    { key: "questions1", displayName: "Question Set 2", dbName: "Practice Set 2" },
    { key: "questions2", displayName: "Question Set 3", dbName: "Practice Set 3" },
    { key: "questions3", displayName: "Question Set 4", dbName: "Practice Set 4" },
    { key: "questions4", displayName: "Question Set 5", dbName: "Practice Set 5" },
    { key: "questions6", displayName: "Question Set 6", dbName: "Practice Set 6" },
  ];

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const authRaw = localStorage.getItem("auth_user");
        if (!authRaw) throw new Error("Not logged in");
        const authObj = JSON.parse(authRaw);
        const registerNo = authObj?.register_no;
        if (!registerNo) throw new Error("Missing register number in auth_user");

        const user = await auth.findUserByRegister(registerNo);
        if (!user) throw new Error("User not found");

        // fetch all logs for this user
        const { data, error } = await supabase
          .from("test_logs")
          .select("id,test_name,test_type,score,total_questions,percentage,questions_answered,taken_at")
          .eq("user_id", user.id);

        if (error) throw error;

        const logs = data || [];

        // Save display info from auth/user for header display
        setStudentName(user.student_name ?? null);
        setRegisterNoState(user.register_no ?? registerNo ?? null);

        const setLabels: Record<string, string> = {
          questions: "Practice Set 1",
          questions1: "Practice Set 2",
          questions2: "Practice Set 3",
          questions3: "Practice Set 4",
          questions4: "Practice Set 5",
          questions6: "Practice Set 6",
        };

        const computed: StatRow[] = tests.map((t) => {
          const entries = logs.filter((l: any) => {
            if (t.key === "mock") {
              return (l.test_type && String(l.test_type).toLowerCase() === "mock") || (l.test_name && /mock/i.test(String(l.test_name)));
            }
            const expected = (t as any).dbName ?? setLabels[t.key] ?? t.displayName;
            if (!l.test_name) return false;
            const ln = String(l.test_name).trim().toLowerCase();
            const en = String(expected).trim().toLowerCase();
            return ln === en || ln.includes(en) || en.includes(ln);
          });

          let best: number | null = null;
          for (const e of entries) {
            const pct = e.percentage ?? (e.score != null && e.total_questions ? Math.round((e.score / e.total_questions) * 100) : null);
            if (pct != null) {
              if (best == null || pct > best) best = pct;
            }
          }

          return {
            key: t.key,
            name: t.displayName,
            attempts: entries.length,
            bestPercentage: best,
          };
        });

        setStats(computed);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <div className="text-sm text-muted-foreground">
            {studentName ? studentName : "-"} {registerNoState ? `(ID: ${registerNoState})` : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/home")}>Home</Button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <Card className="p-4">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="p-2">Test</th>
                <th className="p-2">Attempts</th>
                <th className="p-2">Best Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.key} className="border-t">
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">{s.attempts > 0 ? s.attempts : "-"}</td>
                  <td className="p-2">{s.bestPercentage != null ? `${s.bestPercentage}%` : "Test not taken yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
