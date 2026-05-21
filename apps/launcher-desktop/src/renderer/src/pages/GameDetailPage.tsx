import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Download, FolderOpen, Play, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, BookOpen, X as XIcon,
} from 'lucide-react';
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

export default function GameDetailPage({ apiBase }: { apiBase: string }) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [manifest, setManifest] = useState<PatchManifest | null>(null);
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [showInstaller, setShowInstaller] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!slug) return;
    axios.get<Game>(`${apiBase}/launcher/games/${slug}`).then(({ data }) => setGame(data));
    EA.fs.readInstallReceipt(`gamehub-receipt:${slug}`).then((r) => {
      if (r) setInstalledVersion(r.version);
    });
  }, [slug, apiBase]);

  useEffect(() => {
    if (!game?.latestPatchVersionId) return;
    axios
      .get<PatchManifest>(`${apiBase}/launcher/patches/${game.latestPatchVersionId}/manifest`)
      .then(({ data }) => setManifest(data));
  }, [game, apiBase]);

  if (!game) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading…</p>
      </div>
    );
  }

  const hasUpdate = manifest && installedVersion !== manifest.version;
  const screenshots = game.screenshots ?? [];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-y-auto">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur border-b border-zinc-800/60
                      flex items-center justify-between px-4 py-2.5 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} /> Quay lại
        </button>
        <p className="text-sm font-medium text-zinc-200 truncate max-w-xs">{game.title}</p>
        <div className="flex items-center gap-2">
          {game.installGuide && (
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                         text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <BookOpen size={13} /> Hướng dẫn
            </button>
          )}
          {manifest && (
            <button
              onClick={() => setShowInstaller(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs
                         font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download size={13} />
              {hasUpdate ? 'Cập nhật' : installedVersion ? 'Cài lại' : 'Cài đặt'}
            </button>
          )}
        </div>
      </div>

      {/* ── Hero: 2-column ── */}
      <div className="flex gap-4 px-4 pt-4 pb-3 shrink-0">
        {/* Left: screenshots */}
        <div className="flex-1 min-w-0">
          {screenshots.length > 0 ? (
            <ScreenshotCarousel screenshots={screenshots} />
          ) : game.bannerImage ? (
            <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
              <img src={game.bannerImage.url} alt="" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 flex items-center
                            justify-center text-zinc-600 text-sm" style={{ aspectRatio: '16/9' }}>
              Chưa có ảnh
            </div>
          )}
        </div>

        {/* Right: cover + info */}
        <div className="w-44 shrink-0 flex flex-col gap-3">
          {/* Cover */}
          <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
               style={{ aspectRatio: '3/4' }}>
            {game.coverImage ? (
              <img src={game.coverImage.url} alt={game.title}
                   className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                No cover
              </div>
            )}
          </div>

          {/* Version badges */}
          <div className="space-y-1">
            {installedVersion && (
              <div className="text-xs bg-green-500/10 border border-green-500/20 text-green-400
                              px-2 py-1 rounded-lg text-center">
                Đã cài v{installedVersion}
              </div>
            )}
            {manifest && (
              <div className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300
                              px-2 py-1 rounded-lg text-center">
                Bản mới v{manifest.version}
              </div>
            )}
            {hasUpdate && (
              <div className="text-xs bg-red-500/10 border border-red-500/30 text-red-400
                              px-2 py-1 rounded-lg text-center">
                Có cập nhật
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 mt-auto">
            {manifest && (
              <button
                onClick={() => setShowInstaller(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700
                           text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
              >
                <Download size={13} />
                {hasUpdate ? 'Cập nhật' : installedVersion ? 'Cài lại' : 'Cài đặt'}
              </button>
            )}
            {game.installGuide && (
              <button
                onClick={() => setShowGuide(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-zinc-800
                           hover:bg-zinc-700 border border-zinc-700 text-white text-xs
                           font-medium py-2 rounded-xl transition-colors"
              >
                <BookOpen size={12} /> Hướng dẫn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pb-8 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold leading-tight text-white">{game.title}</h1>
        </div>

        {/* Description */}
        {game.description && (
          <p className="text-sm text-zinc-300 leading-relaxed">{game.description}</p>
        )}

        {/* YouTube */}
        {game.youtubeDemoUrl && (
          <a
            href={game.youtubeDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z" />
            </svg>
            Xem trailer trên YouTube
          </a>
        )}

        {/* Credits */}
        <InfoTab game={game} />
      </div>

      {/* Installer Dialog */}
      {showInstaller && manifest && (
        <InstallerDialog
          game={game}
          manifest={manifest}
          slug={slug!}
          installedVersion={installedVersion}
          onDone={(version) => {
            setInstalledVersion(version);
            setShowInstaller(false);
          }}
          onClose={() => setShowInstaller(false)}
        />
      )}

      {/* Installation guide modal */}
      {showGuide && game.installGuide && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BookOpen size={16} className="text-red-400" /> Hướng dẫn cài đặt
              </h3>
              <button onClick={() => setShowGuide(false)} className="text-zinc-500 hover:text-white transition-colors">
                <XIcon size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {game.installGuide}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Info Tab
// ────────────────────────────────────────────────────────────────────────────

function InfoTab({ game }: { game: Game }) {
  const credits = game.credits;
  const hasCredits =
    credits &&
    (
      (credits.production?.length ?? 0) +
      (credits.technical?.length ?? 0) +
      (credits.translation?.length ?? 0) +
      (credits.testing?.length ?? 0)
    ) > 0;

  if (!hasCredits) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {credits.translation?.length > 0 && (
        <CreditsCard label="Dịch thuật" names={credits.translation} color="text-cyan-400" />
      )}
      {credits.technical?.length > 0 && (
        <CreditsCard label="Kỹ thuật" names={credits.technical} color="text-green-400" />
      )}
      {credits.production?.length > 0 && (
        <CreditsCard label="Thực hiện" names={credits.production} color="text-amber-400" />
      )}
      {credits.testing?.length > 0 && (
        <CreditsCard label="Hỗ trợ / Test" names={credits.testing} color="text-purple-400" />
      )}
    </div>
  );
}
function CreditsCard({ label, names, color }: { label: string; names: string[]; color: string }) {
  return (
    <div className="bg-[#141414] border border-zinc-800 rounded-lg px-3 py-2.5">
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${color}`}>{label}</p>
      {names.map((n) => (
        <p key={n} className="text-sm text-zinc-300 leading-snug">{n}</p>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Screenshot Carousel with thumbnail strip
// ────────────────────────────────────────────────────────────────────────────

function ScreenshotCarousel({ screenshots }: { screenshots: Array<{ key: string; url: string }> }) {
  const [current, setCurrent] = useState(0);
  const thumbRef = useRef<HTMLDivElement>(null);
  const total = screenshots.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  useEffect(() => {
    // Scroll active thumbnail into view
    const el = thumbRef.current?.children[current] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [current]);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Main image */}
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        <img
          key={screenshots[current].url}
          src={screenshots[current].url}
          alt={`screenshot ${current + 1}`}
          className="w-full h-full object-contain"
        />
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80
                         text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80
                         text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}
        <span className="absolute top-2 right-2 text-xs text-white/60 bg-black/50 px-1.5 py-0.5 rounded-full">
          {current + 1} / {total}
        </span>
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div ref={thumbRef} className="flex gap-1.5 overflow-x-auto pb-0.5"
             style={{ scrollbarWidth: 'none' }}>
          {screenshots.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setCurrent(i)}
              className={`shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                i === current ? 'border-red-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
              style={{ width: 72, aspectRatio: '16/9' }}
            >
              <img src={s.url} alt="" className="w-full h-full object-contain bg-black" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Installer Dialog
// ────────────────────────────────────────────────────────────────────────────

interface InstallerDialogProps {
  game: Game;
  manifest: PatchManifest;
  slug: string;
  installedVersion: string | null;
  onDone: (version: string) => void;
  onClose: () => void;
}

function InstallerDialog({
  game,
  manifest,
  slug,
  installedVersion,
  onDone,
  onClose,
}: InstallerDialogProps) {
  const [gamePath, setGamePath] = useState('');
  const [phase, setPhase] = useState<InstallPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    EA.onInstallProgress((p) => {
      setProgress(Math.round(p.percent ?? 0));
    });
  }, []);

  const handleBrowse = useCallback(async () => {
    const result = await EA.fs.selectGameFolder();
    if (!result.canceled && result.filePaths.length > 0) {
      const folder = result.filePaths[0];
      if (game.executableNames?.length) {
        const validation = await EA.fs.validateGamePath(folder, game.executableNames);
        setGamePath(folder);
        if (!validation.valid) setErrorMsg(validation.reason || 'Thư mục không hợp lệ');
        else setErrorMsg('');
      } else {
        setGamePath(folder);
        setErrorMsg('');
      }
    }
  }, [game]);

  const handleInstall = useCallback(async () => {
    if (!gamePath.trim()) return;
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
      await EA.fs.writeInstallReceipt(`gamehub-receipt:${slug}`, { version: manifest.version });
      setTimeout(() => onDone(manifest.version), 1200);
    } else {
      setPhase('error');
      setErrorMsg(result.error ?? 'Cài đặt thất bại');
    }
  }, [manifest, gamePath, slug, onDone]);

  const busy = phase === 'downloading' || phase === 'installing';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-[#161616] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">Cài đặt bản việt hóa</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{game.title} — v{manifest.version}</p>
          </div>
          {!busy && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <XIcon size={18} />
            </button>
          )}
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Path input */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">
              Chọn thư mục game để cài đặt vào
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  className="w-full bg-[#0d0d0d] border border-zinc-700 rounded-lg pl-9 pr-3 py-2.5
                             text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50
                             transition-colors disabled:opacity-50"
                  placeholder="D:\Games\MyGame"
                  value={gamePath}
                  onChange={(e) => setGamePath(e.target.value)}
                  disabled={busy}
                />
              </div>
              <button
                onClick={handleBrowse}
                disabled={busy}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm
                           font-medium px-3 py-2.5 rounded-lg transition-colors border border-zinc-700"
              >
                Duyệt
              </button>
            </div>
            {errorMsg && phase === 'idle' && (
              <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
            )}
          </div>

          {/* Progress */}
          {busy && (
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                <span>{phase === 'downloading' ? 'Đang tải file…' : 'Đang cài đặt…'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} /> Cài đặt hoàn tất!
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10
                            border border-red-500/20 rounded-lg px-3 py-2">
              <XCircle size={13} className="mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Install button */}
          {phase !== 'done' && (
            <button
              onClick={handleInstall}
              disabled={!gamePath.trim() || busy}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700
                         disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold
                         py-3 rounded-xl transition-colors"
            >
              <Download size={15} />
              {busy ? 'Đang cài đặt…' : installedVersion ? 'Cập nhật / Cài lại' : 'Bắt đầu cài đặt'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// end of file
