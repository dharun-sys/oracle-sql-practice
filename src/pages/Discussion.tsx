import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import * as auth from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";

interface DiscussionRow {
  id: string;
  user_id: string | null;
  username: string;
  title: string;
  body: string;
  category: string;
  question_id?: string | null;
  created_at: string;
}

interface ReplyRow {
  id: string;
  discussion_id: string;
  user_id: string | null;
  username: string;
  body: string;
  parent_reply_id?: string | null;
  created_at: string;
}

interface ReplyRowTree extends ReplyRow {
  children: ReplyRowTree[];
}

export default function Discussion() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<DiscussionRow[]>([]);
  const [repliesByDiscussion, setRepliesByDiscussion] = useState<Record<string, ReplyRowTree[]>>({});
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [questionId, setQuestionId] = useState<string>("");

  const authRaw = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const authUser = authRaw ? JSON.parse(authRaw) : null;
  // We'll resolve server-authoritative user id and username via the session token
  const [currentUserUuid, setCurrentUserUuid] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>(authUser?.student_name || authUser?.register_no || "Anonymous");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const sessionUserId = await auth.verifySessionToken(token);
        if (!sessionUserId) return;
        const user = await auth.findUserById(sessionUserId);
        if (mounted && user && user.id) {
          setCurrentUserUuid(user.id);
          setCurrentUsername(user.student_name || user.register_no || "Anonymous");
        }
      } catch (e) {
        console.warn("Failed to resolve current user UUID for discussions:", e);
      }
    })();
    return () => { mounted = false; };
  }, [authUser]);

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("discussions")
        .select("id, user_id, username, title, body, category, question_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDiscussions(data || []);

      // fetch replies for the returned discussions
      const ids = (data || []).map((d: any) => d.id);
      if (ids.length > 0) {
        const { data: rdata, error: rerr } = await supabase
          .from("discussion_replies")
          .select("id, discussion_id, user_id, username, body, parent_reply_id, created_at")
          .in("discussion_id", ids)
          .order("created_at", { ascending: true });
        if (rerr) throw rerr;

        const byDiscussionFlat: Record<string, ReplyRow[]> = {};
        (rdata || []).forEach((r: any) => {
          byDiscussionFlat[r.discussion_id] = byDiscussionFlat[r.discussion_id] || [];
          byDiscussionFlat[r.discussion_id].push(r);
        });

        // Build tree per discussion
        const byDiscussionTree: Record<string, ReplyRowTree[]> = {};
        for (const [did, flat] of Object.entries(byDiscussionFlat)) {
          byDiscussionTree[did] = buildReplyTree(flat as ReplyRow[]);
        }

        setRepliesByDiscussion(byDiscussionTree);
      } else {
        setRepliesByDiscussion({});
      }
    } catch (err) {
      console.error("Failed to load discussions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Please provide a title and body for the discussion.");
      return;
    }

    try {
      const payload = {
        // user_id should be the UUID (users.id). We resolved it to currentUserUuid above.
        user_id: currentUserUuid,
        username: currentUsername,
        title: title.trim(),
        body: body.trim(),
        category,
        // question_id used to be numeric; column is now text (e.g. "ps1q02") so store raw trimmed string
        question_id: questionId ? questionId.trim() : null,
      } as any;

      const { data, error } = await supabase.from("discussions").insert(payload).select();
      if (error) throw error;
      setTitle("");
      setBody("");
      setQuestionId("");
      setCategory("general");
      // refresh
      await fetchDiscussions();
    } catch (err) {
      console.error("Failed to create discussion:", err);
      alert("Failed to create discussion. Check console for details.");
    }
  };

  const handleCreateReply = async (discussionId: string, replyBody: string, parentReplyId?: string | null) => {
    if (!replyBody || !replyBody.trim()) return;
    try {
      const payload = {
        discussion_id: discussionId,
        user_id: currentUserUuid,
        username: currentUsername,
        body: replyBody.trim(),
        parent_reply_id: parentReplyId || null,
      } as any;
      const { data, error } = await supabase.from("discussion_replies").insert(payload).select();
      if (error) throw error;
      // refresh replies for this discussion
      await fetchDiscussions();
    } catch (err) {
      console.error("Failed to submit reply:", err);
      alert("Failed to submit reply. Check console for details.");
    }
  };

  // compute visible discussions based on filters/search
  const visibleDiscussions = discussions.filter(d => {
    const q = searchQuery.trim().toLowerCase();
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    const matchesQuery = q === '' || ((d.title || '') + ' ' + (d.body || '')).toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Discussions</h1>
        <Button onClick={() => navigate('/home')}>Back</Button>
      </div>

      <Card className="p-4 mb-6">
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Describe your issue or start a discussion" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex gap-2 items-center">
            <label className="text-sm">Category:</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-2 py-1 border rounded">
              <option value="general">General</option>
              <option value="mock">Mock Test</option>
              <option value="practice1">Practice Set 1</option>
              <option value="practice2">Practice Set 2</option>
              <option value="practice3">Practice Set 3</option>
              <option value="practice4">Practice Set 4</option>
              <option value="practice5">Practice Set 5</option>
              <option value="practice6">Practice Set 6</option>
              <option value="question">Question-specific</option>
            </select>
            {category === 'question' && (
              <Input placeholder="Question ID (optional)" value={questionId} onChange={(e) => setQuestionId(e.target.value)} />
            )}
            <Button onClick={handleCreateDiscussion}>Start Discussion</Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {/* Filters toolbar */}
        <div className="flex items-center gap-2 mb-2">
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-2 py-1 border rounded">
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="mock">Mock Test</option>
            <option value="practice1">Practice Set 1</option>
            <option value="practice2">Practice Set 2</option>
            <option value="practice3">Practice Set 3</option>
            <option value="practice4">Practice Set 4</option>
            <option value="practice5">Practice Set 5</option>
            <option value="practice6">Practice Set 6</option>
            <option value="question">Question-specific</option>
          </select>
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search title or body" />
          <Button onClick={() => { setFilterCategory('all'); setSearchQuery(''); }}>Reset</Button>
        </div>
        {loading && <div>Loading...</div>}
        {!loading && discussions.length === 0 && <div>No discussions yet. Be the first to start one.</div>}

        {/** Apply client-side filtering/search */}
        {!loading && visibleDiscussions.map((d) => (
          <Card key={d.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">{d.username}</div>
              <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
            </div>
            <h3 className="font-semibold text-lg">{d.title}</h3>

            {/* show category and question id when present */}
            <div className="flex items-center gap-3 mt-2">
              <div className="text-xs px-2 py-1 rounded bg-muted/30 text-muted-foreground">{d.category}</div>
              {d.question_id !== null && d.question_id !== undefined && (
                <div className="text-xs text-muted-foreground">Question ID: <span className="font-medium">{d.question_id}</span></div>
              )}
            </div>

            <div className="text-sm mt-2 mb-3 whitespace-pre-wrap">{d.body}</div>

            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Replies</div>
              {(repliesByDiscussion[d.id] || []).map((r) => (
                <ReplyTreeNode key={r.id} node={r} onReply={(text, parentId) => handleCreateReply(d.id, text, parentId)} />
              ))}

              <ReplyBox onSubmit={(reply) => handleCreateReply(d.id, reply)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReplyBox({ onSubmit, placeholder }: { onSubmit: (text: string) => void, placeholder?: string }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder || "Add a reply"} />
      <Button onClick={() => { onSubmit(text); setText(""); }}>Reply</Button>
    </div>
  );
}

function ReplyTreeNode({ node, onReply }: { node: ReplyRowTree, onReply: (text: string, parentId?: string) => void }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  return (
    <div className="mb-2">
      <div className="border rounded p-2">
        <div className="text-xs text-muted-foreground">{node.username} • {new Date(node.created_at).toLocaleString()}</div>
        <div className="text-sm mt-1">{node.body}</div>
        <div className="mt-2">
          <button className="text-sm text-primary mr-2" onClick={() => setShowReplyBox(s => !s)}>{showReplyBox ? 'Cancel' : 'Reply'}</button>
        </div>
        {showReplyBox && (
          <div className="mt-2">
            <ReplyBox placeholder={`Reply to ${node.username}`} onSubmit={(text) => { onReply(text, node.id); setShowReplyBox(false); }} />
          </div>
        )}
      </div>

      {/* Render children */}
      {node.children && node.children.length > 0 && (
        <div className="ml-6 pl-4 border-l border-border mt-2">
          {node.children.map((child) => (
            <ReplyTreeNode key={child.id} node={child} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

function buildReplyTree(flatReplies: ReplyRow[]): ReplyRowTree[] {
  const map = new Map<string, ReplyRowTree>();
  flatReplies.forEach(r => {
    map.set(r.id, { ...r, children: [] });
  });

  const roots: ReplyRowTree[] = [];
  map.forEach(node => {
    if (node.parent_reply_id) {
      const parent = map.get(node.parent_reply_id);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });

  // Optionally sort children by created_at
  const sortRecursively = (nodes: ReplyRowTree[]) => {
    nodes.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    nodes.forEach(n => sortRecursively(n.children));
  };
  sortRecursively(roots);

  return roots;
}
