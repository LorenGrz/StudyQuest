import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import { userService, type LeaderboardEntry, type Subject } from '../../services/userService';
import { getLeague, DEFAULT_ELO } from '../../utils/leagues';

// Animaciones para la lista
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const HomeLeaderboardPreview = ({ subjects }: { subjects: Subject[] }) => {
  const [selectedTab, setSelectedTab] = useState<'global' | string>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const fetchLeaderboard = async () => {
      try {
        if (selectedTab === 'global') {
          const data = await userService.getGlobalLeaderboard(5);
          setEntries(data);
        } else {
          const data = await userService.getLeaderboard(selectedTab, 5);
          setEntries(data);
        }
      } catch (err) {
        setError('No se pudo cargar el ranking');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [selectedTab]);

  return (
    <div className="bg-surface border border-[var(--overlay-border)] rounded-2xl p-4 flex flex-col gap-4 mt-2 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-muted text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-accent">🏆</span> Ranking / Leaderboard
        </h3>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedTab('global')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
            selectedTab === 'global' 
              ? 'bg-accent text-primary shadow-accent/20 shadow-lg' 
              : 'bg-elevated text-muted border border-[var(--overlay-border)] hover:border-[var(--overlay-border)]'
          }`}
        >
          🌎 Global
        </motion.button>
        {subjects.map((sub) => (
          <motion.button
            key={sub.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedTab(sub.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              selectedTab === sub.id 
                ? 'bg-accent text-primary shadow-accent/20 shadow-lg' 
                : 'bg-elevated text-muted border border-[var(--overlay-border)] hover:border-[var(--overlay-border)]'
            }`}
          >
            📚 {sub.code}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[220px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-full py-10">
            <div className="w-8 h-8 border-2 border-[var(--overlay-border)] border-t-[#7c3aed] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center py-4 bg-red-500/10 rounded-xl border border-red-500/20">
            {error}
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted text-xs text-center py-8">
            No hay datos en este ranking.
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-2"
          >
            {entries.map((entry, idx) => {
              const league = getLeague(entry.elo ?? DEFAULT_ELO);
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              
              return (
                <motion.div
                  key={entry.userId}
                  variants={itemVariants}
                  className="flex items-center gap-3 bg-elevated/60 hover:bg-elevated border border-[var(--overlay-border)] p-2.5 rounded-xl transition-all duration-200 group hover:border-[var(--overlay-border)]"
                >
                  <div className="w-6 text-center font-bold text-sm text-muted">
                    {medal ? <span className="text-base filter drop-shadow-md">{medal}</span> : <span>#{idx + 1}</span>}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt={entry.displayName} className="w-full h-full object-cover" />
                    ) : (
                      entry.displayName?.charAt(0).toUpperCase() ?? '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-primary text-[13px] font-semibold truncate group-hover:text-accent-light transition-colors">{entry.displayName}</p>
                    <p className="text-muted text-[10px] truncate">@{entry.username}</p>
                  </div>
                  <div className="text-right shrink-0 bg-black/20 px-2 py-1 rounded-md">
                    <span className="text-xs font-bold text-[10px] mr-1.5" title={league.name}>{league.icon}</span>
                    <span className="text-xs font-bold drop-shadow-md" style={{ color: league.color }}>{entry.elo} ELO</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};
