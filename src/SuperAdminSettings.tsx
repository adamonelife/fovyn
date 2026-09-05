import { useEffect, useState } from "react";
import { BarChart3, FlaskConical, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  clearTestData,
  getDataContext,
  setDataContext,
  type DataContext,
} from "./testMode";
import { resetGuidance } from "./guidanceRepository";
import {loadSuperAdminOverview,type SuperAdminOverview} from './analyticsRepository';

type FxStatus = {
  rate: number | null;
  updated: string | null;
  provider: string;
  status: "Healthy" | "Stale" | "Failed";
  error: string | null;
};

export default function SuperAdminSettings({ allowed }: { allowed: boolean }) {
  const {t}=useTranslation();
  const [context, setContextState] = useState<DataContext>(getDataContext()),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [fx, setFx] = useState<FxStatus | null>(null),
    [fxBusy, setFxBusy] = useState(false),
    [overview,setOverview]=useState<SuperAdminOverview|null>(null),
    [overviewError,setOverviewError]=useState(''),
    [overviewBusy,setOverviewBusy]=useState(false);
  const refreshOverview=async()=>{setOverviewBusy(true);setOverviewError('');try{setOverview(await loadSuperAdminOverview())}catch(error){setOverviewError(error instanceof Error?error.message:t('analytics.unavailable'))}finally{setOverviewBusy(false)}};
  const checkFx = async () => {
    setFxBusy(true);
    try {
      const response = await fetch("/api/fx?base=IDR&symbols=GBP"),
        body = (await response.json()) as {
          rates?: Record<string, number>;
          fetchedAt?: string;
          provider?: string;
          cacheState?: "fresh" | "cached" | "stale" | "failed";
          cacheError?: string | null;
          providerError?: string | null;
          error?: string;
          errorCode?: string;
        },
        inverse = body.rates?.GBP ? 1 / body.rates.GBP : null;
      setFx({
        rate:
          inverse && Number.isFinite(inverse) && inverse > 0 ? inverse : null,
        updated: body.fetchedAt ?? null,
        provider: body.provider ?? "Frankfurter v2",
        status:
          !response.ok || !inverse
            ? "Failed"
            : body.cacheState === "stale"
              ? "Stale"
              : "Healthy",
        error:
          body.error ??
          body.providerError ??
          body.cacheError ??
          (!inverse ? (body.errorCode ?? "RATE_NOT_FOUND") : null),
      });
    } catch (error) {
      setFx({
        rate: null,
        updated: null,
        provider: "Frankfurter v2",
        status: "Failed",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setFxBusy(false);
    }
  };
  useEffect(() => {
    checkFx();
    if(allowed)refreshOverview();
  }, [allowed]);
  if (!allowed) return null;
  const toggle = () => {
    const next = context === "test" ? "real" : "test";
    setDataContext(next);
    setContextState(next);
    location.reload();
  };
  const clear = async () => {
    if (
      !confirm(
        "Clear all Test data? This cannot be undone. Your real records will remain untouched.",
      )
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      await clearTestData();
      setNotice("Test data cleared. Your real records were not changed.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Test data could not be cleared.",
      );
    } finally {
      setBusy(false);
    }
  };
  const resetTutorials = async () => {
    setBusy(true);
    setNotice("");
    try {
      await resetGuidance();
      setNotice(
        "All Test tutorials reset. Open a feature to preview its introduction.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Test tutorials could not be reset.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-wrap super-admin-wrap">
      <section className="settings-panel super-admin-panel">
        <div className="settings-title">
          <div>
            <p className="eyebrow">DEVELOPER</p>
            <h2>Super Admin</h2>
          </div>
          <FlaskConical />
        </div>
        <div className="test-mode-row">
          <div>
            <b>Test Mode</b>
            <small>Isolated QA records only</small>
          </div>
          <button
            className={context === "test" ? "on" : ""}
            role="switch"
            aria-checked={context === "test"}
            onClick={toggle}
          >
            <i />
            {context === "test" ? "On" : "Off"}
          </button>
        </div>
        <p className="test-context-readout">
          Current data: <b>{context.toUpperCase()}</b>
        </p>
        <section className="admin-overview" aria-labelledby="admin-overview-title">
          <div className="settings-title">
            <div><p className="eyebrow">{overview?.release_label??(import.meta.env.VITE_FOVYN_ENVIRONMENT==='development'?'DEVELOPMENT':'FOVYN ALPHA')}</p><h3 id="admin-overview-title">{t('analytics.overview')}</h3></div>
            <button className="soft-button" disabled={overviewBusy} onClick={refreshOverview}><RefreshCw/> {overviewBusy?t('common.loading'):t('common.refresh')}</button>
          </div>
          <p className="panel-copy">{t('analytics.help')}</p>
          {overviewError&&<p className="settings-notice admin-overview-error">{overviewError}</p>}
          {overview&&<>
            <div className="admin-primary-metrics">
              <article><BarChart3/><span>{t('analytics.users')}</span><strong>{overview.users}</strong></article>
              <article><BarChart3/><span>{t('analytics.treesPlanted')}</span><strong>{overview.trees_planted}</strong></article>
            </div>
            <div className="admin-supporting-metrics">
              <article><span>{t('analytics.verifiedUsers')}</span><strong>{overview.verified_users}</strong></article>
              <article><span>{t('analytics.activeGoals')}</span><strong>{overview.active_goals}</strong></article>
              <article><span>{t('analytics.dormantTrees')}</span><strong>{overview.dormant_trees}</strong></article>
              <article><span>{t('analytics.heartwoodTrees')}</span><strong>{overview.heartwood_trees}</strong></article>
            </div>
            <div className="admin-recent-metrics"><p className="eyebrow">{t('analytics.lastSevenDays')}</p><dl><div><dt>{t('analytics.newUsers')}</dt><dd>{overview.new_users_last_7_days}</dd></div><div><dt>{t('analytics.treesPlanted')}</dt><dd>{overview.trees_planted_last_7_days}</dd></div></dl></div>
            <details className="admin-counter-diagnostics"><summary>QA diagnostics</summary><p>{t('analytics.excludedTestTrees')}: <b>{overview.excluded_test_trees}</b></p></details>
          </>}
        </section>
        <section className="fx-diagnostics" aria-label="FX status">
          <div className="settings-title">
            <div>
              <p className="eyebrow">FX STATUS</p>
              <h3>GBP → IDR</h3>
            </div>
            <button className="soft-button" disabled={fxBusy} onClick={checkFx}>
              <RefreshCw /> {fxBusy ? "Checking…" : "Check"}
            </button>
          </div>
          <dl>
            <div>
              <dt>Provider</dt>
              <dd>{fx?.provider ?? "Checking…"}</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>
                {fx?.rate
                  ? new Intl.NumberFormat(undefined, {
                      maximumFractionDigits: 4,
                    }).format(fx.rate)
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                {fx?.updated ? new Date(fx.updated).toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{fx?.status ?? "Checking"}</dd>
            </div>
            <div>
              <dt>Last error</dt>
              <dd>{fx?.error ?? "None"}</dd>
            </div>
          </dl>
        </section>
        {context === "test" && (
          <div className="super-admin-actions">
            <button
              className="soft-button"
              disabled={busy}
              onClick={resetTutorials}
            >
              <RotateCcw /> Reset All Test Tutorials
            </button>
            <button className="danger-button" disabled={busy} onClick={clear}>
              <Trash2 /> {busy ? "Working…" : "Clear Test Data"}
            </button>
          </div>
        )}
        {notice && <p className="settings-notice">{notice}</p>}
      </section>
    </div>
  );
}
