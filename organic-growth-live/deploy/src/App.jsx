import React, { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Plus, X, ChevronDown, Sparkles, RefreshCw, Calendar, Radio } from "lucide-react";

// ---------- Seed data (parsed from "Organic Weekly Tracker- Claude Use") ----------
const SEED = {"weeks": [], "years": [], "platforms": {
  "Instagram - Scale Army": {"content": {"Reels": [], "Image Posts": []}, "impressions": [], "engagementRate": [], "reach": [], "clicks": [], "newFollowers": [], "leadsDM": [], "leadsUTM": []},
  "LinkedIn - Scale Army": {"content": {"Video Posts": [], "Image Posts": [], "Text Posts": [], "Articles": []}, "impressions": [], "engagementRate": [], "reach": null, "clicks": [], "newFollowers": [], "leadsDM": [], "leadsUTM": []},
  "Twitter - Scale Army": {"content": {"Text Tweets": [], "Image Tweets": [], "Video Tweets": []}, "impressions": [], "engagementRate": [], "reach": null, "clicks": [], "newFollowers": [], "leadsDM": [], "leadsUTM": []}
}};

const PLATFORM_COLORS = {
  "Instagram - Scale Army": "#E1306C",
  "LinkedIn - Scale Army": "#4FD1C5",
  "Twitter - Scale Army": "#8B9DC3",
};
const ACCENT = "#E07A3F"; // leads / north-star
const BG = "#161A20";
const CARD = "#1E232C";
const CARD_BORDER = "#2A3038";
const TEXT_MUTED = "#8A93A3";
const TEXT = "#EDEFF2";

const monthFromWeek = (label, year) => {
  const startMD = label.split("-")[0].trim();
  const mm = parseInt(startMD.split("/")[0], 10);
  return `${year}-${String(mm).padStart(2, "0")}`;
};

function buildRows(data) {
  const platforms = Object.keys(data.platforms);
  return data.weeks.map((w, i) => {
    const row = { week: w, year: data.years[i], month: monthFromWeek(w, data.years[i]), idx: i };
    platforms.forEach((p) => {
      const pd = data.platforms[p];
      row[p] = {
        impressions: pd.impressions?.[i] ?? 0,
        engagementRate: pd.engagementRate?.[i] ?? 0,
        reach: pd.reach ? pd.reach[i] : null,
        clicks: pd.clicks?.[i] ?? 0,
        newFollowers: pd.newFollowers?.[i] ?? 0,
        leadsDM: pd.leadsDM ? pd.leadsDM[i] : (pd.leads?.[i] ?? 0),
        leadsUTM: pd.leadsUTM ? pd.leadsUTM[i] : 0,
        content: Object.fromEntries(Object.entries(pd.content || {}).map(([k, arr]) => [k, arr[i] ?? 0])),
      };
    });
    return row;
  });
}

function fmt(n, d = 0) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}

function Delta({ curr, prev, invert = false, suffix = "" }) {
  if (prev === 0 || prev === null || prev === undefined) return <span style={{ color: TEXT_MUTED, fontSize: 12 }}>—</span>;
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const good = invert ? pct < 0 : pct >= 0;
  const Icon = Math.abs(pct) < 1 ? Minus : pct > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: good ? "#5FD87A" : "#E8695E" }}>
      <Icon size={12} strokeWidth={2.5} />
      {Math.abs(pct).toFixed(0)}{suffix} vs prior
    </span>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: "16px 18px", flex: "1 1 150px", minWidth: 140 }}>
      <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: TEXT_MUTED, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || TEXT, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0, letterSpacing: 0.2 }}>{children}</h3>
      {right}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#0F1216", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: TEXT_MUTED, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 8, justifyContent: "space-between" }}>
          <span>{p.name}</span><span style={{ fontWeight: 600 }}>{fmt(p.value, p.value < 5 && p.value % 1 !== 0 ? 1 : 0)}</span>
        </div>
      ))}
    </div>
  );
};

