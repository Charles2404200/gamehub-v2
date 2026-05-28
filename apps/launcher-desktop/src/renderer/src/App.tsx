import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import ForceUpdateModal from './components/ForceUpdateModal';
import TitleBar from './components/TitleBar';
import GameListPage from './pages/GameListPage';
import GameDetailPage from './pages/GameDetailPage';
import SettingsPage from './pages/SettingsPage';
import type { LauncherConfig } from '@gamehub/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

// Electron app version — injected by electron-vite at build time
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.1';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export default function App() {
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    axios
      .get<LauncherConfig>(`${API_BASE}/launcher/config`, {
        params: { platform: 'win32' },
      })
      .then(({ data }) => {
        setConfig(data);
        if (
          data.forceUpdate &&
          compareVersions(APP_VERSION, data.minSupportedVersion) < 0
        ) {
          setNeedsUpdate(true);
        }
      })
      .catch(() => {
        // Offline mode — allow launcher to open but skip config check
      });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <TitleBar />

      <div className="flex-1 overflow-hidden relative">
        {needsUpdate && <ForceUpdateModal />}

        {!needsUpdate && (
          <HashRouter>
            <Routes>
              <Route path="/" element={<GameListPage apiBase={API_BASE} />} />
              <Route path="/games/:slug" element={<GameDetailPage apiBase={API_BASE} />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        )}
      </div>

      <footer className="h-8 shrink-0 border-t border-[#1e1e1e] bg-[#0d0d0d] px-4 flex items-center justify-center text-[11px] text-zinc-500">
        Code and design by Charles24
      </footer>
    </div>
  );
}
