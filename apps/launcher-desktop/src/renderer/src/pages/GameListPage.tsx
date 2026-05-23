import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search } from 'lucide-react';
import type { Game } from '@gamehub/shared';

type PatchFilter = 'all' | 'available' | 'none';

export default function GameListPage({ apiBase }: { apiBase: string }) {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [patchFilter, setPatchFilter] = useState<PatchFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<Game[]>(`${apiBase}/launcher/games`)
      .then(({ data }) => setGames(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiBase]);

  const filtered = games.filter((g) => {
    const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase());
    const hasPatch = Boolean(g.latestPatchVersionId);

    if (patchFilter === 'available') return matchesSearch && hasPatch;
    if (patchFilter === 'none') return matchesSearch && !hasPatch;
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-[#1e1e1e]">
        <div className="max-w-[1480px] mx-auto w-full px-5 lg:px-8 py-5">
          <div className="flex items-center gap-4 mb-5">
          <img
            src="/Charles24-05.png"
            alt="Charles24"
            className="h-14 w-14 rounded-lg object-contain shrink-0"
            draggable={false}
          />
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold leading-none text-white">Charles24 Việt Hóa</h1>
            <p className="text-[11px] text-zinc-500 mt-2 uppercase tracking-[0.28em]">Games Library</p>
          </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="relative w-full lg:max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2.5 text-sm
                         text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="Tìm game..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'available', label: 'Có patch' },
                { key: 'none', label: 'Chưa có patch' },
              ].map((item) => {
                const active = patchFilter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPatchFilter(item.key as PatchFilter)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-[#111] border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Game grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1480px] mx-auto w-full px-5 lg:px-8 py-5 lg:py-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">
              {loading ? 'Đang tải game...' : `${filtered.length} game`}
            </p>
          </div>
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-[#1f1f1f] bg-[#101010] px-5 py-8 text-zinc-500 text-sm">
              Không tìm thấy game phù hợp với bộ lọc hiện tại.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 xl:gap-5">
          {filtered.map((game) => (
            <button
              key={game._id}
              onClick={() => navigate(`/games/${game.slug}`)}
              className="group relative bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden
                         hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(220,38,38,0.1)]
                         transition-all duration-200 text-left max-w-[260px] w-full justify-self-center"
            >
              <div className="aspect-[3/4] bg-[#1a1a1a]">
                {game.coverImage ? (
                  <img
                    src={game.coverImage.url}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src="/Charles24-05.png"
                      alt="Charles24"
                      className="h-10 w-10 opacity-40 object-contain"
                      draggable={false}
                    />
                  </div>
                )}
              </div>
              <div className="p-3.5">
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
    </div>
  );
}
