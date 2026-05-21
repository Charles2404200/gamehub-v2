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
  const [activeTab, setActiveTab] = useState<'info' | 'install'>('info');

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
      {/* Banner */}
      <div className="relative h-44 bg-[#111] shrink-0">
        {game.bannerImage ? (
          <img src={game.bannerImage.url} alt="" className="w-full h-full object-cover opacity-50" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      {/* Main layout */}
      <div className="px-5 pb-8 -mt-6 flex-1">
        {/* Title + action buttons */}
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{game.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {installedVersion && (
                <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded">
                  Đã cài: v{installedVersion}
                </span>
              )}
              {manifest && (
                <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                  Bản mới: v{manifest.version}
                </span>
              )}
              {hasUpdate && (
                <span className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 rounded">
                  Có bản cập nhật
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {game.installGuide && (
              <button
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
                           text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <BookOpen size={14} /> Hướng dẫn
              </button>
            )}
            {manifest && (
              <button
                onClick={() => setShowInstaller(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm
                           font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={14} />
                {hasUpdate ? 'Cập nhật' : installedVersion ? 'Cài lại' : 'Cài đặt'}
              </button>
            )}
          </div>
        </div>

        {/* Screenshots carousel */}
        {screenshots.length > 0 && (
          <ScreenshotCarousel screenshots={screenshots} />
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-800 mb-4 mt-4">
          {(['info', 'install'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'info' ? 'Thông tin game' : 'Cài đặt'}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <InfoTab game={game} />
        )}
        {activeTab === 'install' && manifest && (
          <div className="text-sm text-zinc-400">
            <p>
              Bấm nút <span className="text-white font-medium">Cài đặt</span> ở trên để bắt đầu cài
              bản việt hóa vào thư mục game của bạn.
            </p>
            {game.installGuide && (
              <button
                onClick={() => setShowGuide(true)}
                className="mt-3 flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm"
              >
                <BookOpen size={14} /> Xem hướng dẫn chi tiết
              </button>
            )}
          </div>
        )}
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
              <button
                onClick={() => setShowGuide(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
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

  return (
    <div className="space-y-5">
      {game.description && (
        <p className="text-sm text-zinc-300 leading-relaxed">{game.description}</p>
      )}

      {/* Credits */}
      {hasCredits && (
        <div className="grid grid-cols-3 gap-2">
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
      )}

      {/* Star rating placeholder */}
      <div className="flex items-center gap-1 text-yellow-400 text-lg">
        {'★★★★★'.split('').map((s, i) => (
          <span key={i}>{s}</span>
        ))}
        <span className="text-zinc-400 text-sm ml-1">5.0 / 5</span>
      </div>
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
// Screenshot Carousel
// ────────────────────────────────────────────────────────────────────────────

function ScreenshotCarousel({ screenshots }: { screenshots: Array<{ key: string; url: string }> }) {
  const [current, setCurrent] = useState(0);
  const total = screenshots.length;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div className="relative rounded-lg overflow-hidden bg-[#111] mb-2" style={{ aspectRatio: '16/7' }}>
      <img
        src={screenshots[current].url}
        alt={`screenshot ${current + 1}`}
        className="w-full h-full object-cover"
      />

      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80
                       text-white rounded-full p-1.5 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80
                       text-white rounded-full p-1.5 transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          {/* Thumbnail strip */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {screenshots.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? 'bg-white' : 'bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <span className="absolute top-2 right-2 text-xs text-white/60 bg-black/50 px-2 py-0.5 rounded-full">
        {current + 1} / {total}
      </span>
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
