import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Volume2, Clock, Target, Shield, Heart, 
  ChevronRight, ChevronLeft, ChevronUp, Check, X,
  Loader2, ArrowLeft, ArrowUp, ArrowRight
} from 'lucide-react';
import { FACTIONS, FACTION_IDS, getFactionById } from '../../constants/factions';
import { GAME_CONFIG } from '../../constants/gameConfig';

// Join Screen Component
const JoinScreen = ({ onJoin, gameState }) => {
  const [playerName, setPlayerName] = useState('');
  const [selectedFaction, setSelectedFaction] = useState(null);

  const handleJoin = () => {
    if (!playerName.trim() || !selectedFaction) return;
    onJoin(playerName, selectedFaction);
  };

  return (
    <div className="min-h-screen bg-cyber-dark p-4 flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">
          <span className="text-cyan-400">SONIC</span>
          <span className="text-white"> FACTIONS</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Join the Battle</p>
      </div>

      {/* Name Input */}
      <div className="mb-6">
        <label className="block text-gray-400 text-sm mb-2">Your Name</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full bg-cyber-darker border border-gray-700 rounded-xl px-4 py-3 text-white text-lg focus:border-cyan-500 focus:outline-none"
          placeholder="Enter your name..."
        />
      </div>

      {/* Faction Selection */}
      <div className="flex-1">
        <label className="block text-gray-400 text-sm mb-3">Choose Your Faction</label>
        <div className="grid grid-cols-2 gap-3">
          {FACTION_IDS.map(factionId => {
            const faction = FACTIONS[factionId];
            const playerCount = gameState.factions[factionId]?.players.length || 0;
            const isSelected = selectedFaction === factionId;

            return (
              <motion.button
                key={factionId}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedFaction(factionId)}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isSelected 
                    ? `border-[${faction.color}] bg-[${faction.color}]/20` 
                    : 'border-gray-700 bg-cyber-darker'
                }`}
                style={{
                  borderColor: isSelected ? faction.color : undefined,
                  backgroundColor: isSelected ? `${faction.color}20` : undefined,
                }}
              >
                <div className="text-3xl mb-2">{faction.icon}</div>
                <p className="font-semibold text-white text-sm">{faction.name}</p>
                <p className="text-gray-500 text-xs">{playerCount} players</p>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: faction.color }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Join Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleJoin}
        disabled={!playerName.trim() || !selectedFaction}
        className={`w-full py-4 rounded-xl font-bold text-lg mt-6 ${
          playerName.trim() && selectedFaction
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
            : 'bg-gray-700 text-gray-500'
        }`}
      >
        Join Battle
      </motion.button>
    </div>
  );
};

// Listening Phase Component
const ListeningPhase = ({ segment, faction }) => {
  return (
    <div className="min-h-screen bg-cyber-dark flex flex-col items-center justify-center p-6">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-32 h-32 rounded-full flex items-center justify-center mb-8 relative"
        style={{ backgroundColor: `${faction.color}20`, border: `3px solid ${faction.color}` }}
      >
        <Volume2 className="w-16 h-16" style={{ color: faction.color }} />
      </motion.div>
      
      <h2 className="text-2xl font-bold text-white mb-2">Listening Phase</h2>
      <p className="text-gray-400 text-center mb-4">
        {segment?.title || 'Pay attention to the audio...'}
      </p>
      
      <div className="flex items-center gap-2 text-gray-500 mb-6">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Audio playing on main screen...</span>
      </div>

      <div 
        className="flex items-center gap-3 px-4 py-2 rounded-full"
        style={{ backgroundColor: `${faction.color}20`, border: `1px solid ${faction.color}40` }}
      >
        <span className="text-2xl">{faction.icon}</span>
        <span className="text-white font-medium">{faction.name}</span>
      </div>

      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Waiting for teacher to start the question...</span>
        </div>
      </div>
    </div>
  );
};

// Swipe Answer Card Component
const SwipeAnswerCard = ({ question, onAnswer, faction }) => {
  const [exitDirection, setExitDirection] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Thresholds for triggering answer
  const SWIPE_THRESHOLD = 100;
  
  // Transform values for visual feedback
  const rotateZ = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const scale = useTransform(
    [x, y],
    ([latestX, latestY]) => {
      const distance = Math.sqrt(latestX * latestX + latestY * latestY);
      return Math.max(0.95, 1 - distance / 1000);
    }
  );
  
  // Opacity for direction indicators
  const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, -50, 0], [1, 0.5, 0]);
  const rightOpacity = useTransform(x, [0, 50, SWIPE_THRESHOLD], [0, 0.5, 1]);
  const upOpacity = useTransform(y, [-SWIPE_THRESHOLD, -50, 0], [1, 0.5, 0]);

  const handleDragEnd = (event, info) => {
    const { offset, velocity } = info;
    
    // Check which direction was swiped
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    
    // Determine if swipe was strong enough
    const swipedLeft = offset.x < -SWIPE_THRESHOLD && absX > absY;
    const swipedRight = offset.x > SWIPE_THRESHOLD && absX > absY;
    const swipedUp = offset.y < -SWIPE_THRESHOLD && absY > absX;
    
    if (swipedLeft) {
      setExitDirection('left');
      setIsExiting(true);
      setTimeout(() => onAnswer(GAME_CONFIG.ANSWER_TYPES.TRUE), 300);
    } else if (swipedRight) {
      setExitDirection('right');
      setIsExiting(true);
      setTimeout(() => onAnswer(GAME_CONFIG.ANSWER_TYPES.FALSE), 300);
    } else if (swipedUp) {
      setExitDirection('up');
      setIsExiting(true);
      setTimeout(() => onAnswer(GAME_CONFIG.ANSWER_TYPES.NOT_GIVEN), 300);
    }
  };

  const getExitAnimation = () => {
    switch (exitDirection) {
      case 'left':
        return { x: -500, opacity: 0, transition: { duration: 0.3 } };
      case 'right':
        return { x: 500, opacity: 0, transition: { duration: 0.3 } };
      case 'up':
        return { y: -500, opacity: 0, transition: { duration: 0.3 } };
      default:
        return {};
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Direction Labels */}
      <motion.div 
        className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
        style={{ opacity: leftOpacity }}
      >
        <div className="w-16 h-16 rounded-full bg-green-500/30 border-2 border-green-500 flex items-center justify-center">
          <ArrowLeft className="w-8 h-8 text-green-400" />
        </div>
        <span className="text-green-400 font-bold text-sm">TRUE</span>
      </motion.div>
      
      <motion.div 
        className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
        style={{ opacity: rightOpacity }}
      >
        <div className="w-16 h-16 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center">
          <ArrowRight className="w-8 h-8 text-red-400" />
        </div>
        <span className="text-red-400 font-bold text-sm">FALSE</span>
      </motion.div>
      
      <motion.div 
        className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ opacity: upOpacity }}
      >
        <div className="w-16 h-16 rounded-full bg-yellow-500/30 border-2 border-yellow-500 flex items-center justify-center">
          <ArrowUp className="w-8 h-8 text-yellow-400" />
        </div>
        <span className="text-yellow-400 font-bold text-sm">NOT GIVEN</span>
      </motion.div>

      {/* Swipeable Card */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        style={{ x, y, rotateZ, scale }}
        animate={isExiting ? getExitAnimation() : {}}
        className="w-[85%] max-w-sm bg-gradient-to-br from-cyber-darker to-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-700 cursor-grab active:cursor-grabbing"
      >
        {/* Question Card Content */}
        <div className="text-center">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ backgroundColor: `${faction.color}30`, border: `2px solid ${faction.color}` }}
          >
            {faction.icon}
          </div>
          
          <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">
            {question?.text || 'Loading question...'}
          </h3>
          
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              👆
            </motion.div>
            <span>Swipe to answer</span>
          </div>
        </div>

        {/* Swipe Direction Hints */}
        <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center text-green-400">
            <ArrowLeft className="w-4 h-4 mb-1" />
            <span>TRUE</span>
          </div>
          <div className="flex flex-col items-center text-yellow-400">
            <ArrowUp className="w-4 h-4 mb-1" />
            <span>NOT GIVEN</span>
          </div>
          <div className="flex flex-col items-center text-red-400">
            <ArrowRight className="w-4 h-4 mb-1" />
            <span>FALSE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Swipe-Based Answer Phase Component
const SwipeAnswerPhase = ({ question, timeRemaining, onAnswer, faction }) => {
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const handleAnswer = (answer) => {
    if (answered) return;
    setAnswered(true);
    setSelectedAnswer(answer);
    onAnswer(answer);
  };

  const progress = (timeRemaining / GAME_CONFIG.QUESTION_TIME_LIMIT) * 100;

  return (
    <div className="min-h-screen bg-cyber-dark flex flex-col">
      {/* Timer */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Time Remaining</span>
          <span className={`font-bold text-lg ${timeRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {timeRemaining}s
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            style={{ 
              backgroundColor: timeRemaining <= 3 ? '#EF4444' : faction.color,
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {!answered ? (
          <SwipeAnswerCard 
            question={question} 
            onAnswer={handleAnswer} 
            faction={faction}
          />
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
              selectedAnswer === 'TRUE' ? 'bg-green-500' :
              selectedAnswer === 'FALSE' ? 'bg-red-500' : 'bg-yellow-500'
            }`}>
              {selectedAnswer === 'TRUE' ? <Check className="w-12 h-12 text-white" /> :
               selectedAnswer === 'FALSE' ? <X className="w-12 h-12 text-white" /> :
               <span className="text-2xl font-bold text-white">?</span>}
            </div>
            <p className="text-white font-bold text-2xl mb-2">{selectedAnswer}</p>
            <p className="text-gray-400">Answer submitted!</p>
            <p className="text-gray-500 text-sm mt-4">Waiting for other players...</p>
          </motion.div>
        )}
      </div>

      {/* Faction indicator */}
      <div className="p-4 flex-shrink-0">
        <div 
          className="flex items-center justify-center gap-2 py-2 rounded-full"
          style={{ backgroundColor: `${faction.color}20` }}
        >
          <span className="text-xl">{faction.icon}</span>
          <span className="text-white font-medium text-sm">{faction.name}</span>
        </div>
      </div>
    </div>
  );
};

// Voting Phase Component
const VotingPhase = ({ factions, myFactionId, timeRemaining, onVote }) => {
  const [voted, setVoted] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const myFaction = getFactionById(myFactionId);

  const handleVote = (targetId) => {
    if (voted || targetId === myFactionId) return;
    setVoted(true);
    setSelectedTarget(targetId);
    onVote(targetId);
  };

  const eligibleTargets = FACTION_IDS.filter(id => 
    id !== myFactionId && !factions[id]?.isEliminated
  );

  return (
    <div className="min-h-screen bg-cyber-dark p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Target</h2>
        <p className="text-gray-400">Select a faction to attack</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className={`font-bold ${timeRemaining <= 5 ? 'text-red-500' : 'text-white'}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      {/* Target Selection */}
      <div className="space-y-3">
        {eligibleTargets.map(factionId => {
          const faction = FACTIONS[factionId];
          const factionState = factions[factionId];
          const isSelected = selectedTarget === factionId;

          return (
            <motion.button
              key={factionId}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVote(factionId)}
              disabled={voted}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                isSelected 
                  ? 'border-red-500 bg-red-500/20' 
                  : 'border-gray-700 bg-cyber-darker'
              }`}
            >
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${faction.color}30` }}
              >
                {faction.icon}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-white">{faction.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Heart className="w-4 h-4 text-red-400" />
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${factionState?.hp || 0}%`,
                        backgroundColor: faction.color,
                      }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm">{factionState?.hp || 0}%</span>
                </div>
              </div>
              {isSelected && (
                <Target className="w-6 h-6 text-red-500" />
              )}
            </motion.button>
          );
        })}
      </div>

      {voted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <p className="text-green-400 font-medium">Vote submitted!</p>
          <p className="text-gray-500 text-sm">Waiting for other players...</p>
        </motion.div>
      )}
    </div>
  );
};

// Guardian Phase Component
const GuardianPhase = ({ factions, myFactionId, onProtect, onMCQAnswer }) => {
  const [selectedProtect, setSelectedProtect] = useState(null);
  const [mcqAnswer, setMcqAnswer] = useState(null);
  const myFaction = getFactionById(myFactionId);

  const survivingFactions = FACTION_IDS.filter(id => !factions[id]?.isEliminated);

  const mockMCQ = {
    question: "What is the capital of France?",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correctIndex: 1,
  };

  const handleProtect = (targetId) => {
    setSelectedProtect(targetId);
    onProtect(targetId);
  };

  const handleMCQAnswer = (index) => {
    setMcqAnswer(index);
    const isCorrect = index === mockMCQ.correctIndex;
    onMCQAnswer(isCorrect);
  };

  return (
    <div className="min-h-screen bg-cyber-dark p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Guardian Mode</h2>
        <p className="text-gray-400">Your faction has fallen, but you can still help!</p>
      </div>

      {/* Protect Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Choose a faction to protect</h3>
        <div className="space-y-2">
          {survivingFactions.map(factionId => {
            const faction = FACTIONS[factionId];
            const isSelected = selectedProtect === factionId;

            return (
              <motion.button
                key={factionId}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleProtect(factionId)}
                className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 ${
                  isSelected 
                    ? 'border-purple-500 bg-purple-500/20' 
                    : 'border-gray-700 bg-cyber-darker'
                }`}
              >
                <span className="text-2xl">{faction.icon}</span>
                <span className="text-white font-medium">{faction.name}</span>
                {isSelected && <Shield className="w-5 h-5 text-purple-400 ml-auto" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* MCQ for Buffer Points */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Earn Buffer Points</h3>
        <p className="text-gray-400 mb-4">{mockMCQ.question}</p>
        <div className="space-y-2">
          {mockMCQ.options.map((option, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMCQAnswer(index)}
              disabled={mcqAnswer !== null}
              className={`w-full p-3 rounded-lg text-left transition-all ${
                mcqAnswer === index
                  ? index === mockMCQ.correctIndex
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-cyber-darker border border-gray-700 text-white hover:border-gray-600'
              }`}
            >
              {option}
            </motion.button>
          ))}
        </div>
        {mcqAnswer !== null && (
          <p className={`mt-3 text-center ${
            mcqAnswer === mockMCQ.correctIndex ? 'text-green-400' : 'text-red-400'
          }`}>
            {mcqAnswer === mockMCQ.correctIndex 
              ? '+5 HP to your protected faction!' 
              : 'Incorrect. Try again next round!'}
          </p>
        )}
      </div>
    </div>
  );
};

// Battle Results Component
const BattleResults = ({ attackResults, factions, myFactionId }) => {
  const myFaction = getFactionById(myFactionId);
  const myFactionState = factions[myFactionId];

  return (
    <div className="min-h-screen bg-cyber-dark p-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Battle Results</h2>
      </div>

      {/* Attack Animations */}
      <div className="space-y-4">
        <AnimatePresence>
          {attackResults?.map((attack, index) => {
            const attacker = FACTIONS[attack.attackerId];
            const target = FACTIONS[attack.targetId];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.3 }}
                className="glass rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{attacker.icon}</span>
                    <span className="text-white font-medium">{attacker.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">-{attack.damage}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-2xl">{target.icon}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* My Faction Status */}
      <div className="mt-8 glass rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${myFaction.color}30` }}
          >
            {myFaction.icon}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{myFaction.name}</p>
            <p className="text-gray-400">Your Faction</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: myFaction.color }}
              initial={{ width: '100%' }}
              animate={{ width: `${myFactionState?.hp || 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-white font-bold">{myFactionState?.hp || 0}%</span>
        </div>
      </div>

      {/* Waiting message */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Waiting for next round...</span>
        </div>
      </div>
    </div>
  );
};

// Main Student Controller
export const StudentController = ({
  gameState,
  playerId,
  playerName,
  onJoin,
  onAnswer,
  onVote,
  onGuardianProtect,
  onGuardianMCQ,
}) => {
  const [hasJoined, setHasJoined] = useState(false);
  const [myFactionId, setMyFactionId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef(null);

  // Find player's faction
  useEffect(() => {
    if (hasJoined && myFactionId) return;
    
    for (const [factionId, faction] of Object.entries(gameState.factions)) {
      if (faction.players.some(p => p.id === playerId)) {
        setMyFactionId(factionId);
        setHasJoined(true);
        break;
      }
    }
  }, [gameState.factions, playerId, hasJoined, myFactionId]);

  // Timer management
  useEffect(() => {
    if (gameState.phase === GAME_CONFIG.PHASES.ANSWERING) {
      setTimeRemaining(GAME_CONFIG.QUESTION_TIME_LIMIT);
    } else if (gameState.phase === GAME_CONFIG.PHASES.VOTING) {
      setTimeRemaining(GAME_CONFIG.VOTING_TIME_LIMIT);
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timeRemaining]);

  const handleJoin = (name, factionId) => {
    setMyFactionId(factionId);
    setHasJoined(true);
    onJoin(name, factionId);
  };

  const handleAnswer = (answer) => {
    const timeSpent = GAME_CONFIG.QUESTION_TIME_LIMIT - timeRemaining;
    onAnswer(answer, timeSpent);
  };

  // Not joined yet
  if (!hasJoined) {
    return <JoinScreen onJoin={handleJoin} gameState={gameState} />;
  }

  const myFaction = getFactionById(myFactionId);
  const myFactionState = gameState.factions[myFactionId];
  const isEliminated = myFactionState?.isEliminated;

  // Guardian mode for eliminated factions
  if (isEliminated) {
    return (
      <GuardianPhase
        factions={gameState.factions}
        myFactionId={myFactionId}
        onProtect={onGuardianProtect}
        onMCQAnswer={onGuardianMCQ}
      />
    );
  }

  // Render based on game phase
  switch (gameState.phase) {
    case GAME_CONFIG.PHASES.LOBBY:
      return (
        <div className="min-h-screen bg-cyber-dark flex flex-col items-center justify-center p-6">
          <div 
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-6"
            style={{ backgroundColor: `${myFaction.color}30`, border: `3px solid ${myFaction.color}` }}
          >
            {myFaction.icon}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{myFaction.name}</h2>
          <p className="text-gray-400 mb-6">Waiting for game to start...</p>
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Connected</span>
          </div>
        </div>
      );

    case GAME_CONFIG.PHASES.LISTENING:
      return (
        <ListeningPhase 
          segment={gameState.segments?.[gameState.currentSegmentIndex]}
          faction={myFaction}
        />
      );

    case GAME_CONFIG.PHASES.ANSWERING:
      return (
        <SwipeAnswerPhase
          question={gameState.currentQuestion}
          timeRemaining={timeRemaining}
          onAnswer={handleAnswer}
          faction={myFaction}
        />
      );

    case GAME_CONFIG.PHASES.VOTING:
      return (
        <VotingPhase
          factions={gameState.factions}
          myFactionId={myFactionId}
          timeRemaining={timeRemaining}
          onVote={onVote}
        />
      );

    case GAME_CONFIG.PHASES.BATTLE:
      return (
        <BattleResults
          attackResults={gameState.attackResults}
          factions={gameState.factions}
          myFactionId={myFactionId}
        />
      );

    case GAME_CONFIG.PHASES.GAME_OVER:
      const winner = FACTIONS[gameState.winner];
      const isWinner = gameState.winner === myFactionId;
      
      return (
        <div className="min-h-screen bg-cyber-dark flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">{isWinner ? '🏆' : '💀'}</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {isWinner ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-gray-400 mb-6">
              {isWinner 
                ? `${myFaction.name} has conquered all!` 
                : `${winner?.name} has won the battle!`}
            </p>
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto"
              style={{ backgroundColor: `${winner?.color}30`, border: `3px solid ${winner?.color}` }}
            >
              {winner?.icon}
            </div>
          </motion.div>
        </div>
      );

    default:
      return (
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      );
  }
};
