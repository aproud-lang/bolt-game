import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Skull, Heart, Zap } from 'lucide-react';
import { FACTIONS } from '../../constants/factions';
import { GAME_CONFIG } from '../../constants/gameConfig';

export const FactionCard = ({ 
  factionId, 
  factionState, 
  isUnderAttack = false, 
  damageAmount,
  isSelected = false,
  onClick,
  showPlayers = false,
}) => {
  const faction = FACTIONS[factionId];
  const hp = factionState?.hp ?? GAME_CONFIG.INITIAL_HP;
  const maxHp = GAME_CONFIG.MAX_HP;
  const hpPercentage = (hp / maxHp) * 100;
  const isEliminated = factionState?.isEliminated || hp <= 0;
  const playerCount = factionState?.players?.length || 0;
  const guardianShield = factionState?.guardianShield || 0;

  // Local state for damage display with auto-cleanup
  const [showDamage, setShowDamage] = useState(false);
  const [displayDamage, setDisplayDamage] = useState(0);
  const timerRef = useRef(null);

  // Handle damage display with strict cleanup
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only show damage if actively under attack with valid damage
    if (isUnderAttack && damageAmount && damageAmount > 0) {
      setDisplayDamage(damageAmount);
      setShowDamage(true);
      
      // Auto-hide after 800ms
      timerRef.current = setTimeout(() => {
        setShowDamage(false);
        timerRef.current = null;
      }, 800);
    } else {
      // Immediately hide if not under attack
      setShowDamage(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isUnderAttack, damageAmount]);

  // Force cleanup when component unmounts or faction changes
  useEffect(() => {
    return () => {
      setShowDamage(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [factionId]);

  const getHpColor = () => {
    if (hpPercentage > 60) return 'bg-green-500';
    if (hpPercentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      animate={isUnderAttack ? { 
        x: [0, -5, 5, -5, 5, 0],
        transition: { duration: 0.4 }
      } : {}}
      className={`relative h-full rounded-xl p-4 transition-all ${
        isEliminated 
          ? 'bg-gray-800/50 opacity-60' 
          : 'bg-cyber-darker'
      } ${
        onClick ? 'cursor-pointer' : ''
      } ${
        isSelected ? 'ring-2 ring-cyan-500' : ''
      }`}
      style={{
        borderLeft: `4px solid ${isEliminated ? '#4B5563' : faction.color}`,
      }}
    >
      {/* Damage Indicator - Simple conditional render without AnimatePresence */}
      {showDamage && displayDamage > 0 && (
        <motion.div
          key={`damage-${factionId}-${Date.now()}`}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
        >
          <span className="text-3xl font-bold text-red-500 drop-shadow-lg">
            -{displayDamage}
          </span>
        </motion.div>
      )}

      {/* Eliminated Overlay */}
      {isEliminated && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl z-10">
          <div className="text-center">
            <Skull className="w-8 h-8 text-gray-500 mx-auto mb-1" />
            <span className="text-gray-400 text-sm font-medium">Eliminated</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{faction.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm truncate">{faction.name}</h3>
          <p className="text-gray-500 text-xs">{playerCount} players</p>
        </div>
        {guardianShield > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
            <Shield className="w-3 h-3" />
            {guardianShield}%
          </div>
        )}
      </div>

      {/* HP Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400 flex items-center gap-1">
            <Heart className="w-3 h-3" />
            HP
          </span>
          <span className="text-white font-medium">{hp}/{maxHp}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getHpColor()} rounded-full`}
            initial={{ width: '100%' }}
            animate={{ width: `${hpPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats */}
      {!isEliminated && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-green-400">
            <Zap className="w-3 h-3" />
            <span>{factionState?.totalDamageDealt || 0}</span>
          </div>
          <div className="flex items-center gap-1 text-red-400">
            <span>-{factionState?.totalDamageTaken || 0}</span>
          </div>
        </div>
      )}

      {/* Player List */}
      {showPlayers && factionState?.players?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {factionState.players.slice(0, 5).map((player, idx) => (
              <div key={player.id || idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 truncate">{player.name}</span>
                <span className="text-cyan-400">{player.score || 0}</span>
              </div>
            ))}
            {factionState.players.length > 5 && (
              <p className="text-gray-500 text-xs">+{factionState.players.length - 5} more</p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
