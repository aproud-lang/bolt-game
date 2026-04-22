import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';
import { FACTIONS, FACTION_IDS } from '../../constants/factions';
import { FactionCard } from './FactionCard';
import { GAME_CONFIG } from '../../constants/gameConfig';

export const BattleArena = ({ factions, attackResults, phase }) => {
  const [activeAttacks, setActiveAttacks] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const lastProcessedRef = useRef(null);
  const timersRef = useRef([]);

  // Clear all timers
  const clearAllTimers = () => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  };

  // Memoize whether we're in battle phase
  const isBattlePhase = phase === GAME_CONFIG.PHASES.BATTLE;

  // Reset everything when leaving battle phase
  useEffect(() => {
    if (!isBattlePhase) {
      clearAllTimers();
      setActiveAttacks({});
      setShowSummary(false);
      lastProcessedRef.current = null;
    }
  }, [isBattlePhase]);

  // Process attacks only in battle phase
  useEffect(() => {
    if (!isBattlePhase) {
      return;
    }

    if (!attackResults || attackResults.length === 0) {
      setActiveAttacks({});
      setShowSummary(false);
      return;
    }

    // Create a unique key for this set of attacks
    const attackKey = attackResults.map(a => `${a.attackerId}-${a.targetId}-${a.damage}`).join('|');
    
    // Skip if already processed
    if (lastProcessedRef.current === attackKey) {
      return;
    }

    // Clear previous state
    clearAllTimers();
    setActiveAttacks({});
    setShowSummary(false);
    lastProcessedRef.current = attackKey;

    // Animate each attack sequentially
    attackResults.forEach((attack, index) => {
      const showDelay = index * 600;
      const hideDelay = showDelay + 800;

      // Show damage
      const showTimer = setTimeout(() => {
        setActiveAttacks(prev => ({
          ...prev,
          [attack.targetId]: attack.damage,
        }));
      }, showDelay);
      timersRef.current.push(showTimer);

      // Hide damage
      const hideTimer = setTimeout(() => {
        setActiveAttacks(prev => {
          const next = { ...prev };
          delete next[attack.targetId];
          return next;
        });
      }, hideDelay);
      timersRef.current.push(hideTimer);
    });

    // Show summary after all animations
    const summaryDelay = attackResults.length * 600 + 400;
    const summaryTimer = setTimeout(() => {
      setShowSummary(true);
    }, summaryDelay);
    timersRef.current.push(summaryTimer);

  }, [isBattlePhase, attackResults]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  // Compute which factions are under attack RIGHT NOW
  const attackStates = useMemo(() => {
    if (!isBattlePhase) {
      return {};
    }
    return activeAttacks;
  }, [isBattlePhase, activeAttacks]);

  return (
    <div className="glass rounded-2xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Swords className="w-6 h-6 text-cyan-400" />
          Battle Arena
        </h2>
        <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
          {phase}
        </div>
      </div>

      {/* Arena Grid */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-3 grid-rows-2 gap-4 h-full">
          {FACTION_IDS.map((factionId) => {
            const isUnderAttack = isBattlePhase && attackStates[factionId] !== undefined;
            const damageAmount = isUnderAttack ? attackStates[factionId] : undefined;
            
            return (
              <div key={factionId} className="min-h-0">
                <FactionCard
                  factionId={factionId}
                  factionState={factions[factionId]}
                  isUnderAttack={isUnderAttack}
                  damageAmount={damageAmount}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Attack Summary */}
      <AnimatePresence>
        {isBattlePhase && showSummary && attackResults && attackResults.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 flex-shrink-0"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-2">Attack Summary</h3>
            <div className="grid grid-cols-2 gap-2">
              {attackResults.map((attack, index) => {
                const attacker = FACTIONS[attack.attackerId];
                const target = FACTIONS[attack.targetId];
                return (
                  <motion.div
                    key={`summary-${attack.attackerId}-${attack.targetId}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-cyber-darker text-sm"
                  >
                    <span>{attacker?.icon}</span>
                    <span className="text-gray-400">→</span>
                    <span>{target?.icon}</span>
                    <span className="text-red-400 font-bold ml-auto">-{attack.damage}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
