import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Upload, X, Plus, Link, ImageIcon, PackagePlus } from 'lucide-react';
import { api } from '../lib/api';
import { GameStatus } from '@gamehub/shared';
import type { Game } from '@gamehub/shared';
import ImageUpload from '../components/ImageUpload';
import UploadPatchModal from '../components/modals/UploadPatchModal';

const STATUS_OPTIONS: GameStatus[] = [GameStatus.DRAFT, GameStatus.ACTIVE];

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: game } = useQuery<Game>({
    queryKey: ['admin', 'games', id],
    queryFn: () => api.get(`/admin/games/${id}`).then((r) => r.data),
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    status: 'DRAFT' as GameStatus,
    executableNames: '',
    installPathHints: '',
    youtubeDemoUrl: '',
    installGuide: '',
    credits: {
      production: '',
      technical: '',
      translation: '',
      testing: '',
    },
  });

  const [error, setError] = useState('');
  const [showUploadPatch, setShowUploadPatch] = useState(false);

  useEffect(() => {
    if (game) {
      setForm({
        title: game.title,
        slug: game.slug,
        description: game.description,
        status: game.status,
        executableNames: game.executableNames.join(', '),
        installPathHints: game.installPathHints.join(', '),
        youtubeDemoUrl: game.youtubeDemoUrl ?? '',
        installGuide: game.installGuide ?? '',
        credits: {
          production: (game.credits?.production ?? []).join(', '),
          technical: (game.credits?.technical ?? []).join(', '),
          translation: (game.credits?.translation ?? []).join(', '),
          testing: (game.credits?.testing ?? []).join(', '),
        },
      });
    }
  }, [game]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      isNew
        ? api.post('/admin/games', payload).then((r) => r.data)
        : api.patch(`/admin/games/${id}`, payload).then((r) => r.data),
    onSuccess: (saved: Game) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'games'] });
      if (isNew) navigate(`/games/${saved._id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Save failed';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const splitTrim = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
    saveMutation.mutate({
      title: form.title,
      slug: form.slug,
      description: form.description,
      status: form.status,
      executableNames: splitTrim(form.executableNames),
      installPathHints: splitTrim(form.installPathHints),
      youtubeDemoUrl: form.youtubeDemoUrl || undefined,
      installGuide: form.installGuide || undefined,
      credits: {
        production: splitTrim(form.credits.production),
        technical: splitTrim(form.credits.technical),
        translation: splitTrim(form.credits.translation),
        testing: splitTrim(form.credits.testing),
      },
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary"
          onClick={() => navigate('/games')}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">
          {isNew ? 'New Game' : 'Edit Game'}
        </h1>
        {!isNew && game?._id && (
          <button
            type="button"
            className="ml-auto flex items-center gap-1.5 btn-primary text-sm px-3 py-1.5"
            onClick={() => setShowUploadPatch(true)}
          >
            <PackagePlus size={14} /> Upload Patch
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/* ── Basic Info ── */}
        <Field label="Title" required>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </Field>

        <Field label="Slug" hint="lowercase, hyphens only" required>
          <input
            className="input font-mono"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            pattern="[a-z0-9-]+"
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            className="input min-h-[80px] resize-none"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
          />
        </Field>

        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GameStatus }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Executable Names" hint="comma-separated, e.g. game.exe, launcher.exe">
          <input
            className="input"
            value={form.executableNames}
            onChange={(e) => setForm((f) => ({ ...f, executableNames: e.target.value }))}
          />
        </Field>

        <Field label="Install Path Hints" hint="comma-separated folder name hints">
          <input
            className="input"
            value={form.installPathHints}
            onChange={(e) => setForm((f) => ({ ...f, installPathHints: e.target.value }))}
          />
        </Field>

        <Field label="YouTube Demo URL">
          <input
            className="input"
            type="url"
            value={form.youtubeDemoUrl}
            onChange={(e) => setForm((f) => ({ ...f, youtubeDemoUrl: e.target.value }))}
            placeholder="https://youtube.com/watch?v=..."
          />
        </Field>

        {/* ── Installation Guide ── */}
        <div className="border-t border-border pt-4 mt-2">
          <h3 className="text-sm font-semibold text-text-secondary mb-2">Hướng dẫn cài đặt</h3>
          <textarea
            className="input min-h-[120px] resize-y font-mono text-xs"
            value={form.installGuide}
            onChange={(e) => setForm((f) => ({ ...f, installGuide: e.target.value }))}
            placeholder="Nhập hướng dẫn cài đặt bản việt hóa..."
            rows={5}
          />
        </div>

        {/* ── Credits ── */}
        <div className="border-t border-border pt-4 mt-2">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Credits nhóm dịch</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Thực hiện">
              <input
                className="input"
                value={form.credits.production}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: { ...f.credits, production: e.target.value } }))
                }
                placeholder="Tên, tên, ..."
              />
            </Field>
            <Field label="Kỹ thuật">
              <input
                className="input"
                value={form.credits.technical}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: { ...f.credits, technical: e.target.value } }))
                }
                placeholder="Tên, tên, ..."
              />
            </Field>
            <Field label="Dịch thuật">
              <input
                className="input"
                value={form.credits.translation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: { ...f.credits, translation: e.target.value } }))
                }
                placeholder="Tên, tên, ..."
              />
            </Field>
            <Field label="Test">
              <input
                className="input"
                value={form.credits.testing}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: { ...f.credits, testing: e.target.value } }))
                }
                placeholder="Tên, tên, ..."
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="text-sm text-primary bg-primary-muted/20 border border-primary/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={saveMutation.isPending}
          >
            <Save size={15} />
            {saveMutation.isPending ? 'Saving…' : 'Save Game'}
          </button>
        </div>
      </form>

      {/* ── Media section (only for existing games) ── */}
      {!isNew && game?._id && (
        <div className="card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-text-secondary">Media</h3>
          <div className="space-y-4">
            <ImageUpload
              gameId={game._id}
              type="cover"
              currentUrl={game.coverImage?.url}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin', 'games', id] })}
            />
            <ImageUpload
              gameId={game._id}
              type="banner"
              currentUrl={game.bannerImage?.url}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin', 'games', id] })}
            />
          </div>

          <ScreenshotsSection
            gameId={game._id}
            screenshots={game.screenshots ?? []}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ['admin', 'games', id] })}
          />
        </div>
      )}

      {/* Upload patch modal */}
      {game?._id && (
        <UploadPatchModal
          gameId={game._id}
          isOpen={showUploadPatch}
          onClose={() => setShowUploadPatch(false)}
          onSuccess={() => {
            setShowUploadPatch(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'games'] });
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Screenshots sub-component
// ────────────────────────────────────────────────────────────────────────────

interface ScreenshotsSectionProps {
  gameId: string;
  screenshots: Array<{ key: string; url: string }>;
  onChanged: () => void;
}

function ScreenshotsSection({ gameId, screenshots, onChanged }: ScreenshotsSectionProps) {
  const [urlInput, setUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function addByUrl() {
    if (!urlInput.trim()) return;
    setErr('');
    try {
      await api.post(`/admin/games/${gameId}/screenshots`, { url: urlInput.trim() });
      setUrlInput('');
      onChanged();
    } catch {
      setErr('Không thể thêm ảnh');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr('');
    try {
      const { key, uploadUrl } = await api
        .post(`/admin/games/${gameId}/screenshots/presign`)
        .then((r) => r.data);
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'image/webp' },
      });
      await api.post(`/admin/games/${gameId}/screenshots`, { key });
      onChanged();
    } catch {
      setErr('Upload thất bại');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeScreenshot(key: string) {
    try {
      await api.delete(`/admin/games/${gameId}/screenshots`, { data: { key } });
      onChanged();
    } catch {
      setErr('Không thể xóa ảnh');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-text-secondary">
          Screenshots ({screenshots.length})
        </h4>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              uploadMode === 'url'
                ? 'bg-primary text-white'
                : 'bg-bg-elevated text-text-muted hover:text-text-primary'
            }`}
          >
            <Link size={11} /> Link
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              uploadMode === 'file'
                ? 'bg-primary text-white'
                : 'bg-bg-elevated text-text-muted hover:text-text-primary'
            }`}
          >
            <Upload size={11} /> Upload
          </button>
        </div>
      </div>

      {uploadMode === 'url' ? (
        <div className="flex gap-2 mb-3">
          <input
            className="input flex-1 text-sm"
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addByUrl())}
          />
          <button
            type="button"
            onClick={addByUrl}
            className="btn-primary px-3 text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Thêm
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 border border-dashed border-border rounded px-4 py-2.5
                       text-sm text-text-muted hover:text-text-primary hover:border-primary/50 w-full
                       justify-center transition-colors disabled:opacity-50"
          >
            <ImageIcon size={16} />
            {uploading ? 'Đang upload…' : 'Chọn ảnh để upload'}
          </button>
        </div>
      )}

      {err && <p className="text-xs text-primary mb-2">{err}</p>}

      {screenshots.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {screenshots.map((s, i) => (
            <div
              key={s.key}
              className="relative group rounded overflow-hidden bg-bg-elevated"
              style={{ aspectRatio: '16/9' }}
            >
              <img src={s.url} alt={`screenshot ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeScreenshot(s.key)}
                className="absolute top-1 right-1 p-0.5 bg-black/70 rounded opacity-0
                           group-hover:opacity-100 transition-opacity text-white hover:bg-red-600"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted text-center py-4 border border-dashed border-border rounded">
          Chưa có screenshot nào
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Field wrapper
// ────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1 mb-1">
        <label className="text-sm font-medium text-text-secondary">
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-text-muted">— {hint}</span>}
      </div>
      {children}
    </div>
  );
}
