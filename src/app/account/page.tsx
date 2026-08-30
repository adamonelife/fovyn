"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function AccountPage() {
  const [displayName, setDisplayName] = useState("Adam");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        setMessage("Account created. Check your email if Supabase asks you to confirm it.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("Signed in successfully.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  }

  return <main className="shell">
    <header className="workout-header"><div><p className="eyebrow">FORBAIR ACCOUNT</p><h1>{mode === "signup" ? "Create your account" : "Sign in"}</h1></div><Link href="/" className="ghost-link">Home</Link></header>
    <section className="panel cardio-form">
      {mode === "signup" && <label className="label-block">Name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label>}
      <label className="label-block">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      <label className="label-block">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
      {message && <p className={message.includes("successfully") || message.startsWith("Account created") ? "success-text" : "danger-text"}>{message}</p>}
      <button className="primary big" disabled={busy || !email || password.length < 6} onClick={submit}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
      <button className="secondary full" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>{mode === "signup" ? "Already have an account? Sign in" : "Create a new account"}</button>
    </section>
  </main>;
}
