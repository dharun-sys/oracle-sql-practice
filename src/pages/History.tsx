import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import * as auth from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatLocalDateTime } from "@/lib/utils";

type LogRow = {
  id: string;
  test_name: string;
  test_type: string;
  score: number | null;
  total_questions: number | null;
  percentage: number | null;
  questions_answered: number | null;
  student_name: string | null;
  register_no: string | null;
  taken_at: string | null;
};

export default function History() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setError("Not logged in");
          setLoading(false);
          return;
        }

        const sessionUserId = await auth.verifySessionToken(token);
        if (!sessionUserId) {
          setError("Invalid session");
          setLoading(false);
          return;
        }

        const user = await auth.findUserById(sessionUserId);
        if (!user) {
          setError("User not found");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("test_logs")
          .select("id,test_name,test_type,score,total_questions,percentage,questions_answered,student_name,register_no,taken_at")
          .eq("user_id", user.id)
          .order("taken_at", { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Test History</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <Card className="p-4">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Test</th>
                <th className="p-2">Type</th>
                <th className="p-2">Score</th>
                <th className="p-2">%</th>
                <th className="p-2">Answered</th>
                <th className="p-2">Register No</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2">{formatLocalDateTime(row.taken_at)}</td>
                  <td className="p-2">{row.test_name}</td>
                  <td className="p-2">{row.test_type}</td>
                  <td className="p-2">{row.score ?? "-"}/{row.total_questions ?? "-"}</td>
                  <td className="p-2">{row.percentage ?? "-"}</td>
                  <td className="p-2">{row.questions_answered ?? "-"}</td>
                  <td className="p-2">{row.register_no ?? "-"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => navigate(`/review/${row.id}`)}>Review</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
