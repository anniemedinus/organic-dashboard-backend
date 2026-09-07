import React, { useState } from "react";

const BG = "#161A20";
const CARD = "#1E232C";
const CARD_BORDER = "#2A3038";
const TEXT = "#EDEFF2";
const TEXT_MUTED = "#8A93A3";
const ACCENT = "#E07A3F";

export default function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_DASHBOARD_PASSWORD;
    if (!expected || value === expected) {
      sessionStorage.setItem("dash-unlocked", "1");
      onUnlock();
    } else {
      setErr(true);
    }
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: 28, width: 300 }}>
        <div style={{ color: TEXT, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Dashboard access</div>
        <div style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 16 }}>Enter the password to edit this data.</div>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => { setValue(e.target.value); setErr(false); }}
          style={{ width: "100%", background: BG, border: `1px solid ${err ? "#E8695E" : CARD_BORDER}`, borderRadius: 7, padding: "9px 10px", color: TEXT, fontSize: 14, boxSizing: "border-box" }}
        />
        {err && <div style={{ color: "#E8695E", fontSize: 12, marginTop: 6 }}>Incorrect password.</div>}
        <button type="submit" style={{ marginTop: 14, width: "100%", background: ACCENT, color: "#241B0A", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 700, cursor: "pointer" }}>
          Unlock
        </button>
      </form>
    </div>
  );
}
