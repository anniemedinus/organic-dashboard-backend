import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import PasswordGate from "./PasswordGate.jsx";
import { supabase } from "./supabaseClient.js";

// Same get/set/delete/list shape as Claude's artifact window.storage,
// but backed by a Supabase table (public.kv_store) so the Dashboard
// (edit) and Report (view) routes — and anyone else who loads either
// URL — read and write the same live data.
window.storage = {
  async get(key /*, shared */) {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: data.value, shared: true };
  },
  async set(key, value /*, shared */) {
    const { error } = await supabase.from("kv_store").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value, shared: true };
  },
  async delete(key /*, shared */) {
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true, shared: true };
  },
  async list(prefix = "" /*, shared */) {
    const { data, error } = await supabase.from("kv_store").select("key").like("key", `${prefix}%`);
    if (error) throw error;
    return { keys: (data || []).map((r) => r.key), prefix, shared: true };
  },
};

function DashboardRoute() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("dash-unlocked") === "1");
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <App readOnly={false} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App readOnly={true} />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
