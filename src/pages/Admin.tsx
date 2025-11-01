import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatLocalDateTime } from "@/lib/utils";

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
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
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

        // fetch 20 most recent submissions for admin quick view
        const { data: recentData, error: recentError } = await supabase
          .from("test_logs")
          .select("id, taken_at, test_name, register_no, student_name, score, percentage")
          .order("taken_at", { ascending: false })
          .limit(20);
        if (recentError) throw recentError;
        setRecentLogs(recentData || []);
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

  const downloadCsv = (filename: string, rows: string[]) => {
    const blob = new Blob([rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = async (testKey: string) => {
    setDownloadLoading(testKey);
    try {
      let query = supabase.from('test_logs').select('id, taken_at, test_name, register_no, student_name, score, total_questions, questions_answered, percentage');
      if (testKey === 'mock') {
        // mock tests: either test_type contains mock or test_name contains mock
        query = query.or("test_type.ilike.%mock%,test_name.ilike.%mock%");
      } else {
        const expected = setLabels[testKey] || testKey;
        // use ilike to match test_name loosely
        query = query.ilike('test_name', `%${expected}%`);
      }

      const { data, error } = await query.order('taken_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];

      // build a map of latest submission per register number (by taken_at desc)
      const latestByRegister: Record<string, any> = {};
      for (const r of rows) {
        const reg = (r.register_no ?? '') as string;
        if (!reg) continue;
        if (!latestByRegister[reg]) latestByRegister[reg] = r;
      }

      // determine display test name for users with no submission
      const expectedTestName = testKey === 'mock' ? 'Mock Test' : (setLabels[testKey] || testKey);

      // build CSV with requested columns in order and include all users
      // register number, name, test, score, total questions, total answered, percentage
      const header = ['Register No', 'Name', 'Test', 'Score', 'Total Questions', 'Total Answered', 'Percentage'];
      const csvRows: string[] = [];
      const esc = (v: any) => `"${String(v ?? 'NA').replace(/"/g, '""')}"`;
      csvRows.push(header.join(','));

      // ensure we include all users; if users list is empty, fall back to rows list
      const iterate = (users.length > 0) ? users : rows.map((r: any) => ({ register_no: r.register_no, student_name: r.student_name }));

      for (const u of iterate) {
        const reg = (u.register_no ?? '') as string;
        const userName = u.student_name ?? null;
        const log = (reg && latestByRegister[reg]) ? latestByRegister[reg] : null;

        const testName = log ? (log.test_name ?? expectedTestName) : expectedTestName;
        const score = log ? (log.score ?? 'NA') : 'NA';
        const totalQ = log ? (log.total_questions ?? 'NA') : 'NA';
        const answered = log ? (log.questions_answered ?? 'NA') : 'NA';
        const pct = log ? (log.percentage ?? 'NA') : 'NA';

        const line = [
          reg || 'NA',
          userName ?? 'NA',
          testName ?? 'NA',
          score,
          totalQ,
          answered,
          pct,
        ].map(esc).join(',');
        csvRows.push(line);
      }

      const filename = `submissions_${testKey}_${new Date().toISOString()}.csv`;
      downloadCsv(filename, csvRows);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleSearch = async () => {
    const q = (searchQuery || "").trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const { data, error } = await supabase
        .from("test_logs")
        .select("id, taken_at, test_name, register_no, student_name, score, percentage")
        .eq("register_no", q)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err: any) {
      setSearchResults([]);
      setError(err?.message || String(err));
    } finally {
      setSearchLoading(false);
    }
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
        {/* Recent submissions */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Recent submissions</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search by register number"
                className="border rounded px-2 py-1"
              />
              <Button size="sm" onClick={() => handleSearch()} disabled={searchLoading || !searchQuery}>Search</Button>
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setSearchResults(null); }}>Reset</Button>
            </div>
          </div>

          {searchLoading ? (
            <Card className="p-4">Searching...</Card>
          ) : (
            <Card className="p-4">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Test</th>
                    <th className="p-2">Register No</th>
                    <th className="p-2">Student</th>
                    <th className="p-2">Score</th>
                    <th className="p-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {(searchResults ?? recentLogs).length === 0 ? (
                    <tr><td className="p-4" colSpan={6}>No submissions yet.</td></tr>
                  ) : (
                    (searchResults ?? recentLogs).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2">{formatLocalDateTime(r.taken_at)}</td>
                        <td className="p-2">{r.test_name}</td>
                        <td className="p-2">{r.register_no ?? "-"}</td>
                        <td className="p-2">{r.student_name ?? "-"}</td>
                        <td className="p-2">{r.score ?? "-"}</td>
                        <td className="p-2">{r.percentage ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </div>
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
          <Button size="sm" variant="outline" onClick={() => selectedTest && handleDownloadCsv(selectedTest)} disabled={downloadLoading === selectedTest}>
            {downloadLoading === selectedTest ? 'Downloading...' : 'Download CSV'}
          </Button>
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
      {/* Recent submissions (20 most recent) */}
      
    </div>
  );
}
