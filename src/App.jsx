import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  onFamilyData, onCompetitions, onHistory, updateFamily,
  addCompetition, updateCompetition, deleteCompetition,
  addHistory, updateHistoryEntry, deleteHistoryEntry,
} from "./store";

const PACKING = {
  "衣装・シューズ": [
    ["ラテンシューズ", true], ["スタンダードシューズ", true],
    ["ラテン衣装", true], ["スタンダード衣装", true],
    ["練習着（予備）", false], ["タイツ/ストッキング（予備も）", false],
  ],
  "身だしなみ": [
    ["ヘアスプレー/ジェル", true], ["ヘアピン/ゴム", true],
    ["メイク道具", false], ["鏡", false], ["制汗剤", false],
  ],
  "男性向け": [
    ["ネクタイ/蝶ネクタイ", false], ["靴下（黒）", false],
    ["カフスボタン", false], ["ベルト", false], ["アンダーシャツ", false],
  ],
  "女性向け": [
    ["つけまつげ/まつげのり", false], ["ボディファンデーション", false],
    ["ヘアネット/シニヨンネット", false], ["ヌーブラ/ボディテープ", false],
    ["アクセサリー（イヤリング等）", false], ["生理用品", false],
  ],
  "必需品": [
    ["ゼッケン（背番号）", true], ["参加証/エントリー確認書", true],
    ["保険証コピー", true], ["お金", true], ["スマホ/充電器", true],
  ],
  "あると便利": [
    ["お弁当/おやつ", false], ["飲み物", false], ["タオル", false],
    ["安全ピン", false], ["絆創膏", false], ["レジャーシート", false], ["上履き/スリッパ", false],
  ],
};

const SECTIONS = {
  "ラテン": ["チャチャチャ", "サンバ", "ルンバ", "パソドブレ", "ジャイブ"],
  "スタンダード": ["ワルツ", "タンゴ", "スローフォックストロット", "クイックステップ", "ヴェニーズワルツ"],
};

const RESULTS = [
  "優勝🥇", "準優勝🥈", "3位🥉", "4位", "5位", "6位",
  "決勝進出", "準決勝進出", "2次予選進出", "予選敗退",
];

const CLASSES = [
  "D級", "C級", "B級", "A級", "SA級",
  "1級", "2級", "3級", "4級", "5級", "6級",
  "オープン", "ノービス",
];

const SCORES = {
  "優勝🥇": 10, "準優勝🥈": 8, "3位🥉": 7,
  "4位": 6, "5位": 5, "6位": 4,
  "決勝進出": 3, "準決勝進出": 2, "2次予選進出": 1, "予選敗退": 0,
};

const COLORS = ["#8b5cf6", "#ec4899", "#d4af37", "#10b981", "#ef4444"];
const EMOJIS = ["👧", "👦", "💃", "🕺", "⭐"];
const FONT = "'Zen Maru Gothic', sans-serif";
const GOLD = "#d4af37";
const DARK_PURPLE = "#1e1b4b";
const ELEGANT_GRADIENT = "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)";

// iCalendar export helper
function exportToCalendar(comp) {
  const formatDate = (dateStr) => dateStr.replace(/-/g, '');
  const startDate = formatDate(comp.date);
  const endDate = startDate; // Same day event

  const description = [
    comp.venue ? `会場: ${comp.venue}` : '',
    comp.compClass ? `クラス: ${comp.compClass}` : '',
    comp.notes ? `メモ: ${comp.notes}` : '',
    (comp.childEntries || []).map(ce =>
      ce.sections?.length ? `${ce.child}: ${ce.sections.map(s => s.section).join('・')}` : ''
    ).filter(Boolean).join('\\n'),
  ].filter(Boolean).join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dance Manager//JP',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${comp.name}`,
    comp.venue ? `LOCATION:${comp.venue}` : '',
    `DESCRIPTION:${description}`,
    `UID:${comp.id}@dance-manager`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${comp.name}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



// Small components
function Countdown({ date }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.ceil((new Date(date + "T00:00:00") - now) / 86400000);
  if (diff < 0) return <span style={{ color: "#94a3b8", fontSize: 13 }}>終了</span>;
  if (diff === 0) return <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 15, animation: "pulse 1.5s infinite" }}>🔴 今日！</span>;
  if (diff <= 3) return <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 15 }}>{"⚡ あと" + diff + "日"}</span>;
  if (diff <= 7) return <span style={{ color: "#3b82f6", fontWeight: 600, fontSize: 14 }}>{"あと" + diff + "日"}</span>;
  return <span style={{ color: "#64748b", fontSize: 13 }}>{"あと" + diff + "日"}</span>;
}

