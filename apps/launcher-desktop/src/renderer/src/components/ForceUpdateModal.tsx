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

const getAPI = () =>
  (window as unknown as { electronAPI: { updater: {
  check: () => Promise<unknown>;
  download: () => Promise<unknown>;
  install: () => Promise<unknown>;
  onChecking: (cb: () => void) => void;
  onAvailable: (cb: (info: unknown) => void) => void;
  onProgress: (cb: (p: DownloadProgress) => void) => void;
  onDownloaded: (cb: (info: unknown) => void) => void;
  onError: (cb: (msg: string) => void) => void;
} } }).electronAPI?.updater;

export default function ForceUpdateModal() {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const api = getAPI();
    if (!api) return;
    api.onChecking(() => setPhase('checking'));
    api.onAvailable(() => setPhase('idle'));
    api.onProgress((p) => {
      setPhase('downloading');
      setProgress(Math.round(p.percent));
    });
    api.onDownloaded(() => setPhase('ready'));
    api.onError((msg) => {
      setPhase('error');
      setErrorMsg(msg);
    });
  }, []);

  async function handleUpdate() {
    setPhase('checking');
    setErrorMsg('');
    try {
      await getAPI()?.check();
      setPhase('downloading');
      await getAPI()?.download();
    } catch (err) {
      setPhase('error');
      setErrorMsg(String(err));
    }
  }

  async function handleInstall() {
    setPhase('installing');
    await getAPI()?.install();
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
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-4 text-center">
            {errorMsg || 'Update failed. Please try again.'}
          </p>
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
