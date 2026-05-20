import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Gamepad2, Search } from 'lucide-react';
import type { Game } from '@gamehub/shared';

export default function GameListPage({ apiBase }: { apiBase: string }) {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<Game[]>(`${apiBase}/launcher/games`)
      .then(({ data }) => setGames(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiBase]);

  const filtered = games.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3 mb-4">
          <Gamepad2 size={20} className="text-red-500" />
          <h1 className="text-lg font-bold">Games</h1>
        </div>
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-md pl-9 pr-3 py-2 text-sm
                       text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
            placeholder="Search games…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Game grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading && (
          <p className="text-zinc-500 text-sm">Loading games…</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-zinc-500 text-sm">No games found.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((game) => (
            <button
              key={game._id}
              onClick={() => navigate(`/games/${game.slug}`)}
              className="group relative bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden
                         hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(220,38,38,0.1)]
                         transition-all duration-200 text-left"
            >
              <div className="aspect-[3/4] bg-[#1a1a1a]">
                {game.coverImage ? (
                  <img
                    src={game.coverImage.url}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 size={32} className="text-zinc-700" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-white truncate">{game.title}</p>
                {game.latestPatchVersionId && (
                  <p className="text-xs text-red-400 mt-0.5">Patch available</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
