import { Minus, Square, X } from 'lucide-react';

const API = (window as unknown as { electronAPI: { window: {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
} } }).electronAPI;

export default function TitleBar() {
  return (
    <div
      className="h-9 bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center justify-between px-4 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Logo */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-red-500">GAME</span>
        <span className="text-sm font-bold text-white">HUB</span>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => API.window.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => API.window.maximize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <Square size={10} />
        </button>
        <button
          onClick={() => API.window.close()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
