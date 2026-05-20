import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../lib/api';
import { GameStatus } from '@gamehub/shared';
import type { Game } from '@gamehub/shared';
import ImageUpload from '../components/ImageUpload';

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
  });

  const [error, setError] = useState('');

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
    saveMutation.mutate({
      title: form.title,
      slug: form.slug,
      description: form.description,
      status: form.status,
      executableNames: form.executableNames
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      installPathHints: form.installPathHints
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      youtubeDemoUrl: form.youtubeDemoUrl || undefined,
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
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
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
              <option key={s} value={s}>
                {s}
              </option>
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

        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Media</h3>
          <div className="space-y-4">
            {game?._id && (
              <>
                <ImageUpload
                  gameId={game._id}
                  type="cover"
                  currentUrl={game.coverImage?.url}
                  onSuccess={(url) => {
                    queryClient.invalidateQueries({
                      queryKey: ['admin', 'games', id],
                    });
                  }}
                />
                <ImageUpload
                  gameId={game._id}
                  type="banner"
                  currentUrl={game.bannerImage?.url}
                  onSuccess={(url) => {
                    queryClient.invalidateQueries({
                      queryKey: ['admin', 'games', id],
                    });
                  }}
                />
              </>
            )}
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
    </div>
  );
}

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