// ---------- Suggestion engine (computed from real data, not canned) ----------
function computeSuggestions(rows, platforms) {
  const out = [];
  const n = rows.length;
  if (n < 2) return out;
  const last = rows[n - 1];
  const prev = rows[n - 2];
  const last4 = rows.slice(Math.max(0, n - 4), n);
  const prior4 = rows.slice(Math.max(0, n - 8), Math.max(0, n - 4));

  const sum = (arr, pick) => arr.reduce((s, r) => s + pick(r), 0);
  const totalLeads = (r) => platforms.reduce((s, p) => s + (r[p].leadsDM + r[p].leadsUTM), 0);

  const leadsLast4 = sum(last4, totalLeads);
  const leadsPrior4 = sum(prior4, totalLeads);
  if (prior4.length === 4) {
    const pct = leadsPrior4 === 0 ? null : ((leadsLast4 - leadsPrior4) / leadsPrior4) * 100;
    if (pct !== null) {
      if (pct <= -20) out.push({ tone: "warn", text: `Organic leads are down ${Math.abs(pct).toFixed(0)}% over the last 4 weeks vs the 4 before — worth flagging early given the scope changes landing in Sept/Oct, before it shows up in the SQL number.` });
      else if (pct >= 20) out.push({ tone: "good", text: `Leads are up ${pct.toFixed(0)}% over the last 4 weeks vs the prior 4 — good moment to note what changed and repeat it.` });
    }
  }

  // Best-performing content type per platform, by correlating publish-day weeks with engagement rate
  platforms.forEach((p) => {
    const contentTypes = Object.keys(rows[0][p].content || {});
    let best = null;
    contentTypes.forEach((ct) => {
      const withType = rows.filter((r) => r[p].content[ct] > 0);
      const withoutType = rows.filter((r) => r[p].content[ct] === 0);
      if (withType.length >= 3 && withoutType.length >= 3) {
        const avgWith = sum(withType, (r) => r[p].engagementRate) / withType.length;
        const avgWithout = sum(withoutType, (r) => r[p].engagementRate) / withoutType.length;
        const lift = avgWithout === 0 ? 0 : ((avgWith - avgWithout) / avgWithout) * 100;
        if (lift > 15 && (!best || lift > best.lift)) best = { ct, lift, avgWith, avgWithout };
      }
    });
    if (best) {
      out.push({ tone: "insight", text: `On ${p.replace(" - Scale Army", "")}, weeks that include ${best.ct.toLowerCase()} run ${best.lift.toFixed(0)}% higher engagement rate (${best.avgWith.toFixed(1)}% vs ${best.avgWithout.toFixed(1)}%) than weeks without — lean into that format for the next few weeks.` });
    }
  });

  // Engagement rate trend this week vs last, per platform
  platforms.forEach((p) => {
    const c = last[p].engagementRate, pr = prev[p].engagementRate;
    if (pr > 0 && (c - pr) / pr <= -0.4) {
      out.push({ tone: "warn", text: `${p.replace(" - Scale Army", "")} engagement rate dropped from ${pr.toFixed(1)}% to ${c.toFixed(1)}% week-over-week — check posting time and format before next week's plan.` });
    }
  });

  // Follower growth vs leads gap
  const followersLast4 = sum(last4, (r) => platforms.reduce((s, p) => s + r[p].newFollowers, 0));
  if (followersLast4 > 0 && leadsLast4 === 0) {
    out.push({ tone: "warn", text: `${followersLast4} new followers in the last 4 weeks but 0 leads captured — worth checking that CTAs and bio links are actually pointing somewhere trackable.` });
  }

  // Reminder about DM/UTM split
  out.push({ tone: "insight", text: `Now that DM and UTM leads are tracked separately, tie the split to the SQL/MQL definitions and attribution logic you're locking down with Sales — clean attribution here will make that conversation much easier.` });

  return out.slice(0, 6);
}

const TONE_STYLE = {
  warn: { border: "#5A3A2A", bg: "#241B16", dot: "#E8955E" },
  good: { border: "#26402C", bg: "#16211A", dot: "#5FD87A" },
  insight: { border: "#26343F", bg: "#161E24", dot: "#4FD1C5" },
};