function TabBtn({ active, onClick, children, icon }) {
  return (
    <button onClick={onClick} style={{
      padding: "12px 14px", border: "none", whiteSpace: "nowrap",
      borderBottom: active ? `3px solid ${GOLD}` : "3px solid transparent",
      background: active ? "rgba(212,175,55,0.1)" : "transparent",
      color: active ? DARK_PURPLE : "#64748b",
      fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
      fontFamily: FONT, display: "flex", alignItems: "center", gap: 4,
      transition: "all 0.2s ease",
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>{children}
    </button>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(30,27,75,0.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(180deg, #ffffff 0%, #faf9ff 100%)", borderRadius: 24, padding: "24px 20px",
        maxWidth: 500, width: "100%", maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 25px 60px rgba(30,27,75,0.25)",
        border: `2px solid ${GOLD}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: DARK_PURPLE, fontFamily: FONT, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: GOLD }}>✦</span> {title}
          </h3>
          <button onClick={onClose} style={{
            background: DARK_PURPLE, border: "none", borderRadius: "50%",
            width: 32, height: 32, fontSize: 13, cursor: "pointer", color: GOLD,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type, placeholder, required }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: FONT }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type || "text"} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 11px", border: "2px solid #e2e8f0",
          borderRadius: 10, fontSize: 14, outline: "none",
          boxSizing: "border-box", fontFamily: FONT,
        }}
      />
    </div>
  );
}

function PrimaryBtn({ onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: "none", borderRadius: 12, padding: "12px 26px",
      fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
      cursor: disabled ? "default" : "pointer", fontFamily: FONT,
      background: disabled ? "#cbd5e1" : `linear-gradient(135deg, ${DARK_PURPLE}, #4c1d95)`,
      color: disabled ? "#94a3b8" : GOLD,
      boxShadow: disabled ? "none" : "0 4px 15px rgba(30,27,75,0.4)",
      border: disabled ? "none" : `1px solid ${GOLD}`,
      transition: "all 0.2s ease",
    }}>
      {children}
    </button>
  );
}

function SectionPicker({ sections, onChange, accent }) {
  const color = accent || "#6366f1";
  return (
    <div style={{ marginBottom: 12 }}>
      {Object.entries(SECTIONS).map(([sec, dances]) => {
        const found = sections.find(s => s.section === sec);
        const active = !!found;
        return (
          <div key={sec} style={{
            marginBottom: 8, padding: 9, borderRadius: 11,
            border: "2px solid " + (active ? color : "#e2e8f0"),
            background: active ? (color === "#f59e0b" ? "#fffbeb" : "#fafaff") : "#fff",
          }}>
            <div
              onClick={() => {
                if (active) onChange(sections.filter(s => s.section !== sec));
                else onChange([...sections, { section: sec, dances: [] }]);
              }}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: active ? 7 : 0 }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                border: active ? "none" : "2px solid #cbd5e1",
                background: active
                  ? (sec === "ラテン" ? "linear-gradient(135deg,#f97316,#ef4444)" : "linear-gradient(135deg,#6366f1,#8b5cf6)")
                  : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 11, fontWeight: 700,
              }}>
                {active && "✓"}
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: active ? "#1e293b" : "#94a3b8" }}>
                {sec === "ラテン" ? "🔥" : "✨"} {sec}
              </span>
            </div>
            {active && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 24 }}>
                {dances.map(d => {
                  const sel = found.dances.includes(d);
                  return (
                    <button key={d} onClick={() => {
                      const nd = sel ? found.dances.filter(x => x !== d) : [...found.dances, d];
                      onChange(sections.map(s => s.section === sec ? { ...s, dances: nd } : s));
                    }} style={{
                      padding: "3px 9px", borderRadius: 16, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: FONT,
                      border: "2px solid " + (sel ? color : "#e2e8f0"),
                      background: sel ? color : "#fff",
                      color: sel ? "#fff" : "#64748b",
                    }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClassPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: FONT }}>
        クラス / 級
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {CLASSES.map(c => (
          <button key={c} onClick={() => onChange(value === c ? "" : c)} style={{
            padding: "4px 10px", borderRadius: 16, fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: FONT,
            border: "2px solid " + (value === c ? "#f59e0b" : "#e2e8f0"),
            background: value === c ? "#f59e0b" : "#fff",
            color: value === c ? "#fff" : "#64748b",
          }}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function App({ user, familyId, onLogout, onLeaveFamily }) {
  const [tab, setTab] = useState("schedule");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [selChild, setSelChild] = useState(null);
  const [selCL, setSelCL] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (!familyId) return;
    const unsubs = [];
    // Listen to family data (children, checked)
    unsubs.push(onFamilyData(familyId, (famData) => {
      setData(prev => ({
        ...(prev || { children: [], competitions: [], history: [], checked: {} }),
        children: famData?.children || [],
        checked: famData?.checked || {},
      }));
      setLoading(false);
    }));
    // Listen to competitions
    unsubs.push(onCompetitions(familyId, (comps) => {
      setData(prev => prev ? { ...prev, competitions: comps } : prev);
    }));
    // Listen to history
    unsubs.push(onHistory(familyId, (hist) => {
      setData(prev => prev ? { ...prev, history: hist } : prev);
    }));
    return () => unsubs.forEach(u => u());
  }, [familyId]);

  // Children
  const addChild = async (n) => {
    if (!n || !n.trim() || data.children.includes(n.trim())) return;
    await updateFamily(familyId, { children: [...data.children, n.trim()] });
  };
  const removeChild = async (n) => {
    await updateFamily(familyId, { children: data.children.filter(c => c !== n) });
    if (selChild === n) setSelChild(null);
  };

  // Competitions
  const saveComp = async (comp, isEdit) => {
    if (isEdit) {
      await updateCompetition(familyId, comp.id, comp);
    } else {
      await addCompetition(familyId, comp);
    }
  };
  const delComp = async (id) => {
    const nc = { ...data.checked };
    Object.keys(nc).forEach(k => { if (k.startsWith(id + ":")) delete nc[k]; });
    await updateFamily(familyId, { checked: nc });
    await deleteCompetition(familyId, id);
  };

  // History
  const saveHist = async (entry, isEdit) => {
    if (isEdit) {
      await updateHistoryEntry(familyId, entry.id, entry);
    } else {
      const { id, ...rest } = entry;
      await addHistory(familyId, rest);
    }
  };
  const delHist = async (id) => {
    await deleteHistoryEntry(familyId, id);
  };
  const moveToHist = (comp) => {
    openHistModal({
      name: comp.name, date: comp.date, venue: comp.venue,
      compClass: comp.compClass || "",
      childEntries: (comp.childEntries || []).map(ce => ({ ...ce, results: {}, memo: "" })),
      photos: [],
    });
    delComp(comp.id);
  };

  // Checklist
  const toggleCheck = async (cid, cat, item) => {
    const k = cid + ":" + cat + ":" + item;
    const nc = { ...data.checked, [k]: !data.checked[k] };
    await updateFamily(familyId, { checked: nc });
  };
  const getProg = (cid) => {
    const all = Object.entries(PACKING).flatMap(([c, items]) => items.map(i => cid + ":" + c + ":" + i[0]));
    return { done: all.filter(k => data.checked[k]).length, total: all.length };
  };

  // Open modals
  const openCompModal = (comp) => {
    setForm(comp || {
      name: "", date: "", venue: "", notes: "", compClass: "",
      entryStartDate: "", entryDeadline: "", entryDone: false, bibNumber: "",
      childEntries: data.children.map(c => ({ child: c, sections: [] })),
    });
    setModal({ type: "comp", editing: !!comp });
  };
  const openHistModal = (entry) => {
    setForm(entry || {
      name: "", date: "", venue: "", compClass: "",
      childEntries: data.children.map(c => ({ child: c, sections: [], results: {}, memo: "" })),
      photos: [],
    });
    setModal({ type: "hist", editing: !!(entry && entry.id) });
  };

  // Derived data
  const upcoming = data ? data.competitions.filter(c => new Date(c.date + "T23:59:59") >= new Date()) : [];
  const past = data ? data.competitions.filter(c => new Date(c.date + "T23:59:59") < new Date()) : [];

  const yearStats = useMemo(() => {
    if (!data) return [];
    const by = {};
    data.history.forEach(h => {
      const y = (h.date || "").slice(0, 4);
      if (!y) return;
      if (!by[y]) by[y] = { year: y, count: 0, best: 0, medals: 0 };
      by[y].count++;
      (h.childEntries || []).forEach(ce => {
        Object.values(ce.results || {}).forEach(r => {
          const sc = SCORES[r] || 0;
          if (sc > by[y].best) by[y].best = sc;
          if (r && (r.includes("🥇") || r.includes("🥈") || r.includes("🥉"))) by[y].medals++;
        });
      });
    });
    return Object.values(by).sort((a, b) => a.year.localeCompare(b.year));
  }, [data]);

  const totalMedals = useMemo(() => {
    if (!data) return {};
    const m = { "🥇": 0, "🥈": 0, "🥉": 0 };
    data.history.forEach(h => (h.childEntries || []).forEach(ce => {
      Object.values(ce.results || {}).forEach(r => {
        if (r && r.includes("🥇")) m["🥇"]++;
        if (r && r.includes("🥈")) m["🥈"]++;
        if (r && r.includes("🥉")) m["🥉"]++;
      });
    }));
    return m;
  }, [data]);

  // Photo upload
  const handlePhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        const M = 400;
        if (w > M || h > M) {
          const r = Math.min(M / w, M / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setForm(prev => ({ ...prev, photos: [...(prev.photos || []), dataUrl] }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (loading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "spin 2s linear infinite" }}>💃</div>
          <p style={{ color: "#6366f1", fontWeight: 600 }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  // Helper: update child entry in form
  const updateFormCE = (child, updates) => {
    const entries = [...(form.childEntries || [])];
    const idx = entries.findIndex(e => e.child === child);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], ...updates };
    } else {
      entries.push({ child, sections: [], results: {}, memo: "", ...updates });
    }
    setForm({ ...form, childEntries: entries });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #faf5ff 0%, #f5f3ff 40%, #ede9fe 100%)", fontFamily: FONT }}>
      <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
      `}</style>

      {/* HEADER */}
      <div style={{ background: ELEGANT_GRADIENT, padding: "28px 16px 18px", color: "#fff", textAlign: "center", position: "relative", overflow: "hidden", borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ position: "absolute", top: -30, right: -30, fontSize: 120, opacity: 0.06, transform: "rotate(-15deg)" }}>💃🕺</div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"1\" fill=\"%23d4af37\" opacity=\"0.3\"/></svg>')", backgroundSize: "30px 30px", opacity: 0.4 }}></div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: 1, textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
          <span style={{ color: GOLD }}>✦</span> Dance Manager <span style={{ color: GOLD }}>✦</span>
        </h1>
        <p style={{ margin: "5px 0 0", fontSize: 11, opacity: 0.8, letterSpacing: 2 }}>COMPETITION & SCHEDULE</p>
        {user && (
          <div style={{ position: "absolute", top: 8, right: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{user.displayName}</span>
            <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "3px 8px", color: "#fff", fontSize: 10, cursor: "pointer", fontFamily: FONT }}>ログアウト</button>
          </div>
        )}
        {familyId && (
          <div style={{ position: "absolute", top: 8, left: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(familyId);
                alert("ファミリーIDをコピーしました！\n\n" + familyId + "\n\nこのIDを家族に共有してください。");
              }}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "3px 8px", color: "#fff", fontSize: 10, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 3 }}
            >
              📋 ID共有
            </button>
          </div>
        )}
        {data.children.length > 0 ? (
          <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
            {data.children.map((c, i) => (
              <span key={c} style={{ background: "rgba(255,255,255,0.2)", padding: "2px 9px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                {EMOJIS[i % 5]} {c}
              </span>
            ))}
            <button onClick={() => { setForm({ nc: "" }); setModal({ type: "kid" }); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px dashed rgba(255,255,255,0.5)", padding: "2px 9px", borderRadius: 12, fontSize: 11, color: "#fff", cursor: "pointer", fontFamily: FONT }}>
              ＋管理
            </button>
          </div>
        ) : (
          <button onClick={() => { setForm({ nc: "" }); setModal({ type: "kid" }); }} style={{ marginTop: 8, background: "rgba(255,255,255,0.2)", border: "1px dashed rgba(255,255,255,0.5)", padding: "5px 14px", borderRadius: 12, fontSize: 12, color: "#fff", cursor: "pointer", fontFamily: FONT, fontWeight: 600 }}>
            👧 まずお子さんを登録→
          </button>
        )}
      </div>

      {/* TABS */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100, overflowX: "auto" }}>
        <TabBtn active={tab === "schedule"} onClick={() => setTab("schedule")} icon="📅">スケジュール</TabBtn>
        <TabBtn active={tab === "checklist"} onClick={() => setTab("checklist")} icon="✅">持ち物</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon="🏆">成績</TabBtn>
        <TabBtn active={tab === "stats"} onClick={() => setTab("stats")} icon="📊">統計</TabBtn>
        <TabBtn active={tab === "links"} onClick={() => setTab("links")} icon="🔗">リンク</TabBtn>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "12px 12px 100px" }}>

        {/* ===== SCHEDULE TAB ===== */}
        {tab === "schedule" && (
          <div>
            {/* View mode toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button onClick={() => setViewMode("list")} style={{
                flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", fontFamily: FONT,
                background: viewMode === "list" ? "#6366f1" : "#f1f5f9",
                color: viewMode === "list" ? "#fff" : "#64748b",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}>📋 リスト</button>
              <button onClick={() => setViewMode("calendar")} style={{
                flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", fontFamily: FONT,
                background: viewMode === "calendar" ? "#6366f1" : "#f1f5f9",
                color: viewMode === "calendar" ? "#fff" : "#64748b",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}>📅 カレンダー</button>
            </div>

            {/* Calendar View */}
            {viewMode === "calendar" && (() => {
              const year = calMonth.year;
              const month = calMonth.month;
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const days = [];
              for (let i = 0; i < firstDay; i++) days.push(null);
              for (let i = 1; i <= daysInMonth; i++) days.push(i);

              const allComps = [...data.competitions, ...data.history];
              const getCompsForDay = (d) => {
                if (!d) return [];
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                return allComps.filter(c => c.date === dateStr);
              };

              const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
              const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

              return (
                <div style={{ background: "#fff", borderRadius: 13, padding: 14, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <button onClick={() => setCalMonth(prev => {
                      const newMonth = prev.month - 1;
                      return newMonth < 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: newMonth };
                    })} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: FONT, fontSize: 14 }}>←</button>
                    <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{year}年 {monthNames[month]}</span>
                    <button onClick={() => setCalMonth(prev => {
                      const newMonth = prev.month + 1;
                      return newMonth > 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: newMonth };
                    })} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: FONT, fontSize: 14 }}>→</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                    {dayNames.map((d, i) => (
                      <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, padding: 4, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#64748b" }}>{d}</div>
                    ))}
                    {days.map((d, i) => {
                      const comps = getCompsForDay(d);
                      const isToday = d && new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === d;
                      const dayOfWeek = (firstDay + (d || 1) - 1) % 7;
                      return (
                        <div key={i} style={{
                          minHeight: 44, padding: 2, borderRadius: 6,
                          background: isToday ? "#eff6ff" : d ? "#fafafa" : "transparent",
                          border: isToday ? "2px solid #6366f1" : "1px solid #f1f5f9",
                        }}>
                          {d && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, textAlign: "center", color: dayOfWeek === 0 ? "#ef4444" : dayOfWeek === 6 ? "#3b82f6" : "#475569" }}>{d}</div>
                              {comps.slice(0, 2).map((c, ci) => (
                                <div key={ci} style={{
                                  fontSize: 8, padding: "1px 3px", marginTop: 1, borderRadius: 3,
                                  background: c.id && c.id.startsWith && !data.history.find(h => h.id === c.id) ? "#ddd6fe" : "#fef3c7",
                                  color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{c.name}</div>
                              ))}
                              {comps.length > 2 && <div style={{ fontSize: 8, color: "#94a3b8", textAlign: "center" }}>+{comps.length - 2}</div>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* List View */}
            {viewMode === "list" && (
              <>
                {upcoming.length === 0 && past.length === 0 && (
                  <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                    <div style={{ fontSize: 50, marginBottom: 12 }}>📅</div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>まだ大会がありません</p>
                    <p style={{ fontSize: 12 }}>下のボタンから追加しましょう！</p>
                  </div>
                )}

                {upcoming.length > 0 && (
                  <h3 style={{ fontSize: 14, color: DARK_PURPLE, fontWeight: 700, marginBottom: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: GOLD }}>◆</span> 今後の大会
                  </h3>
                )}
                {upcoming.map((comp, i) => {
              const p = getProg(comp.id);
              return (
                <div key={comp.id} style={{ background: "linear-gradient(145deg, #ffffff 0%, #faf9ff 100%)", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 4px 20px rgba(30,27,75,0.08)", border: "1px solid #e9e5ff", animation: "slideUp 0.3s ease " + (i * 0.04) + "s both", position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 2 }}>{comp.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {"📅 " + comp.date}
                        {comp.venue && (
                          <span> ・ <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(comp.venue)} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>📍 {comp.venue}</a></span>
                        )}
                      </div>
                      {comp.compClass && (
                        <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "1px 7px", borderRadius: 10, fontWeight: 600, marginTop: 3, display: "inline-block", marginRight: 4 }}>
                          {"🏅 " + comp.compClass}
                        </span>
                      )}
                      {comp.bibNumber && (
                        <span style={{ fontSize: 10, background: "#ddd6fe", color: "#5b21b6", padding: "1px 7px", borderRadius: 10, fontWeight: 600, marginTop: 3, display: "inline-block" }}>
                          {"🎽 No." + comp.bibNumber}
                        </span>
                      )}
                      {(comp.childEntries || []).map(ce => ce.sections && ce.sections.length > 0 && (
                        <div key={ce.child} style={{ fontSize: 10, color: "#6366f1", marginTop: 2 }}>
                          {ce.child + ": " + ce.sections.map(s => s.section).join("・")}
                        </div>
                      ))}
                      {comp.notes && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{"📝 " + comp.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right", marginLeft: 8, flexShrink: 0 }}>
                      <Countdown date={comp.date} />
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{"持ち物" + p.done + "/" + p.total}</div>
                      {comp.entryDone ? (
                        <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>✅ 応募済み</div>
                      ) : comp.entryDeadline ? (
                        (() => {
                          const deadlineDiff = Math.ceil((new Date(comp.entryDeadline + "T23:59:59") - new Date()) / 86400000);
                          if (deadlineDiff < 0) return <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>締切終了</div>;
                          if (deadlineDiff <= 3) return <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, marginTop: 2 }}>{"⚠️ 締切" + deadlineDiff + "日前"}</div>;
                          if (deadlineDiff <= 7) return <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, marginTop: 2 }}>{"📝 締切" + deadlineDiff + "日前"}</div>;
                          return <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{"締切: " + comp.entryDeadline}</div>;
                        })()
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>
                    <button onClick={() => openCompModal(comp)} style={{ flex: 1, minWidth: 60, padding: 6, border: "2px solid #6366f1", borderRadius: 8, background: "transparent", color: "#6366f1", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>✏️編集</button>
                    <button onClick={() => { setSelCL(comp); setTab("checklist"); }} style={{ flex: 1, minWidth: 60, padding: 6, border: "2px solid #22c55e", borderRadius: 8, background: "transparent", color: "#22c55e", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>✅持ち物</button>
                    <button onClick={() => moveToHist(comp)} style={{ flex: 1, minWidth: 60, padding: 6, border: "2px solid #f59e0b", borderRadius: 8, background: "transparent", color: "#f59e0b", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>🏆成績</button>
                    <button onClick={() => exportToCalendar(comp)} style={{ padding: "6px 9px", border: "2px solid #8b5cf6", borderRadius: 8, background: "transparent", color: "#8b5cf6", fontSize: 11, cursor: "pointer", fontFamily: FONT }}>📲</button>
                    <button onClick={() => delComp(comp.id)} style={{ padding: "6px 9px", border: "2px solid #fecaca", borderRadius: 8, background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: FONT }}>🗑</button>
                  </div>
                </div>
              );
            })}

            {past.length > 0 && (
              <h3 style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, marginBottom: 8, marginTop: 18 }}>⏰ 過去（未記録）</h3>
            )}
            {past.map(comp => (
                  <div key={comp.id} style={{ background: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 7, border: "1px solid #e2e8f0", opacity: 0.8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#64748b" }}>{comp.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{"📅 " + comp.date}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
                      <button onClick={() => openCompModal(comp)} style={{ padding: "5px 10px", border: "1px solid #6366f1", borderRadius: 7, background: "transparent", color: "#6366f1", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>✏️編集</button>
                      <button onClick={() => moveToHist(comp)} style={{ flex: 1, padding: 5, border: "1px solid #f59e0b", borderRadius: 7, background: "transparent", color: "#f59e0b", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>🏆成績を記録</button>
                      <button onClick={() => delComp(comp.id)} style={{ padding: "5px 9px", border: "1px solid #fecaca", borderRadius: 7, background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: FONT }}>🗑</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <PrimaryBtn onClick={() => openCompModal(null)}>＋ 大会を追加</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ===== CHECKLIST TAB ===== */}
        {tab === "checklist" && (
          <div>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 50, marginBottom: 12 }}>✅</div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>大会を追加すると表示されます</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 5, overflowX: "auto", padding: "5px 0 12px" }}>
                  {upcoming.map(comp => {
                    const isSel = selCL && selCL.id === comp.id;
                    const p = getProg(comp.id);
                    return (
                      <button key={comp.id} onClick={() => setSelCL(comp)} style={{
                        flexShrink: 0, padding: "7px 12px", borderRadius: 11,
                        border: "2px solid " + (isSel ? "#6366f1" : "#e2e8f0"),
                        background: isSel ? "#6366f1" : "#fff",
                        color: isSel ? "#fff" : "#475569",
                        fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: FONT,
                      }}>
                        {comp.name}
                        <span style={{ display: "block", fontSize: 10, opacity: 0.7 }}>{p.done + "/" + p.total + "完了"}</span>
                      </button>
                    );
                  })}
                </div>
                {selCL ? (
                  <>
                    {(() => {
                      const p = getProg(selCL.id);
                      const pct = p.total > 0 ? Math.round(p.done / p.total * 100) : 0;
                      return (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{pct === 100 ? "🎉準備完了！" : "準備中..." + pct + "%"}</span>
                            <span style={{ fontSize: 11, color: "#64748b" }}>{p.done + "/" + p.total}</span>
                          </div>
                          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 8, transition: "width 0.4s", width: pct + "%", background: pct === 100 ? "linear-gradient(90deg,#22c55e,#16a34a)" : "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                          </div>
                        </div>
                      );
                    })()}
                    {Object.entries(PACKING).map(([cat, items]) => (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, paddingBottom: 4, borderBottom: "2px solid #f1f5f9" }}>{cat}</h4>
                        {items.map(([name, req]) => {
                          const isC = data.checked[selCL.id + ":" + cat + ":" + name];
                          return (
                            <div key={name} onClick={() => toggleCheck(selCL.id, cat, name)} style={{
                              display: "flex", alignItems: "center", gap: 9, padding: "7px 10px",
                              marginBottom: 2, borderRadius: 9, cursor: "pointer",
                              background: isC ? "#f0fdf4" : "#fff",
                              border: "1px solid " + (isC ? "#bbf7d0" : "#f1f5f9"),
                            }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                                border: isC ? "none" : "2px solid #cbd5e1",
                                background: isC ? "linear-gradient(135deg,#22c55e,#16a34a)" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontSize: 12, fontWeight: 700,
                              }}>
                                {isC && "✓"}
                              </div>
                              <span style={{ fontSize: 12, color: isC ? "#16a34a" : "#1e293b", textDecoration: isC ? "line-through" : "none", fontWeight: req ? 600 : 400 }}>
                                {name}{req && <span style={{ color: "#ef4444", fontSize: 9, marginLeft: 2 }}>必須</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 12 }}>↑大会を選んでください</div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {tab === "history" && (
          <div>
            {data.children.length > 1 && (
              <div style={{ display: "flex", gap: 5, overflowX: "auto", padding: "5px 0 12px" }}>
                <button onClick={() => setSelChild(null)} style={{
                  padding: "5px 12px", borderRadius: 16, fontWeight: 600, fontSize: 12,
                  cursor: "pointer", fontFamily: FONT, flexShrink: 0,
                  border: "2px solid " + (!selChild ? "#6366f1" : "#e2e8f0"),
                  background: !selChild ? "#6366f1" : "#fff",
                  color: !selChild ? "#fff" : "#64748b",
                }}>全員</button>
                {data.children.map((c, i) => (
                  <button key={c} onClick={() => setSelChild(c)} style={{
                    padding: "5px 12px", borderRadius: 16, fontWeight: 600, fontSize: 12,
                    cursor: "pointer", fontFamily: FONT, flexShrink: 0,
                    border: "2px solid " + (selChild === c ? COLORS[i % 5] : "#e2e8f0"),
                    background: selChild === c ? COLORS[i % 5] : "#fff",
                    color: selChild === c ? "#fff" : "#64748b",
                  }}>
                    {EMOJIS[i % 5] + " " + c}
                  </button>
                ))}
              </div>
            )}

            {data.history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 50, marginBottom: 12 }}>🏆</div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>まだ成績記録がありません</p>
              </div>
            ) : (
              <>
                <div style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", borderRadius: 13, padding: 14, marginBottom: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#92400e", fontWeight: 600, marginBottom: 4 }}>これまでの大会</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#78350f" }}>
                    {data.history.length}<span style={{ fontSize: 13 }}>回</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 4 }}>
                    {totalMedals["🥇"] > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>{"🥇×" + totalMedals["🥇"]}</span>}
                    {totalMedals["🥈"] > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>{"🥈×" + totalMedals["🥈"]}</span>}
                    {totalMedals["🥉"] > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>{"🥉×" + totalMedals["🥉"]}</span>}
                  </div>
                </div>

                {data.history.map((entry, i) => {
                  const filtered = selChild
                    ? (entry.childEntries || []).filter(ce => ce.child === selChild)
                    : (entry.childEntries || []);
                  if (selChild && filtered.length === 0) return null;
                  return (
                    <div key={entry.id} style={{ background: "#fff", borderRadius: 13, padding: 14, marginBottom: 9, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", animation: "slideUp 0.3s ease " + (i * 0.04) + "s both" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{entry.name}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            {"📅 " + entry.date}
                            {entry.venue && (
                              <span> ・ <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(entry.venue)} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>📍 {entry.venue}</a></span>
                            )}
                          </div>
                          {entry.compClass && (
                            <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 9, fontWeight: 600, display: "inline-block", marginTop: 2 }}>
                              {"🏅" + entry.compClass}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 3 }}>
                          <button onClick={() => { setForm(entry); setModal({ type: "hist", editing: true }); }} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", padding: 2 }}>✏️</button>
                          <button onClick={() => delHist(entry.id)} style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: 13, cursor: "pointer", padding: 2 }}>🗑</button>
                        </div>
                      </div>
                      {filtered.map(ce => {
                        const ci = data.children.indexOf(ce.child);
                        return (
                          <div key={ce.child} style={{ marginTop: 7, padding: "7px 9px", background: "#f8fafc", borderRadius: 9, borderLeft: "3px solid " + COLORS[ci >= 0 ? ci % 5 : 0] }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 3 }}>
                              {EMOJIS[ci >= 0 ? ci % 5 : 0] + " " + ce.child}
                            </div>
                            {(ce.sections || []).map(s => (
                              <div key={s.section} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 1 }}>
                                <span style={{ color: "#64748b" }}>
                                  {(s.section === "ラテン" ? "🔥" : "✨") + s.section + "（" + (s.dances || []).join("・") + "）"}
                                </span>
                                <span style={{ fontWeight: 700, fontSize: 12, color: (ce.results && ce.results[s.section] && ce.results[s.section].includes("優勝")) ? "#b45309" : "#475569" }}>
                                  {(ce.results && ce.results[s.section]) || "—"}
                                </span>
                              </div>
                            ))}
                            {ce.memo && <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{"💭 " + ce.memo}</div>}
                          </div>
                        );
                      })}
                      {(entry.photos || []).length > 0 && (
                        <div style={{ display: "flex", gap: 5, marginTop: 7, overflowX: "auto" }}>
                          {entry.photos.map((p, pi) => (
                            <img key={pi} src={p} alt="" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 9 }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <PrimaryBtn onClick={() => openHistModal(null)}>＋ 成績を追加</PrimaryBtn>
            </div>
          </div>
        )}

        {/* ===== STATS TAB ===== */}
        {tab === "stats" && (
          <div>
            {yearStats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 50, marginBottom: 12 }}>📊</div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>成績を記録すると統計が表示されます</p>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>📊 年間の大会参加数</h3>
                <div style={{ background: "#fff", borderRadius: 13, padding: 14, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={yearStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="year" fontSize={11} tickLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontFamily: FONT }} formatter={v => [v + "回", "大会数"]} />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                        {yearStats.map((_, i) => <Cell key={i} fill={"hsl(" + (240 + i * 30) + ",70%,60%)"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>🏅 年間ベスト成績</h3>
                <div style={{ background: "#fff", borderRadius: 13, padding: 14, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={yearStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="year" fontSize={11} tickLine={false} />
                      <YAxis fontSize={9} tickLine={false} axisLine={false} domain={[0, 10]} ticks={[0, 2, 3, 7, 8, 10]} tickFormatter={v => {
                        const labels = { 0: "予選", 2: "準決勝", 3: "決勝", 7: "3位", 8: "準優勝", 10: "優勝" };
                        return labels[v] || "";
                      }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontFamily: FONT }} formatter={v => {
                        const found = Object.entries(SCORES).find(([, s]) => s === v);
                        return [found ? found[0] : v, "ベスト"];
                      }} />
                      <Bar dataKey="best" radius={[5, 5, 0, 0]}>
                        {yearStats.map((e, i) => <Cell key={i} fill={e.best >= 8 ? "#f59e0b" : e.best >= 3 ? "#6366f1" : "#94a3b8"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>🥇 年間メダル数</h3>
                <div style={{ background: "#fff", borderRadius: 13, padding: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={yearStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="year" fontSize={11} tickLine={false} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, fontFamily: FONT }} formatter={v => [v + "個", "メダル"]} />
                      <Bar dataKey="medals" radius={[5, 5, 0, 0]} fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== LINKS TAB ===== */}
        {tab === "links" && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 12, marginTop: 4 }}>🔗 便利なリンク</h3>

            <a href="https://www.jdsf.or.jp/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", borderRadius: 13, padding: 16, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  🏛️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 2 }}>JDSF公式サイト</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>日本ダンススポーツ連盟の公式ページ</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 16 }}>→</div>
              </div>
            </a>

            <a href="https://adm.jdsf.jp/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", borderRadius: 13, padding: 16, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  📋
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 2 }}>最新の競技会情報（JDSF）</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>大会スケジュール・エントリー情報</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 16 }}>→</div>
              </div>
            </a>

            <a href="https://jbdf-ejd.gr.jp/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", borderRadius: 13, padding: 16, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  🏛️
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 2 }}>JBDF公式サイト</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>日本ボールルームダンス連盟</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 16 }}>→</div>
              </div>
            </a>

            <a href="http://dtsdance.blog.fc2.com/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", borderRadius: 13, padding: 16, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  💃
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 2 }}>D.T.S相模原</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>ダンスサークル情報</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 16 }}>→</div>
              </div>
            </a>

            <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 20 }}>
              タップすると外部サイトが開きます
            </p>
          </div>
        )}
      </div>

      {/* ===== COMP MODAL ===== */}
      <Modal open={modal && modal.type === "comp"} onClose={() => setModal(null)} title={modal && modal.editing ? "✏️ 大会を編集" : "🎯 大会を追加"}>
        <Input label="大会名" value={form.name || ""} onChange={v => setForm({ ...form, name: v })} placeholder="例: 第10回ジュニアダンス選手権" required />
        <Input label="日程" type="date" value={form.date || ""} onChange={v => setForm({ ...form, date: v })} required />
        <Input label="会場" value={form.venue || ""} onChange={v => setForm({ ...form, venue: v })} placeholder="例: 東京体育館" />
        <ClassPicker value={form.compClass || ""} onChange={v => setForm({ ...form, compClass: v })} />

        {data.children.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: FONT }}>
              お子さんごとの出場部門
            </label>
            {data.children.map((child, ci) => {
              const ce = (form.childEntries || []).find(e => e.child === child) || { child, sections: [] };
              return (
                <div key={child} style={{ marginBottom: 8, padding: 8, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fafaff" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS[ci % 5], marginBottom: 5 }}>
                    {EMOJIS[ci % 5] + " " + child}
                  </div>
                  <SectionPicker
                    sections={ce.sections}
                    onChange={secs => updateFormCE(child, { sections: secs })}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: "#f0f9ff", borderRadius: 10, padding: 12, marginBottom: 13 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: "#0369a1" }}>📝 エントリー情報</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 2, fontSize: 10, color: "#475569" }}>応募開始日</label>
              <input type="date" value={form.entryStartDate || ""} onChange={e => setForm({ ...form, entryStartDate: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontFamily: FONT }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: 2, fontSize: 10, color: "#475569" }}>応募締切日</label>
              <input type="date" value={form.entryDeadline || ""} onChange={e => setForm({ ...form, entryDeadline: e.target.value })}
                style={{ width: "100%", padding: "6px 8px", border: "2px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontFamily: FONT }} />
            </div>
          </div>
          <div onClick={() => setForm({ ...form, entryDone: !form.entryDone })} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 0" }}>
            <div style={{
              width: 20, height: 20, borderRadius: 5,
              border: form.entryDone ? "none" : "2px solid #cbd5e1",
              background: form.entryDone ? "linear-gradient(135deg,#22c55e,#16a34a)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700,
            }}>{form.entryDone && "✓"}</div>
            <span style={{ fontSize: 12, color: "#1e293b", fontWeight: form.entryDone ? 600 : 400 }}>応募済み</span>
          </div>
        </div>

        <Input label="ゼッケン番号" value={form.bibNumber || ""} onChange={v => setForm({ ...form, bibNumber: v })} placeholder="例: 123" />
        <Input label="メモ" value={form.notes || ""} onChange={v => setForm({ ...form, notes: v })} placeholder="集合時間、注意事項など" />
        <div style={{ textAlign: "right", marginTop: 14 }}>
          <PrimaryBtn onClick={async () => { await saveComp(form, modal && modal.editing); setModal(null); }} disabled={!form.name || !form.date}>
            {modal && modal.editing ? "更新する" : "登録する"}
          </PrimaryBtn>
        </div>
      </Modal>

      {/* ===== HIST MODAL ===== */}
      <Modal open={modal && modal.type === "hist"} onClose={() => setModal(null)} title={modal && modal.editing ? "✏️ 成績を編集" : "🏆 成績を記録"}>
        <Input label="大会名" value={form.name || ""} onChange={v => setForm({ ...form, name: v })} placeholder="例: 第10回ジュニアダンス選手権" required />
        <Input label="日程" type="date" value={form.date || ""} onChange={v => setForm({ ...form, date: v })} required />
        <Input label="会場" value={form.venue || ""} onChange={v => setForm({ ...form, venue: v })} placeholder="例: 東京体育館" />
        <ClassPicker value={form.compClass || ""} onChange={v => setForm({ ...form, compClass: v })} />

        {data.children.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: FONT }}>
              お子さんごとの成績
            </label>
            {data.children.map((child, ci) => {
              const ce = (form.childEntries || []).find(e => e.child === child) || { child, sections: [], results: {}, memo: "" };
              return (
                <div key={child} style={{ marginBottom: 10, padding: 8, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fffbeb", borderLeft: "3px solid " + COLORS[ci % 5] }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS[ci % 5], marginBottom: 5 }}>
                    {EMOJIS[ci % 5] + " " + child}
                  </div>
                  <SectionPicker
                    sections={ce.sections}
                    onChange={s => updateFormCE(child, { sections: s })}
                    accent="#f59e0b"
                  />
                  {ce.sections.map(s => (
                    <div key={s.section} style={{ marginBottom: 6, paddingLeft: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "#92400e", marginBottom: 2, display: "block" }}>
                        {s.section + "の成績"}
                      </label>
                      <select
                        value={(ce.results && ce.results[s.section]) || ""}
                        onChange={e => updateFormCE(child, { results: { ...(ce.results || {}), [s.section]: e.target.value } })}
                        style={{ width: "100%", padding: "7px 9px", borderRadius: 8, border: "2px solid #fde68a", fontSize: 12, fontFamily: FONT, outline: "none", background: "#fff" }}
                      >
                        <option value="">選択...</option>
                        {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  ))}
                  <input
                    value={ce.memo || ""} onChange={e => updateFormCE(child, { memo: e.target.value })}
                    placeholder="💭 個人メモ..."
                    style={{ width: "100%", padding: "6px 9px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 11, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginTop: 4 }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 5, fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: FONT }}>📷 写真メモ</label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(form.photos || []).map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={p} alt="" style={{ width: 65, height: 65, objectFit: "cover", borderRadius: 9 }} />
                <button onClick={() => setForm({ ...form, photos: (form.photos || []).filter((_, j) => j !== i) })} style={{
                  position: "absolute", top: -3, right: -3, width: 18, height: 18,
                  borderRadius: "50%", border: "none", background: "#ef4444",
                  color: "#fff", fontSize: 9, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
              </div>
            ))}
            <label style={{
              width: 65, height: 65, borderRadius: 9, border: "2px dashed #cbd5e1",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 22, color: "#94a3b8", background: "#f8fafc",
            }}>
              ＋
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <div style={{ textAlign: "right", marginTop: 14 }}>
          <PrimaryBtn onClick={async () => { await saveHist(form, modal && modal.editing); setModal(null); }} disabled={!form.name || !form.date}>
            {modal && modal.editing ? "更新する" : "記録する"}
          </PrimaryBtn>
        </div>
      </Modal>

      {/* ===== CHILD MODAL ===== */}
      <Modal open={modal && modal.type === "kid"} onClose={() => setModal(null)} title="👧👦 お子さんの管理">
        <div style={{ marginBottom: 12 }}>
          {data.children.map((c, i) => (
            <div key={c} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", marginBottom: 3, borderRadius: 9, background: "#f8fafc" }}>
              <span style={{ fontWeight: 600, color: COLORS[i % 5], fontSize: 13 }}>
                {EMOJIS[i % 5] + " " + c}
              </span>
              <button onClick={() => { if (confirm(c + "さんのデータも削除されます。よろしいですか？")) removeChild(c); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12 }}>
                削除
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={form.nc || ""} onChange={e => setForm({ ...form, nc: e.target.value })}
            placeholder="名前を入力"
            onKeyDown={e => { if (e.key === "Enter") { addChild(form.nc); setForm({ ...form, nc: "" }); } }}
            style={{ flex: 1, padding: "8px 11px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: FONT }}
          />
          <PrimaryBtn onClick={() => { addChild(form.nc); setForm({ ...form, nc: "" }); }} disabled={!form.nc || !form.nc.trim()}>
            追加
          </PrimaryBtn>
        </div>
      </Modal>
    </div>
  );
}
