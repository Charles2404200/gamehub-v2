import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Package, Rocket, Activity } from 'lucide-react';
import { api } from '../lib/api';
import type { Game, PatchVersion, LauncherRelease } from '@gamehub/shared';

export default function DashboardPage() {
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ['admin', 'games'],
    queryFn: () => api.get('/admin/games').then((r) => r.data),
  });

  const { data: launcherReleases = [] } = useQuery<LauncherRelease[]>({
    queryKey: ['admin', 'launcher', 'releases'],
    queryFn: () => api.get('/admin/launcher/releases').then((r) => r.data),
  });

  const activeGames = games.filter((g) => g.status === 'ACTIVE').length;
  const latestLauncher = launcherReleases
    .filter((r) => r.status === 'PUBLISHED')
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    [0];

  const stats = [
    { label: 'Total Games', value: games.length, icon: Gamepad2, color: 'text-primary' },
    {
      label: 'Active Games',
      value: activeGames,
      icon: Activity,
      color: 'text-status-active',
    },
    {
      label: 'Draft Games',
      value: games.filter((g) => g.status === 'DRAFT').length,
      icon: Package,
      color: 'text-text-muted',
    },
    {
      label: 'Launcher',
      value: latestLauncher?.version ?? 'none',
      icon: Rocket,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">GameHub Launcher Admin</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-text-muted text-sm">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent games */}
        <div className="card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text-primary">Recent Games</h2>
          </div>
          <div className="divide-y divide-border">
            {games.slice(0, 5).map((game) => (
              <div key={game._id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{game.title}</p>
                  <p className="text-xs text-text-muted">{game.slug}</p>
                </div>
                <StatusBadge status={game.status} />
              </div>
            ))}
            {games.length === 0 && (
              <p className="px-5 py-4 text-sm text-text-muted">No games yet.</p>
            )}
          </div>
        </div>

        {/* Launcher releases */}
        <div className="card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text-primary">Launcher Releases</h2>
          </div>
          <div className="divide-y divide-border">
            {launcherReleases.slice(0, 5).map((r) => (
              <div key={r._id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{r.platform}</p>
                  <p className="text-xs text-text-muted">v{r.version}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.forceUpdate && (
                    <span className="badge bg-primary/10 text-primary border border-primary/20 text-xs">
                      Force Update
                    </span>
                  )}
                  <span
                    className={
                      r.status === 'PUBLISHED'
                        ? 'badge bg-green-500/10 text-green-400 border border-green-500/20 text-xs'
                        : 'badge bg-bg-elevated text-text-muted border border-border text-xs'
                    }
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
            {launcherReleases.length === 0 && (
              <p className="px-5 py-4 text-sm text-text-muted">No releases yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    DRAFT: 'badge bg-bg-elevated text-text-muted',
    ACTIVE: 'badge bg-status-active/10 text-status-active border border-status-active/20',
    DELETING: 'badge bg-status-failed/10 text-status-failed border border-status-failed/20',
    DELETED: 'badge bg-bg-elevated text-text-disabled',
  };
  return (
    <span className={classes[status] ?? 'badge bg-bg-elevated text-text-muted'}>{status}</span>
  );
}
