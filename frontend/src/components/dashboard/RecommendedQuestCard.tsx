
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { type RecommendedQuestDto } from '../../services/userService';

export const RecommendedQuestCard = ({ quest, index = 0 }: { quest: RecommendedQuestDto, index?: number }) => {
  const navigate = useNavigate();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -4, borderColor: 'rgba(124, 58, 237, 0.5)' }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 bg-surface border border-[var(--overlay-border)] rounded-[18px] px-4 py-3.5 cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-accent/10 hover:bg-elevated/40" 
      onClick={() => navigate(`/quiz/${quest.id}`)}
      style={{ marginBottom: '8px' }}
    >
      <div className="flex-1">
        <p className="font-semibold text-[15px] text-primary">{quest.title}</p>
        <p className="text-xs text-muted mt-0.5">
          {quest.subjectName} • <span className="text-accent-light font-medium">{quest.playCount}</span> {quest.playCount === 1 ? 'jugada' : 'jugadas'}
        </p>
      </div>
      <motion.div 
        className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0"
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(124, 58, 237, 0.2)' }}
      >
        <span className="text-[10px] text-accent font-bold ml-0.5">▶</span>
      </motion.div>
    </motion.div>
  );
};
