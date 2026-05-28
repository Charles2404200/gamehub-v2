import { useState, useEffect } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'installing'
  | 'error';

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

interface UpdaterDebugInfo {
  source: string;
  action: string | null;
  at: string;
  message: string;
  name?: string;
  code?: string;
  stack?: string;
  raw?: string;
}

interface UpdaterCheckResult {
  isUpdateAvailable: boolean;
  hasDownloadPromise: boolean;
  updateInfo: {
    version?: string;
    releaseDate?: string;
    files?: Array<{ url?: string }>;
  } | null;
}

interface ForceUpdateModalProps {
  appVersion: string;
}

function normalizeUpdaterError(
  payload: unknown,
  source: string,
  action: string | null,
): UpdaterDebugInfo {
  const base = {
    source,
    action,
    at: new Date().toISOString(),
    message: 'Unknown updater error',
  };

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      return {
        source: typeof parsed.source === 'string' ? parsed.source : base.source,
        action: typeof parsed.action === 'string' ? parsed.action : base.action,
        at: typeof parsed.at === 'string' ? parsed.at : base.at,
        message: typeof parsed.message === 'string' ? parsed.message : payload,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
        code: typeof parsed.code === 'string' ? parsed.code : undefined,
        stack: typeof parsed.stack === 'string' ? parsed.stack : undefined,
        raw: payload,
      };
    } catch {
      return { ...base, message: payload, raw: payload };
    }
  }

  if (payload instanceof Error) {
    const withCode = payload as Error & { code?: string };
    return {
      ...base,
      message: payload.message,
      name: payload.name,
      code: withCode.code,
      stack: payload.stack,
      raw: String(payload),
    };
  }

  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    return {
      source: typeof obj.source === 'string' ? obj.source : base.source,
      action: typeof obj.action === 'string' ? obj.action : base.action,
      at: typeof obj.at === 'string' ? obj.at : base.at,
      message: typeof obj.message === 'string' ? obj.message : String(payload),
      name: typeof obj.name === 'string' ? obj.name : undefined,
      code: typeof obj.code === 'string' ? obj.code : undefined,
      stack: typeof obj.stack === 'string' ? obj.stack : undefined,
      raw: JSON.stringify(obj, null, 2),
    };
  }

  return { ...base, message: String(payload), raw: String(payload) };
}

const getAPI = () =>
  (window as unknown as { electronAPI: { updater: {
  check: () => Promise<unknown>;
  download: () => Promise<unknown>;
  install: () => Promise<unknown>;
  onChecking: (cb: () => void) => void;
  onAvailable: (cb: (info: unknown) => void) => void;
  onNotAvailable: (cb: (info: unknown) => void) => void;
  onProgress: (cb: (p: DownloadProgress) => void) => void;
  onDownloaded: (cb: (info: unknown) => void) => void;
  onError: (cb: (payload: unknown) => void) => void;
} } }).electronAPI?.updater;

export default function ForceUpdateModal({ appVersion }: ForceUpdateModalProps) {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [debugInfo, setDebugInfo] = useState<UpdaterDebugInfo | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

  useEffect(() => {
    const api = getAPI();
    if (!api) return;
    api.onChecking(() => setPhase('checking'));
    api.onAvailable((info) => {
      const result = info as { version?: string } | null;
      setLatestVersion(result?.version ?? null);
      setPhase('idle');
    });
    api.onNotAvailable((info) => {
      const result = info as { version?: string } | null;
      const version = result?.version ?? 'unknown';
      setLatestVersion(version);
      setPhase('error');
      setErrorMsg(`No downloadable update found. Current: ${appVersion}, latest: ${version}`);
      setDebugInfo({
        source: 'updater:event',
        action: 'not-available',
        at: new Date().toISOString(),
        message: `No downloadable update found. Current: ${appVersion}, latest: ${version}`,
        raw: JSON.stringify(info, null, 2),
      });
    });
    api.onProgress((p) => {
      setPhase('downloading');
      setProgress(Math.round(p.percent));
    });
    api.onDownloaded(() => setPhase('ready'));
    api.onError((payload) => {
      const info = normalizeUpdaterError(payload, 'updater:event', null);
      setPhase('error');
      setErrorMsg(info.message);
      setDebugInfo(info);
    });
  }, []);

  async function handleUpdate() {
    setPhase('checking');
    setErrorMsg('');
    setDebugInfo(null);
    try {
      const result = (await getAPI()?.check()) as UpdaterCheckResult | null;
      const version = result?.updateInfo?.version ?? null;
      setLatestVersion(version);

      if (!result) {
        throw new Error('Updater check returned no result');
      }

      if (!result.isUpdateAvailable) {
        throw new Error(
          `No downloadable update found. Current: ${appVersion}, latest: ${version ?? 'unknown'}`,
        );
      }

      setPhase('downloading');
      await getAPI()?.download();
    } catch (err) {
      const info = normalizeUpdaterError(err, 'renderer:catch', 'check/download');
      setPhase('error');
      setErrorMsg(info.message);
      setDebugInfo(info);
    }
  }

  async function handleInstall() {
    setPhase('installing');
    try {
      await getAPI()?.install();
    } catch (err) {
      const info = normalizeUpdaterError(err, 'renderer:catch', 'install');
      setPhase('error');
      setErrorMsg(info.message);
      setDebugInfo(info);
    }
  }

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-2">Update Required</h2>
        <p className="text-sm text-zinc-400 text-center mb-6">
          A new version of GameHub Launcher is required to continue. Please update to proceed.
        </p>

        {/* Progress */}
        {phase === 'downloading' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Downloading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-center">
              {errorMsg || 'Update failed. Please try again.'}
            </p>
            {debugInfo && (
              <div className="text-[10px] text-zinc-300 bg-zinc-900/90 border border-zinc-700 rounded px-3 py-2">
                <p className="text-zinc-100 font-semibold mb-1">Updater Debug</p>
                <pre className="whitespace-pre-wrap break-all leading-4">{JSON.stringify({
                  source: debugInfo.source,
                  action: debugInfo.action,
                  message: debugInfo.message,
                  code: debugInfo.code,
                  name: debugInfo.name,
                  at: debugInfo.at,
                  phase,
                  appVersion,
                  latestVersion,
                  apiBase: API_BASE,
                  stack: debugInfo.stack,
                }, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Phase label */}
        {phase === 'checking' && (
          <p className="text-xs text-zinc-400 text-center mb-4 animate-pulse">
            Checking for update…
          </p>
        )}
        {phase === 'installing' && (
          <p className="text-xs text-zinc-400 text-center mb-4 animate-pulse">
            Installing update…
          </p>
        )}

        {/* Action button */}
        {phase === 'ready' ? (
          <button
            onClick={handleInstall}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Install &amp; Restart
          </button>
        ) : phase === 'error' ? (
          <button
            onClick={handleUpdate}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        ) : (
          <button
            onClick={handleUpdate}
            disabled={phase === 'checking' || phase === 'downloading' || phase === 'installing'}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            {phase === 'idle' ? 'Update Now' : 'Updating…'}
          </button>
        )}
      </div>
    </div>
  );
}
