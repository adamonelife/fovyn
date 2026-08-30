"use client";

import { useEffect, useState } from "react";
import { getPendingWorkouts, syncPendingWorkouts } from "@/lib/offline";

export default function PwaRegister() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(getPendingWorkouts().length);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        if (registration.waiting) setWaitingWorker(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setWaitingWorker(worker);
          });
        });
        void registration.update();
      }).catch((error) => console.error("Service worker registration failed", error));
    }

    let refreshing = false;
    function refreshForUpdate() {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    }

    async function sync() {
      setOnline(true);
      setSyncing(true);
      const result = await syncPendingWorkouts();
      setPending(result.remaining);
      setSyncing(false);
    }

    function offline() {
      setOnline(false);
    }

    function syncState(event: Event) {
      const custom = event as CustomEvent<{ pending?: number }>;
      setPending(custom.detail?.pending ?? getPendingWorkouts().length);
    }

    window.addEventListener("online", sync);
    window.addEventListener("offline", offline);
    window.addEventListener("training-sync-state", syncState);
    navigator.serviceWorker?.addEventListener("controllerchange", refreshForUpdate);
    if (navigator.onLine) void sync();

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", offline);
      window.removeEventListener("training-sync-state", syncState);
      navigator.serviceWorker?.removeEventListener("controllerchange", refreshForUpdate);
    };
  }, []);

  if (waitingWorker) return (
    <div className="connectivity-banner update-ready">
      <span>A new FORBAIR version is ready</span>
      <button onClick={() => waitingWorker.postMessage({ type: "SKIP_WAITING" })}>Update now</button>
    </div>
  );

  if (online && pending === 0) return null;

  return (
    <div className={`connectivity-banner ${online ? "pending" : "offline"}`}>
      {!online ? "Offline — workouts will save on this phone" : syncing ? "Syncing saved workouts…" : `${pending} workout${pending === 1 ? "" : "s"} waiting to sync`}
    </div>
  );
}
