"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [energy, setEnergy] = useState("");
  const [sleep, setSleep] = useState("");
  const [saved, setSaved] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem("training-settings") || "{}");
    setEnergy(settings.defaultEnergy || "");
    setSleep(settings.defaultSleep || "");
  }, []);

  function save() {
    localStorage.setItem("training-settings", JSON.stringify({ defaultEnergy: energy, defaultSleep: sleep }));
    setSaved(true);
  }

  async function updateApp() {
    if (!("serviceWorker" in navigator)) {
      setUpdateMessage("Updates are automatic in this browser.");
      return;
    }

    setUpdating(true);
    setUpdateMessage("Checking for the latest version…");

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        await navigator.serviceWorker.register("/sw.js");
      } else {
        await registration.update();
      }

      setUpdateMessage("Latest version checked. Reloading…");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("App update failed", error);
      setUpdateMessage("Could not check for updates. Try again while online.");
      setUpdating(false);
    }
  }

  return <main className="shell">
    <header className="workout-header"><div><p className="eyebrow">SETTINGS</p><h1>Defaults</h1></div><a href="/" className="ghost-link">Home</a></header>
    <section className="panel">
      <label className="label-block">Default energy /10<input inputMode="numeric" value={energy} onChange={(e) => setEnergy(e.target.value)} placeholder="Leave blank" /></label>
      <label className="label-block">Default sleep hours<input inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="Leave blank" /></label>
      <button className="primary big" onClick={save}>Save settings</button>
      {saved && <p className="success-text">Saved on this device.</p>}
    </section>

    <section className="panel">
      <p className="eyebrow">APP VERSION</p>
      <h2>Updates</h2>
      <p className="muted small">The installed app updates from the live site. You do not need to reinstall it.</p>
      <button className="primary big" onClick={updateApp} disabled={updating}>{updating ? "Checking…" : "Check for updates"}</button>
      {updateMessage && <p className="success-text">{updateMessage}</p>}
    </section>
  </main>;
}
