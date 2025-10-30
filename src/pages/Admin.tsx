import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UserRow = {
  id: string;
  register_no: string | null;
  student_name: string | null;
};

export default function Admin() {
  const [tests] = useState(() => [
    { key: "mock", displayName: "Mock Test" },
    { key: "questions", displayName: "Practice Set 1", dbName: "Practice Set 1" },
    { key: "questions1", displayName: "Practice Set 2", dbName: "Practice Set 2" },
    { key: "questions2", displayName: "Practice Set 3", dbName: "Practice Set 3" },
    { key: "questions3", displayName: "Practice Set 4", dbName: "Practice Set 4" },
    { key: "questions4", displayName: "Practice Set 5", dbName: "Practice Set 5" },
    { key: "questions6", displayName: "Practice Set 6", dbName: "Practice Set 6" },
  ]);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id,register_no,student_name");
        if (usersError) throw usersError;
        setUsers(usersData || []);

        const { data: logsData, error: logsError } = await supabase
          .from("test_logs")
          .select("id,user_id,register_no,test_name,test_type,score,total_questions,percentage,taken_at");
        if (logsError) throw logsError;
        setLogs(logsData || []);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setLabels: Record<string, string> = {
    questions: "Practice Set 1",
    questions1: "Practice Set 2",
    questions2: "Practice Set 3",
    questions3: "Practice Set 4",
    questions4: "Practice Set 5",
    questions6: "Practice Set 6",
  };

  const matchLogToTest = (l: any, testKey: string) => {
    if (testKey === "mock") {
      return (l.test_type && String(l.test_type).toLowerCase() === "mock") || (l.test_name && /mock/i.test(String(l.test_name)));
    }
    const expected = setLabels[testKey] || testKey;
    if (!l.test_name) return false;
    const ln = String(l.test_name).trim().toLowerCase();
    const en = String(expected).trim().toLowerCase();
    return ln === en || ln.includes(en) || en.includes(ln);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  if (!selectedTest) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin — Tests</h1>
        <Card className="p-4">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="p-2">Test</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.key} className="border-t">
                  <td className="p-2">{t.displayName}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setSelectedTest(t.key)}>View users</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // Selected test view: show all users and their attempts/best
  const rows = users.map((u) => {
    const entries = logs.filter((l) => l.user_id === u.id && matchLogToTest(l, selectedTest));
    let best: number | null = null;
    for (const e of entries) {
      const pct = e.percentage ?? (e.score != null && e.total_questions ? Math.round((e.score / e.total_questions) * 100) : null);
      if (pct != null) {
        if (best == null || pct > best) best = pct;
      }
    }
    return {
      id: u.id,
      register_no: u.register_no,
      student_name: u.student_name,
      attempts: entries.length,
      bestPercentage: best,
    };
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin — {tests.find(t => t.key === selectedTest)?.displayName}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedTest(null)}>Back</Button>
        </div>
      </div>

      <Card className="p-4">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Register No</th>
              <th className="p-2">Attempts</th>
              <th className="p-2">Best Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.student_name ?? "-"}</td>
                <td className="p-2">{r.register_no ?? "-"}</td>
                <td className="p-2">{r.attempts > 0 ? r.attempts : "Test not taken yet"}</td>
                <td className="p-2">{r.bestPercentage != null ? `${r.bestPercentage}%` : "Test not taken yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
