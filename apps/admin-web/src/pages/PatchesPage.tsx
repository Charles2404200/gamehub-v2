import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Game, PatchVersion } from '@gamehub/shared';
import UploadPatchModal from '../components/modals/UploadPatchModal';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-bg-overlay text-text-muted border-border',
  UPLOADING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  PROCESSING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PUBLISHED: 'bg-green-500/10 text-green-400 border-green-500/20',
  FAILED: 'bg-primary/10 text-primary border-primary/20',
  ARCHIVED: 'bg-bg-overlay text-text-disabled border-border',
  REPLACED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  const gb = bytes / 1_073_741_824;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1_048_576;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default function PatchesPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data: game } = useQuery<Game>({
    queryKey: ['admin', 'games', gameId],
    queryFn: () => api.get(`/admin/games/${gameId}`).then((r) => r.data),
  });

  const { data: patches = [], isLoading } = useQuery<PatchVersion[]>({
    queryKey: ['admin', 'games', gameId, 'patches'],
    queryFn: () => api.get(`/admin/games/${gameId}/patches`).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          className="p-1.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary"
          onClick={() => navigate('/games')}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Patches</h1>
          <p className="text-text-muted text-sm">{game?.title ?? gameId}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowUploadModal(true)}
        >
          <Plus size={16} />
          New Patch Version
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-text-muted font-medium">Version</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium hidden md:table-cell">Title</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium hidden lg:table-cell">Size</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium hidden lg:table-cell">Files</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-5 py-4 text-center text-text-muted">Loading…</td>
              </tr>
            )}
            {!isLoading && patches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-4 text-center text-text-muted">
                  No patch versions yet.
                </td>
              </tr>
            )}
            {patches.map((p) => (
              <tr key={p._id} className="hover:bg-bg-elevated/50 transition-colors group">
                <td className="px-5 py-3 font-mono text-text-primary">{p.version}</td>
                <td className="px-5 py-3 text-text-secondary hidden md:table-cell">{p.title}</td>
                <td className="px-5 py-3">
                  <span
                    className={`badge border ${STATUS_COLORS[p.status] ?? 'bg-bg-overlay text-text-muted border-border'}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-text-muted hidden lg:table-cell">
                  {formatBytes(p.totalSize)}
                </td>
                <td className="px-5 py-3 text-text-muted hidden lg:table-cell">
                  {p.fileCount ?? '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.status === 'PROCESSING' && (
                      <button
                        className="btn-primary text-xs px-3 py-1"
                        onClick={async () => {
                          await api.post(`/admin/patches/${p._id}/publish`);
                          queryClient.invalidateQueries({
                            queryKey: ['admin', 'games', gameId, 'patches'],
                          });
                        }}
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UploadPatchModal
        gameId={gameId!}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['admin', 'games', gameId, 'patches'],
          });
        }}
      />
    </div>
  );
}
