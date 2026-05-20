import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import type { Game } from '@gamehub/shared';

export default function GamesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ['admin', 'games'],
    queryFn: () => api.get('/admin/games').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/games/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'games'] }),
  });

  const filtered = games.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.slug.toLowerCase().includes(search.toLowerCase()),
  );

  function confirmDelete(game: Game) {
    if (window.confirm(`Delete "${game.title}"? This will queue R2 cleanup.`)) {
      deleteMutation.mutate(game._id);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Games</h1>
          <p className="text-text-muted text-sm mt-0.5">{games.length} game(s) total</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/games/new')}>
          <Plus size={16} />
          New Game
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        className="input max-w-sm"
        placeholder="Search games…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-text-muted font-medium">Title</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium hidden md:table-cell">Slug</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-4 text-text-muted text-center">Loading…</td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-4 text-text-muted text-center">No games found.</td>
              </tr>
            )}
            {filtered.map((game) => (
              <tr key={game._id} className="hover:bg-bg-elevated/50 transition-colors group">
                <td className="px-5 py-3 font-medium text-text-primary">
                  <div className="flex items-center gap-2">
                    {game.coverImage && (
                      <img
                        src={game.coverImage.url}
                        alt={game.title}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    {game.title}
                  </div>
                </td>
                <td className="px-5 py-3 text-text-muted font-mono hidden md:table-cell">
                  {game.slug}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={game.status} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded hover:bg-bg-overlay text-text-muted hover:text-text-primary"
                      onClick={() => navigate(`/games/${game._id}`)}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-primary-muted/20 text-text-muted hover:text-primary"
                      onClick={() => navigate(`/games/${game._id}/patches`)}
                      title="Patches"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-primary-muted/20 text-text-muted hover:text-primary"
                      onClick={() => confirmDelete(game)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'badge bg-bg-overlay text-text-muted border border-border',
    ACTIVE: 'badge bg-status-active/10 text-status-active border border-status-active/20',
    DELETING: 'badge bg-primary/10 text-primary border border-primary/20',
    DELETED: 'badge bg-bg-overlay text-text-disabled border border-border',
  };
  return <span className={map[status] ?? 'badge bg-bg-overlay text-text-muted'}>{status}</span>;
}
