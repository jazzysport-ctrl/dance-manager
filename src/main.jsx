import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { createFamily, findFamilyByEmail } from "./store";
import App from "./App";

const FONT = "'Zen Maru Gothic', sans-serif";

function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState(null); // "create" | "join"

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if manual select mode
        const manualSelect = sessionStorage.getItem("dance-manual-select");
        if (manualSelect) {
          setLoading(false);
          return;
        }
        // Check localStorage first
        const stored = localStorage.getItem("dance-family-" + u.uid);
        if (stored) {
          setFamilyId(stored);
          setLoading(false);
        } else {
          // Search Firestore for existing family
          try {
            const found = await findFamilyByEmail(u.email);
            if (found) {
              localStorage.setItem("dance-family-" + u.uid, found);
              setFamilyId(found);
            }
          } catch (e) {
            console.error("Family search error:", e);
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Login error:", e);
    }
  };

  const [creating, setCreating] = useState(false);

  const handleCreateFamily = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = "fam-" + Date.now().toString(36);
      await createFamily(id, user.email);
      localStorage.setItem("dance-family-" + user.uid, id);
      sessionStorage.removeItem("dance-manual-select");
      setFamilyId(id);
    } catch (e) {
      console.error("Family creation error:", e);
      alert("ファミリー作成に失敗しました。Firestoreのセキュリティルールを確認してください。");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) return;
    try {
      await createFamily(joinCode.trim(), user.email);
      localStorage.setItem("dance-family-" + user.uid, joinCode.trim());
      sessionStorage.removeItem("dance-manual-select");
      setFamilyId(joinCode.trim());
    } catch (e) {
      alert("ファミリーIDが見つかりません。正しいIDを入力してください。");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setFamilyId(null);
    setMode(null);
  };

  const handleLeaveFamily = () => {
    if (confirm("別のファミリーに切り替えますか？")) {
      localStorage.removeItem("dance-family-" + user.uid);
      sessionStorage.setItem("dance-manual-select", "true");
      setFamilyId(null);
      setMode(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "spin 2s linear infinite" }}>💃</div>
          <p style={{ color: "#6366f1", fontWeight: 600 }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#faf5ff,#eff6ff,#f0fdf4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💃🕺</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1e293b", marginBottom: 8 }}>ダンス大会マネージャー</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 32 }}>家族で大会スケジュール・成績を共有管理</p>
          <button onClick={handleLogin} style={{
            display: "flex", alignItems: "center", gap: 10, margin: "0 auto",
            padding: "14px 32px", borderRadius: 14, border: "2px solid #e2e8f0",
            background: "#fff", cursor: "pointer", fontFamily: FONT,
            fontSize: 15, fontWeight: 700, color: "#1e293b",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  // Logged in but no family selected
  if (!familyId) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#faf5ff,#eff6ff,#f0fdf4)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ textAlign: "center", padding: 32, maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>ようこそ、{user.displayName}さん</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>ファミリーを作成するか、既存のファミリーに参加してください</p>

          {!mode && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => setMode("create")} style={{
                padding: "14px 24px", borderRadius: 14, border: "none", fontFamily: FONT,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
              }}>
                ✨ 新しいファミリーを作成
              </button>
              <button onClick={() => setMode("join")} style={{
                padding: "14px 24px", borderRadius: 14, border: "2px solid #e2e8f0",
                background: "#fff", color: "#475569", fontFamily: FONT,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
              }}>
                🔗 ファミリーIDで参加
              </button>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: FONT, marginTop: 8 }}>
                ログアウト
              </button>
            </div>
          )}

          {mode === "create" && (
            <div>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
                新しいファミリーを作成します。作成後にファミリーIDを家族に共有してください。
              </p>
              <button onClick={handleCreateFamily} disabled={creating} style={{
                padding: "14px 32px", borderRadius: 14, border: "none", fontFamily: FONT,
                background: creating ? "#cbd5e1" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
                fontSize: 15, fontWeight: 700, cursor: creating ? "default" : "pointer", marginBottom: 12,
                boxShadow: creating ? "none" : "0 4px 12px rgba(99,102,241,0.3)",
              }}>
                {creating ? "作成中..." : "作成する"}
              </button>
              <br />
              <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                ← 戻る
              </button>
            </div>
          )}

          {mode === "join" && (
            <div>
              <p style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>
                家族から共有されたファミリーIDを入力してください。
              </p>
              <input
                value={joinCode} onChange={e => setJoinCode(e.target.value)}
                placeholder="ファミリーID（例: fam-m1abc2d）"
                style={{ width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 12, fontSize: 14, outline: "none", fontFamily: FONT, marginBottom: 12, boxSizing: "border-box" }}
              />
              <button onClick={handleJoinFamily} disabled={!joinCode.trim()} style={{
                padding: "12px 32px", borderRadius: 14, border: "none", fontFamily: FONT,
                background: joinCode.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#cbd5e1",
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: joinCode.trim() ? "pointer" : "default", marginBottom: 12,
              }}>
                参加する
              </button>
              <br />
              <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                ← 戻る
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Logged in and has family
  return <App user={user} familyId={familyId} onLogout={handleLogout} onLeaveFamily={handleLeaveFamily} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthWrapper />
  </React.StrictMode>
);
