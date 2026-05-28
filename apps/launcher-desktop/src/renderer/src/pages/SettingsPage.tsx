import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Zap, AlertCircle } from 'lucide-react';

export default function SettingsPage({ appVersion }: { appVersion: string }) {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#1e1e1e] flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Version section */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <Package size={18} className="text-zinc-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Launcher Version</p>
              <p className="text-xs text-zinc-400 mt-1">v{appVersion}</p>
              <p className="text-xs text-zinc-500 mt-1">Check for updates in the app menu.</p>
            </div>
          </div>
        </div>

        {/* Cache section */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <Zap size={18} className="text-zinc-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Local Cache</p>
              <p className="text-xs text-zinc-400 mt-1">Temporary files downloaded during patch installation.</p>
              <button
                onClick={() => {
                  alert('Cache clearing not yet implemented. You can manually delete %appdata%/GameHub/cache.');
                }}
                className="mt-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        {/* Debug section */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-zinc-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Debug Logs</p>
              <p className="text-xs text-zinc-400 mt-1">Logs are stored locally and never sent to servers.</p>
              <button
                onClick={() => {
                  alert('Logs stored in %appdata%/GameHub/logs/. Open this folder manually.');
                }}
                className="mt-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded transition-colors"
              >
                View Logs Folder
              </button>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="border-t border-[#1e1e1e] pt-6 mt-6">
          <p className="text-xs text-zinc-500 leading-relaxed">
            GameHub Launcher lets you install and manage Vietnamese game patches seamlessly.
            No account required — just download, install, and play.
          </p>
        </div>
      </div>
    </div>
  );
}
