import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { LauncherRelease } from '@gamehub/shared';
import LauncherReleaseModal from '../components/modals/LauncherReleaseModal';

export default function LauncherReleasesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: releases = [], isLoading } = useQuery<LauncherRelease[]>({
    queryKey: ['admin', 'launcher', 'releases'],
    queryFn: () => api.get('/admin/launcher/releases').then((r) => r.data),
  });

  const forceUpdateMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/launcher/releases/${id}/force-update`, { forceUpdate: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'launcher', 'releases'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Rocket size={22} className="text-primary" />
            Launcher Releases
          </h1>
          <p className="text-text-muted text-sm mt-0.5">Manage auto-update releases</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          New Release
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-text-muted font-medium">Version</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium">Platform</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
              <th className="text-left px-5 py-3 text-text-muted font-medium">Force Update</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-4 text-center text-text-muted">Loading…</td>
              </tr>
            )}
            {!isLoading && releases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-4 text-center text-text-muted">
                  No releases yet.
                </td>
              </tr>
            )}
            {releases.map((r) => (
              <tr key={r._id} className="hover:bg-bg-elevated/50 group">
                <td className="px-5 py-3 font-mono text-text-primary">{r.version}</td>
                <td className="px-5 py-3 text-text-secondary">{r.platform}</td>
                <td className="px-5 py-3">
                  <span
                    className={
                      r.status === 'PUBLISHED'
                        ? 'badge bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'badge bg-bg-overlay text-text-muted border border-border'
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={
                      r.forceUpdate
                        ? 'badge bg-primary/10 text-primary border border-primary/20'
                        : 'badge bg-bg-overlay text-text-disabled border border-border'
                    }
                  >
                    {r.forceUpdate ? 'YES' : 'no'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {r.status === 'PUBLISHED' && (
                      <button
                        className={`btn-secondary text-xs px-3 py-1 ${r.forceUpdate ? 'opacity-50' : ''}`}
                        disabled={r.forceUpdate}
                        onClick={() => forceUpdateMutation.mutate(r._id)}
                      >
                        {r.forceUpdate ? 'Force Update Active' : 'Enable Force Update'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LauncherReleaseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'launcher', 'releases'] });
        }}
      />
    </div>
  );
}
