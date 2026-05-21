import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Download, FolderOpen, Play, CheckCircle, XCircle } from 'lucide-react';
import type { Game, PatchManifest } from '@gamehub/shared';

type InstallPhase = 'idle' | 'downloading' | 'installing' | 'done' | 'error';

interface ElectronAPI {
  fs: {
    selectGameFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    validateGamePath: (p: string, names: string[]) => Promise<{ valid: boolean; reason?: string }>;
    readInstallReceipt: (p: string) => Promise<{ version: string } | null>;
    writeInstallReceipt: (p: string, d: unknown) => Promise<{ ok: boolean }>;
    installPatch: (opts: { manifest: PatchManifest; gamePath: string; cacheDir: string; backupDir: string }) => Promise<{ ok: boolean; receipt?: unknown; error?: string }>;
  };
  onInstallProgress: (cb: (p: { phase: string; percent: number }) => void) => void;
}

const EA = (window as unknown as { electronAPI: ElectronAPI }).electronAPI;

function receiptPath(slug: string): string {
  // electron exposes app.getPath('appData') via IPC — but here we use a convention
  // The real path will be resolved in the main process; this is just a key.
  return `gamehub-receipt:${slug}`;
}

export default function GameDetailPage({ apiBase }: { apiBase: string }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [manifest, setManifest] = useState<PatchManifest | null>(null);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [gamePath, setGamePath] = useState('');
  const [phase, setPhase] = useState<InstallPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!slug) return;
    axios.get<Game>(`${apiBase}/launcher/games/${slug}`).then(({ data }) => setGame(data));

    // Try to read install receipt from disk
    EA.fs.readInstallReceipt(receiptPath(slug)).then((r) => {
      if (r) setInstalledVersion(r.version);
    });
  }, [slug, apiBase]);

  useEffect(() => {
    if (!game?.latestPatchVersionId) return;
    axios
      .get<PatchManifest>(`${apiBase}/launcher/patches/${game.latestPatchVersionId}/manifest`)
      .then(({ data }) => setManifest(data));
  }, [game, apiBase]);

  useEffect(() => {
    EA.onInstallProgress((p) => {
      setProgress(Math.round(p.percent ?? 0));
    });
  }, []);

  const handleInstall = useCallback(async () => {
    if (!manifest || !gamePath.trim()) return;
    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');

    const result = await EA.fs.installPatch({
      manifest,
      gamePath: gamePath.trim(),
      cacheDir: `gamehub-cache:${slug}`,
      backupDir: `gamehub-backup:${slug}`,
    });

    if (result.ok) {
      setPhase('done');
      setInstalledVersion(manifest.version);
      await EA.fs.writeInstallReceipt(receiptPath(slug!), { version: manifest.version });
    } else {
      setPhase('error');
      setErrorMsg(result.error ?? 'Unknown error');
    }
  }, [manifest, gamePath, slug]);

  const handleBrowseFolder = useCallback(async () => {
    const result = await EA.fs.selectGameFolder();
    if (!result.canceled && result.filePaths.length > 0) {
      const folder = result.filePaths[0];
      // Validate game path
      if (game?.executableNames) {
        const validation = await EA.fs.validateGamePath(folder, game.executableNames);
        if (validation.valid) {
          setGamePath(folder);
          setErrorMsg('');
        } else {
          setErrorMsg(validation.reason || 'Invalid game folder');
          setGamePath(folder);
        }
      } else {
        setGamePath(folder);
      }
    }
  }, [game]);

  if (!game) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    );
  }

  const hasUpdate = manifest && installedVersion !== manifest.version;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-y-auto">
      {/* Banner */}
      <div className="relative h-48 bg-[#111] shrink-0">
        {game.bannerImage ? (
          <img src={game.bannerImage.url} alt="" className="w-full h-full object-cover opacity-60" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4 flex-1">
        <h1 className="text-2xl font-bold mb-1">{game.title}</h1>
        {game.description && (
          <p className="text-sm text-zinc-400 mb-5">{game.description}</p>
        )}

        {/* Version info */}
        <div className="flex items-center gap-3 mb-5">
          {installedVersion && (
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-1 rounded">
              Installed: v{installedVersion}
            </span>
          )}
          {manifest && (
            <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded">
              Latest: v{manifest.version}
            </span>
          )}
          {hasUpdate && (
            <span className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-1 rounded">
              Update available
            </span>
          )}
        </div>

        {/* Install section */}
        {manifest && (
          <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-4">
            <p className="text-sm font-semibold mb-3">
              {hasUpdate ? 'Install Update' : installedVersion ? 'Reinstall' : 'Install'}
            </p>

            {/* Game path input */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <FolderOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded pl-9 pr-3 py-2 text-sm
                             text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Select game folder…"
                  value={gamePath}
                  onChange={(e) => setGamePath(e.target.value)}
                />
              </div>
              <button
                onClick={handleBrowseFolder}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors border border-zinc-700"
              >
                Browse
              </button>
            </div>

            {/* Progress bar */}
            {(phase === 'downloading' || phase === 'installing') && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>{phase === 'downloading' ? 'Downloading…' : 'Installing…'}</span>
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

            {/* Status messages */}
            {phase === 'done' && (
              <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
                <CheckCircle size={15} /> Installation complete
              </div>
            )}
            {phase === 'error' && (
              <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2 mb-3">
                <XCircle size={13} className="mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                disabled={!gamePath.trim() || phase === 'downloading' || phase === 'installing'}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed
                           text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={14} />
                {phase === 'downloading' || phase === 'installing' ? 'Installing…' : hasUpdate ? 'Update' : 'Install'}
              </button>
              {game.executableNames?.[0] && installedVersion && (
                <button
                  onClick={() => {
                    /* Launch handled by main if we add shell.openPath IPC */
                  }}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold
                             px-4 py-2 rounded-lg transition-colors border border-zinc-700"
                >
                  <Play size={14} />
                  Launch
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