// ---------- Add / Edit week form ----------
function WeekForm({ platforms, defaultWeek, onSave, onClose }) {
  const [weekLabel, setWeekLabel] = useState(defaultWeek?.week || "");
  const [year, setYear] = useState(defaultWeek?.year || "2026");
  const [platform, setPlatform] = useState(platforms[0]);
  const [vals, setVals] = useState(() => ({
    impressions: "", engagementRate: "", reach: "", clicks: "", newFollowers: "",
    leadsDM: "", leadsUTM: "",
  }));

  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 24, width: 420, maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: TEXT, fontSize: 16 }}>Add this week's data</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: TEXT_MUTED }}>Week (e.g. 08/17-08/23)</label>
            <input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="MM/DD-MM/DD"
              style={{ width: "100%", background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: TEXT_MUTED }}>Year</label>
            <input value={year} onChange={(e) => setYear(e.target.value)}
              style={{ width: "100%", background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, marginTop: 4 }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: TEXT_MUTED }}>Platform</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}
            style={{ width: "100%", background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, marginTop: 4 }}>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["impressions", "Impressions"], ["engagementRate", "Engagement rate %"],
            ["reach", "Reach"], ["clicks", "Clicks / traffic"],
            ["newFollowers", "New followers"],
          ].map(([k, l]) => (
            <div key={k}>
              <label style={{ fontSize: 11, color: TEXT_MUTED }}>{l}</label>
              <input type="number" value={vals[k]} onChange={set(k)}
                style={{ width: "100%", background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, marginTop: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${CARD_BORDER}` }}>
          <div>
            <label style={{ fontSize: 11, color: ACCENT }}>Leads via DM</label>
            <input type="number" value={vals.leadsDM} onChange={set("leadsDM")}
              style={{ width: "100%", background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, marginTop: 4 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: ACCENT }}>Leads via UTM</label>
            <input type="number" value={vals.leadsUTM} onChange={set("leadsUTM")}
              style={{ width: "100%", background: BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 6, padding: "6px 8px", color: TEXT, marginTop: 4 }} />
          </div>
        </div>
        <button
          onClick={() => {
            if (!weekLabel) return;
            onSave({ weekLabel, year, platform, vals });
          }}
          style={{ marginTop: 18, width: "100%", background: ACCENT, color: "#241B0A", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer" }}>
          Save entry
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ readOnly = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("weekly"); // weekly | monthly
  const [showForm, setShowForm] = useState(false);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [platformFilter, setPlatformFilter] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const existing = await window.storage.get("tracker-data", true);
        if (existing && existing.value) {
          setData(JSON.parse(existing.value));
        } else {
          await window.storage.set("tracker-data", JSON.stringify(SEED), true);
          setData(SEED);
        }
      } catch (e) {
        setData(SEED);
      }
      setLoading(false);
    })();
  }, []);

  const platforms = data ? Object.keys(data.platforms) : [];
  const rows = useMemo(() => (data ? buildRows(data) : []), [data]);

  useEffect(() => {
    if (rows.length && selectedWeekIdx === null) setSelectedWeekIdx(rows.length - 1);
    if (rows.length && !selectedMonth) setSelectedMonth(rows[rows.length - 1].month);
  }, [rows]);

  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.month))), [rows]);

  const saveEntry = async ({ weekLabel, year, platform, vals }) => {
    const nd = JSON.parse(JSON.stringify(data));
    if (!nd.weeks.includes(weekLabel)) {
      nd.weeks.push(weekLabel);
      nd.years.push(year);
      Object.keys(nd.platforms).forEach((p) => {
        const pd = nd.platforms[p];
        pd.impressions.push(p === platform ? Number(vals.impressions || 0) : 0);
        pd.engagementRate.push(p === platform ? Number(vals.engagementRate || 0) : 0);
        if (pd.reach) pd.reach.push(p === platform ? Number(vals.reach || 0) : 0);
        pd.clicks.push(p === platform ? Number(vals.clicks || 0) : 0);
        pd.newFollowers.push(p === platform ? Number(vals.newFollowers || 0) : 0);
        if (!pd.leadsDM) { pd.leadsDM = pd.leads ? [...pd.leads] : pd.impressions.map(() => 0); pd.leadsUTM = pd.impressions.map(() => 0); }
        pd.leadsDM.push(p === platform ? Number(vals.leadsDM || 0) : 0);
        pd.leadsUTM.push(p === platform ? Number(vals.leadsUTM || 0) : 0);
        Object.keys(pd.content || {}).forEach((ct) => pd.content[ct].push(0));
      });
    } else {
      const i = nd.weeks.indexOf(weekLabel);
      const pd = nd.platforms[platform];
      pd.impressions[i] = Number(vals.impressions || 0);
      pd.engagementRate[i] = Number(vals.engagementRate || 0);
      if (pd.reach) pd.reach[i] = Number(vals.reach || 0);
      pd.clicks[i] = Number(vals.clicks || 0);
      pd.newFollowers[i] = Number(vals.newFollowers || 0);
      if (!pd.leadsDM) { pd.leadsDM = [...pd.impressions.map(() => 0)]; pd.leadsUTM = [...pd.impressions.map(() => 0)]; }
      pd.leadsDM[i] = Number(vals.leadsDM || 0);
      pd.leadsUTM[i] = Number(vals.leadsUTM || 0);
    }
    setData(nd);
    try { await window.storage.set("tracker-data", JSON.stringify(nd), true); } catch (e) {}
    setShowForm(false);
  };

  if (loading || !data) {
    return <div style={{ background: BG, color: TEXT, padding: 40, fontFamily: "Inter, system-ui, sans-serif" }}>Loading dashboard…</div>;
  }

  const visiblePlatforms = platformFilter === "All" ? platforms : [platformFilter];

  // Trend data for main chart (all weeks)
  const trendData = rows.map((r) => {
    const o = { week: r.week };
    let dm = 0, utm = 0;
    visiblePlatforms.forEach((p) => { dm += r[p].leadsDM; utm += r[p].leadsUTM; });
    o["DM leads"] = dm; o["UTM leads"] = utm;
    return o;
  });

  const engagementTrend = rows.slice(-16).map((r) => {
    const o = { week: r.week };
    visiblePlatforms.forEach((p) => { o[p.replace(" - Scale Army", "")] = r[p].engagementRate; });
    return o;
  });

  const selectedWeek = rows[selectedWeekIdx] || rows[rows.length - 1];
  const prevWeek = rows[selectedWeekIdx - 1];

  const weekTotals = (r) => {
    if (!r) return { impressions: 0, engagementRate: 0, leads: 0, newFollowers: 0, clicks: 0 };
    let impressions = 0, leads = 0, newFollowers = 0, clicks = 0, erSum = 0, erCount = 0;
    visiblePlatforms.forEach((p) => {
      impressions += r[p].impressions;
      leads += r[p].leadsDM + r[p].leadsUTM;
      newFollowers += r[p].newFollowers;
      clicks += r[p].clicks;
      erSum += r[p].engagementRate; erCount += 1;
    });
    return { impressions, engagementRate: erCount ? erSum / erCount : 0, leads, newFollowers, clicks };
  };
  const wt = weekTotals(selectedWeek);
  const wtPrev = weekTotals(prevWeek);

  const monthRows = rows.filter((r) => r.month === selectedMonth);
  const monthTotals = monthRows.reduce((acc, r) => {
    const t = weekTotals(r);
    acc.impressions += t.impressions; acc.leads += t.leads; acc.newFollowers += t.newFollowers; acc.clicks += t.clicks;
    acc.erSum += t.engagementRate; acc.erCount += 1;
    return acc;
  }, { impressions: 0, leads: 0, newFollowers: 0, clicks: 0, erSum: 0, erCount: 0 });

  const prevMonthIdx = months.indexOf(selectedMonth) - 1;
  const prevMonthRows = prevMonthIdx >= 0 ? rows.filter((r) => r.month === months[prevMonthIdx]) : [];
  const prevMonthTotals = prevMonthRows.reduce((acc, r) => {
    const t = weekTotals(r);
    acc.impressions += t.impressions; acc.leads += t.leads; acc.newFollowers += t.newFollowers; acc.clicks += t.clicks;
    return acc;
  }, { impressions: 0, leads: 0, newFollowers: 0, clicks: 0 });

  const monthlyLeadsTrend = months.map((m) => {
    const mr = rows.filter((r) => r.month === m);
    let dm = 0, utm = 0;
    mr.forEach((r) => visiblePlatforms.forEach((p) => { dm += r[p].leadsDM; utm += r[p].leadsUTM; }));
    return { month: m, "DM leads": dm, "UTM leads": utm };
  });

  const contentMix = (() => {
    const totals = {};
    visiblePlatforms.forEach((p) => {
      Object.entries(selectedWeek?.[p]?.content || {}).forEach(([ct, v]) => {
        totals[ct] = (totals[ct] || 0) + v;
      });
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);
  })();

  const PIE_COLORS = ["#F2B84B", "#4FD1C5", "#E1306C", "#8B9DC3", "#E8955E", "#5FD87A"];

  const suggestions = computeSuggestions(rows, visiblePlatforms.length ? visiblePlatforms : platforms);

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: TEXT, padding: "24px 20px 60px" }}>
      <style>{`
        select, input { font-family: inherit; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, maxWidth: 1180, margin: "0 auto 22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: ACCENT, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
            <Radio size={13} /> Organic demand gen
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Organic Growth {readOnly ? "Report" : "Dashboard"}</h1>
          <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>Weekly social tracker → SQL pipeline view</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
            style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, color: TEXT, borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
            <option value="All">All platforms</option>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {readOnly ? (
            <span style={{ fontSize: 11, color: TEXT_MUTED, border: `1px solid ${CARD_BORDER}`, borderRadius: 8, padding: "8px 12px" }}>Read-only report</span>
          ) : (
            <>
              <button onClick={() => setShowForm(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: ACCENT, color: "#241B0A", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                <Plus size={15} /> Add week
              </button>
              <button onClick={async () => {
                  if (!window.confirm("This clears all stored weeks and starts fresh. Continue?")) return;
                  try { await window.storage.set("tracker-data", JSON.stringify(SEED), true); } catch (e) {}
                  setData(JSON.parse(JSON.stringify(SEED)));
                  setSelectedWeekIdx(null);
                  setSelectedMonth(null);
                }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${CARD_BORDER}`, color: TEXT_MUTED, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>
                <RefreshCw size={13} /> Reset to fresh
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* View toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 9, padding: 4, width: "fit-content" }}>
          {["weekly", "monthly"].map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: view === v ? ACCENT : "transparent", color: view === v ? "#241B0A" : TEXT_MUTED, textTransform: "capitalize",
              }}>{v}</button>
          ))}
        </div>

        {view === "weekly" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Calendar size={15} color={TEXT_MUTED} />
              <select value={selectedWeekIdx ?? ""} onChange={(e) => setSelectedWeekIdx(Number(e.target.value))}
                style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, color: TEXT, borderRadius: 8, padding: "7px 10px", fontSize: 13 }}>
                {rows.map((r, i) => <option key={i} value={i}>{r.week} · {r.year}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              <KpiCard label="Total leads" value={fmt(wt.leads)} accent={ACCENT} sub={<Delta curr={wt.leads} prev={wtPrev.leads} />} />
              <KpiCard label="Avg engagement rate" value={`${fmt(wt.engagementRate, 1)}%`} sub={<Delta curr={wt.engagementRate} prev={wtPrev.engagementRate} />} />
              <KpiCard label="Impressions" value={fmt(wt.impressions)} sub={<Delta curr={wt.impressions} prev={wtPrev.impressions} />} />
              <KpiCard label="New followers" value={fmt(wt.newFollowers)} sub={<Delta curr={wt.newFollowers} prev={wtPrev.newFollowers} />} />
              <KpiCard label="Clicks / traffic" value={fmt(wt.clicks)} sub={<Delta curr={wt.clicks} prev={wtPrev.clicks} />} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 18 }}>
              <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 18 }}>
                <SectionTitle>Engagement rate — last 16 weeks</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={engagementTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: TEXT_MUTED }} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: TEXT_MUTED }} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {visiblePlatforms.map((p) => (
                      <Line key={p} type="monotone" dataKey={p.replace(" - Scale Army", "")} stroke={PLATFORM_COLORS[p]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 18 }}>
                <SectionTitle>Content mix this week</SectionTitle>
                {contentMix.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={contentMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {contentMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "40px 0", textAlign: "center" }}>No content logged this week</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Calendar size={15} color={TEXT_MUTED} />
              <select value={selectedMonth ?? ""} onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, color: TEXT, borderRadius: 8, padding: "7px 10px", fontSize: 13 }}>
                {months.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={{ color: TEXT_MUTED, fontSize: 12 }}>{monthRows.length} week{monthRows.length !== 1 ? "s" : ""} in this bucket</span>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              <KpiCard label="Total leads" value={fmt(monthTotals.leads)} accent={ACCENT} sub={<Delta curr={monthTotals.leads} prev={prevMonthTotals.leads} />} />
              <KpiCard label="Avg engagement rate" value={`${fmt(monthTotals.erCount ? monthTotals.erSum / monthTotals.erCount : 0, 1)}%`} />
              <KpiCard label="Impressions" value={fmt(monthTotals.impressions)} sub={<Delta curr={monthTotals.impressions} prev={prevMonthTotals.impressions} />} />
              <KpiCard label="New followers" value={fmt(monthTotals.newFollowers)} sub={<Delta curr={monthTotals.newFollowers} prev={prevMonthTotals.newFollowers} />} />
              <KpiCard label="Clicks / traffic" value={fmt(monthTotals.clicks)} sub={<Delta curr={monthTotals.clicks} prev={prevMonthTotals.clicks} />} />
            </div>

            <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
              <SectionTitle>Leads by month — DM vs UTM</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyLeadsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: TEXT_MUTED }} />
                  <YAxis tick={{ fontSize: 10, fill: TEXT_MUTED }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="DM leads" stackId="a" fill={ACCENT} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="UTM leads" stackId="a" fill="#4FD1C5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>UTM tracking starts the week you begin logging it — earlier months show DM only.</div>
            </div>
          </>
        )}

        {/* Full history trend, always visible */}
        <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <SectionTitle>Leads over time — full history</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: TEXT_MUTED }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: TEXT_MUTED }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="DM leads" stackId="1" stroke={ACCENT} fill={ACCENT} fillOpacity={0.35} />
              <Area type="monotone" dataKey="UTM leads" stackId="1" stroke="#4FD1C5" fill="#4FD1C5" fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Suggestions */}
        <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 18 }}>
          <SectionTitle right={<span style={{ fontSize: 11, color: TEXT_MUTED }}>Generated from current data</span>}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={14} color={ACCENT} /> This week's suggestions</span>
          </SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s, i) => {
              const st = TONE_STYLE[s.tone];
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: st.bg, border: `1px solid ${st.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: TEXT }}>{s.text}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 18, marginTop: 18 }}>
          <SectionTitle right={
            <button onClick={() => {
              const header = ["week","year","platform","impressions","engagementRate","reach","clicks","newFollowers","leadsDM","leadsUTM"];
              const lines = [header.join(",")];
              rows.forEach((r) => platforms.forEach((p) => {
                lines.push([r.week, r.year, p, r[p].impressions, r[p].engagementRate, r[p].reach ?? "", r[p].clicks, r[p].newFollowers, r[p].leadsDM, r[p].leadsUTM].join(","));
              }));
              const blob = new Blob([lines.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "organic-growth-data.csv"; a.click();
              URL.revokeObjectURL(url);
            }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${CARD_BORDER}`, color: TEXT, borderRadius: 7, padding: "6px 11px", fontSize: 12, cursor: "pointer" }}>
              <RefreshCw size={12} /> Export as CSV
            </button>
          }>
            Raw data ({rows.length} weeks stored)
          </SectionTitle>
          <div style={{ maxHeight: 220, overflow: "auto", border: `1px solid ${CARD_BORDER}`, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: "#161A20" }}>
                <tr>
                  {["Week","Platform","Impr.","Eng. rate","Clicks","New foll.","DM leads","UTM leads"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: TEXT_MUTED, fontWeight: 600, borderBottom: `1px solid ${CARD_BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice().reverse().flatMap((r) => platforms.map((p) => (
                  <tr key={r.week + p}>
                    <td style={{ padding: "5px 10px", color: TEXT_MUTED }}>{r.week}</td>
                    <td style={{ padding: "5px 10px" }}>{p.replace(" - Scale Army", "")}</td>
                    <td style={{ padding: "5px 10px" }}>{fmt(r[p].impressions)}</td>
                    <td style={{ padding: "5px 10px" }}>{fmt(r[p].engagementRate, 1)}%</td>
                    <td style={{ padding: "5px 10px" }}>{fmt(r[p].clicks)}</td>
                    <td style={{ padding: "5px 10px" }}>{fmt(r[p].newFollowers)}</td>
                    <td style={{ padding: "5px 10px", color: ACCENT }}>{fmt(r[p].leadsDM)}</td>
                    <td style={{ padding: "5px 10px", color: "#4FD1C5" }}>{fmt(r[p].leadsUTM)}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: TEXT_MUTED, textAlign: "center" }}>
          Data is stored locally to this dashboard. Use "Add week" each week to keep it current — no need to re-upload the sheet.
        </div>
      </div>

      {!readOnly && showForm && (
        <WeekForm platforms={platforms} defaultWeek={rows[rows.length - 1]} onSave={saveEntry} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
