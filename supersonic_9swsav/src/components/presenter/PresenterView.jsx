import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Heart, Zap, Target, Users, Trophy,
  Volume2, Clock, Swords
} from 'lucide-react';
import { FACTIONS, FACTION_IDS } from '../../constants/factions';
import { GAME_CONFIG } from '../../constants/gameConfig';

// Large Faction Card for Presenter View
const LargeFactionCard = ({ factionId, factionState, isAttacking, isDefending, damage }) => {
  const faction = FACTIONS[factionId];
  const hpPercent = factionState?.hp || 0;
  const isEliminated = factionState?.isEliminated;
  const playerCount = factionState?.players?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isEliminated ? 0.5 : 1, 
        scale: isAttacking ? 1.05 : 1,
        x: isAttacking ? [0, 10, -10, 0] : 0,
      }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-2xl overflow-hidden ${isEliminated ? 'grayscale' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${faction.color}20, ${faction.color}05)`,
        border: `2px solid ${isAttacking ? '#EF4444' : isDefending ? '#F59E0B' : faction.color}40`,
      }}
    >
      {/* Attack indicator */}
      {isAttacking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-red-500/20 z-10"
        />
      )}

      {/* Damage popup */}
      <AnimatePresence>
        {damage && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-4 right-4 z-20 text-3xl font-black text-red-500"
          >
            -{damage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: `${faction.color}30` }}
          >
            {faction.icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{faction.name}</h3>
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>{playerCount} players</span>
            </div>
          </div>
          {isEliminated && (
            <div className="ml-auto px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
              ELIMINATED
            </div>
          )}
        </div>

        {/* HP Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" />
              <span className="text-white font-medium">Health</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: faction.color }}>
              {hpPercent}%
            </span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: faction.color }}
              initial={{ width: '100%' }}
              animate={{ width: `${hpPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Guardian Shield */}
        {factionState?.guardianShield > 0 && (
          <div className="flex items-center gap-2 text-purple-400">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Guardian Shield: {factionState.guardianShield}%</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Swords className="w-4 h-4 text-red-400" />
            <span>Dealt: {factionState?.totalDamageDealt || 0}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Taken: {factionState?.totalDamageTaken || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Question Display for Presenter
const QuestionDisplay = ({ question, phase }) => {
  if (!question || phase !== GAME_CONFIG.PHASES.ANSWERING) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-8 text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        <span className="text-green-400 font-medium">QUESTION ACTIVE</span>
      </div>
      <h2 className="text-3xl font-bold text-white mb-6">{question.text}</h2>
      <div className="flex justify-center gap-4">
        <div className="px-6 py-3 rounded-xl bg-green-500/20 text-green-400 font-bold text-xl">
          TRUE
        </div>
        <div className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold text-xl">
          FALSE
        </div>
        <div className="px-6 py-3 rounded-xl bg-yellow-500/20 text-yellow-400 font-bold text-xl">
          NOT GIVEN
        </div>
      </div>
    </motion.div>
  );
};

// Voting Display for Presenter
const VotingDisplay = ({ phase }) => {
  if (phase !== GAME_CONFIG.PHASES.VOTING) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-8 text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Target className="w-6 h-6 text-red-400 animate-pulse" />
        <span className="text-red-400 font-medium text-xl">VOTING PHASE</span>
      </div>
      <h2 className="text-2xl font-bold text-white">Choose Your Target!</h2>
      <p className="text-gray-400 mt-2">Players are selecting which faction to attack</p>
    </motion.div>
  );
};

// Battle Animation Display
const BattleDisplay = ({ attackResults, factions }) => {
  if (!attackResults || attackResults.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-2xl p-8"
    >
      <div className="flex items-center justify-center gap-2 mb-6">
        <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
        <span className="text-yellow-400 font-medium text-xl">BATTLE RESULTS</span>
      </div>
      <div className="space-y-4">
        {attackResults.map((attack, index) => {
          const attacker = FACTIONS[attack.attackerId];
          const target = FACTIONS[attack.targetId];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.5 }}
              className="flex items-center justify-between p-4 rounded-xl bg-cyber-darker"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{attacker.icon}</span>
                <span className="text-white font-bold">{attacker.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.5 + 0.3 }}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 font-bold text-xl"
                >
                  -{attack.damage}
                </motion.div>
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{target.name}</span>
                <span className="text-3xl">{target.icon}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Game Over Display
const GameOverDisplay = ({ winner, factions }) => {
  if (!winner) return null;
  
  const winnerFaction = FACTIONS[winner];
  const winnerState = factions[winner];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div className="text-center">
        <motion.div
          animate={{ 
            rotate: [0, -10, 10, -10, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className="text-8xl mb-6"
        >
          🏆
        </motion.div>
        <h1 className="text-5xl font-black text-white mb-4">VICTORY!</h1>
        <div 
          className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl mb-6"
          style={{ backgroundColor: `${winnerFaction.color}30`, border: `3px solid ${winnerFaction.color}` }}
        >
          <span className="text-5xl">{winnerFaction.icon}</span>
          <span className="text-3xl font-bold" style={{ color: winnerFaction.color }}>
            {winnerFaction.name}
          </span>
        </div>
        <p className="text-gray-400 text-xl">
          {winnerState?.players?.length || 0} players • {winnerState?.hp || 0}% HP remaining
        </p>
      </div>
    </motion.div>
  );
};

// Main Presenter View
export const PresenterView = ({ gameState }) => {
  const { phase, factions, currentQuestion, attackResults, winner, roundNumber } = gameState;

  // Calculate attack/defense states for animation
  const attackingFactions = new Set();
  const defendingFactions = new Set();
  const damageMap = {};

  if (attackResults) {
    attackResults.forEach(attack => {
      attackingFactions.add(attack.attackerId);
      defendingFactions.add(attack.targetId);
      damageMap[attack.targetId] = attack.damage;
    });
  }

  const totalPlayers = Object.values(factions).reduce(
    (sum, f) => sum + (f.players?.length || 0), 0
  );

  const survivingFactions = Object.values(factions).filter(f => !f.isEliminated).length;

  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* Game Over Overlay */}
      {phase === GAME_CONFIG.PHASES.GAME_OVER && (
        <GameOverDisplay winner={winner} factions={factions} />
      )}

      {/* Header */}
      <div className="bg-cyber-darker border-b border-gray-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black">
              <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                SONIC FACTIONS
              </span>
            </h1>
            <p className="text-gray-400 mt-1">The Ultimate Classroom Battle</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Round</p>
              <p className="text-3xl font-bold text-purple-400">{roundNumber}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Players</p>
              <p className="text-3xl font-bold text-cyan-400">{totalPlayers}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Factions</p>
              <p className="text-3xl font-bold text-green-400">{survivingFactions}/6</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 font-medium">
              {phase}
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Phase-specific content */}
        <div className="mb-8">
          {phase === GAME_CONFIG.PHASES.LISTENING && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center mx-auto mb-4"
              >
                <Volume2 className="w-12 h-12 text-cyan-400" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">Listening Phase</h2>
              <p className="text-gray-400 text-xl">Pay attention to the audio...</p>
            </motion.div>
          )}

          <QuestionDisplay question={currentQuestion} phase={phase} />
          <VotingDisplay phase={phase} />
          <BattleDisplay attackResults={attackResults} factions={factions} />

          {phase === GAME_CONFIG.PHASES.LOBBY && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-2xl p-8 text-center"
            >
              <h2 className="text-3xl font-bold text-white mb-4">Waiting for Players</h2>
              <p className="text-gray-400 text-xl">Join a faction to begin!</p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400">{totalPlayers} players connected</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Faction Grid */}
        <div className="grid grid-cols-3 gap-6">
          {FACTION_IDS.map(factionId => (
            <LargeFactionCard
              key={factionId}
              factionId={factionId}
              factionState={factions[factionId]}
              isAttacking={attackingFactions.has(factionId)}
              isDefending={defendingFactions.has(factionId)}
              damage={damageMap[factionId]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
