import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipForward, Upload, Plus, Trash2, 
  Settings, Users, Zap, Volume2, Clock, Target,
  ChevronRight, Save, Eye, Music, X, FastForward,
  RotateCcw, StopCircle, AlertCircle
} from 'lucide-react';
import { FACTIONS, FACTION_IDS } from '../../constants/factions';
import { GAME_CONFIG } from '../../constants/gameConfig';
import { FactionCard } from '../game/FactionCard';
import { EventLog } from '../game/EventLog';
import { BattleArena } from '../game/BattleArena';

export const TeacherDashboard = ({ 
  gameState, 
  onStartGame, 
  onSetSegments,
  onSetSetupMode,
  onSetCurrentSegment,
  onStartListening,
  onStartQuestion,
  onStartVoting,
  onExecuteAttacks,
  onNextRound,
  onEndGame,
  onResetGame,
  multiplayerStatus,
  broadcast,
}) => {
  // Determine if we should show setup mode based on game phase
  // If game has started (phase is not LOBBY), we should NOT show setup
  const isGameStarted = gameState.phase !== GAME_CONFIG.PHASES.LOBBY;
  const showSetupMode = !isGameStarted && gameState.setupMode !== false;
  
  // Use gameState for segments and currentSegment - these persist across role switches!
  const segments = gameState.segments || [];
  const currentSegment = gameState.currentSegment;

  // Local state only for form inputs and audio playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [localAudioFile, setLocalAudioFile] = useState(null);
  const [localAudioUrl, setLocalAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const [newSegment, setNewSegment] = useState({
    title: '',
    startTime: 0,
    endTime: 0,
    question: {
      text: '',
      correctAnswer: GAME_CONFIG.ANSWER_TYPES.TRUE,
    },
  });

  // Debug log
  useEffect(() => {
    console.log('[TeacherDashboard] Render state:', {
      phase: gameState.phase,
      setupMode: gameState.setupMode,
      isGameStarted,
      showSetupMode,
      segmentsCount: segments.length,
      currentSegment: currentSegment?.title,
    });
  }, [gameState.phase, gameState.setupMode, isGameStarted, showSetupMode, segments.length, currentSegment]);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;
    
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      alert('Please select a valid audio file (MP3, WAV, OGG, M4A, AAC)');
      return;
    }

    const url = URL.createObjectURL(file);
    setLocalAudioFile(file);
    setLocalAudioUrl(url);

    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(Math.floor(audio.duration));
    });
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAudio = () => {
    if (localAudioUrl) {
      URL.revokeObjectURL(localAudioUrl);
    }
    setLocalAudioFile(null);
    setLocalAudioUrl(null);
    setAudioDuration(0);
    setIsPlaying(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    return () => {
      if (localAudioUrl) {
        URL.revokeObjectURL(localAudioUrl);
      }
    };
  }, [localAudioUrl]);

  const handleAddSegment = () => {
    if (!newSegment.title || !newSegment.question.text) return;
    
    const segment = {
      id: Date.now(),
      ...newSegment,
    };
    
    const newSegments = [...segments, segment];
    onSetSegments(newSegments);
    
    setNewSegment({
      title: '',
      startTime: 0,
      endTime: 0,
      question: {
        text: '',
        correctAnswer: GAME_CONFIG.ANSWER_TYPES.TRUE,
      },
    });
  };

  const handleRemoveSegment = (id) => {
    const newSegments = segments.filter(s => s.id !== id);
    onSetSegments(newSegments);
  };

  const handleStartGame = () => {
    if (segments.length === 0) {
      alert('Please add at least one segment with a question');
      return;
    }
    onSetCurrentSegment(segments[0]);
    onSetSetupMode(false);
    onStartGame();
    broadcast({
      type: 'GAME_STATE_UPDATE',
      phase: GAME_CONFIG.PHASES.LISTENING,
      segments,
    });
  };

  const handleStartQuestion = () => {
    if (!currentSegment) {
      // Try to use the first segment if currentSegment is not set
      const segmentToUse = segments[gameState.currentSegmentIndex] || segments[0];
      if (!segmentToUse) {
        console.error('No segment available!');
        return;
      }
      onSetCurrentSegment(segmentToUse);
      onStartQuestion(segmentToUse.question);
      broadcast({
        type: 'START_QUESTION',
        question: segmentToUse.question,
        timeLimit: GAME_CONFIG.QUESTION_TIME_LIMIT,
      });
    } else {
      onStartQuestion(currentSegment.question);
      broadcast({
        type: 'START_QUESTION',
        question: currentSegment.question,
        timeLimit: GAME_CONFIG.QUESTION_TIME_LIMIT,
      });
    }
  };

  const handleStartVoting = () => {
    onStartVoting();
    broadcast({
      type: 'START_VOTING',
      timeLimit: GAME_CONFIG.VOTING_TIME_LIMIT,
    });
  };

  const handleExecuteAttacks = () => {
    onExecuteAttacks();
  };

  const handleNextRound = () => {
    const nextIndex = gameState.currentSegmentIndex + 1;
    if (nextIndex < segments.length) {
      onNextRound();
      onSetCurrentSegment(segments[nextIndex]);
      broadcast({
        type: 'PHASE_CHANGE',
        phase: GAME_CONFIG.PHASES.LISTENING,
        segmentIndex: nextIndex,
      });
    } else {
      handleEndGame();
    }
  };

  const handleEndGame = () => {
    const survivingFactions = Object.values(gameState.factions).filter(f => !f.isEliminated);
    let winnerId;
    if (survivingFactions.length === 1) {
      winnerId = survivingFactions[0].id;
    } else if (survivingFactions.length > 0) {
      const winner = survivingFactions.reduce((a, b) => (a.hp || 0) > (b.hp || 0) ? a : b);
      winnerId = winner.id;
    } else {
      winnerId = 'RED';
    }
    onEndGame(winnerId);
    broadcast({
      type: 'GAME_OVER',
      winner: winnerId,
      factions: gameState.factions,
    });
  };

  const handleBackToSetup = () => {
    onSetSetupMode(true);
    if (onResetGame) {
      onResetGame();
    }
  };

  const handleForceNextPhase = () => {
    const currentPhase = gameState.phase;
    
    switch (currentPhase) {
      case GAME_CONFIG.PHASES.LISTENING:
        handleStartQuestion();
        break;
      case GAME_CONFIG.PHASES.ANSWERING:
        handleStartVoting();
        break;
      case GAME_CONFIG.PHASES.VOTING:
        handleExecuteAttacks();
        break;
      case GAME_CONFIG.PHASES.BATTLE:
        handleNextRound();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!showSetupMode && gameState.attackResults) {
      broadcast({
        type: 'EXECUTE_ATTACK',
        attacks: gameState.attackResults,
        factions: gameState.factions,
      });
    }
  }, [gameState.attackResults, showSetupMode, broadcast]);

  const totalPlayers = Object.values(gameState.factions).reduce(
    (sum, f) => sum + (f.players?.length || 0), 0
  );

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get the effective current segment
  const effectiveCurrentSegment = currentSegment || segments[gameState.currentSegmentIndex] || segments[0];

  // SETUP MODE VIEW
  if (showSetupMode) {
    return (
      <div className="min-h-screen bg-cyber-dark p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Game Setup</h1>
              <p className="text-gray-400">Configure your audio segments and questions</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400">
                <Users className="w-5 h-5" />
                <span>{totalPlayers} Players Joined</span>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                multiplayerStatus === 'connected' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                <Zap className="w-5 h-5" />
                <span>{multiplayerStatus}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Audio & Segments */}
            <div className="space-y-6">
              {/* Audio Upload */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-cyan-400" />
                  Audio File (Optional)
                </h2>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!localAudioFile ? (
                  <div
                    onClick={handleUploadClick}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                      isDragging 
                        ? 'border-cyan-500 bg-cyan-500/10' 
                        : 'border-gray-600 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                    }`}
                  >
                    <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                      isDragging ? 'text-cyan-400' : 'text-gray-500'
                    }`} />
                    <p className={`mb-2 transition-colors ${
                      isDragging ? 'text-cyan-400' : 'text-gray-400'
                    }`}>
                      {isDragging ? 'Drop audio file here' : 'Drop audio file here or click to upload'}
                    </p>
                    <p className="text-gray-500 text-sm">Supports MP3, WAV, OGG, M4A, AAC</p>
                  </div>
                ) : (
                  <div className="bg-cyber-darker rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={togglePlayback}
                        className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white ml-1" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Music className="w-4 h-4 text-cyan-400" />
                          <p className="text-white font-medium truncate">{localAudioFile.name}</p>
                        </div>
                        <p className="text-gray-500 text-sm">
                          Duration: {formatDuration(audioDuration)} • {(localAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveAudio}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <audio
                      ref={audioRef}
                      src={localAudioUrl}
                      onEnded={() => setIsPlaying(false)}
                      onPause={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                    />
                  </div>
                )}
              </div>

              {/* Add Segment Form */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan-400" />
                  Add Question Round
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Round Title</label>
                    <input
                      type="text"
                      value={newSegment.title}
                      onChange={(e) => setNewSegment(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-cyber-darker border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                      placeholder="e.g., Round 1, History Question..."
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">T/F/NG Question</label>
                    <textarea
                      value={newSegment.question.text}
                      onChange={(e) => setNewSegment(prev => ({ 
                        ...prev, 
                        question: { ...prev.question, text: e.target.value }
                      }))}
                      className="w-full bg-cyber-darker border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none resize-none"
                      rows={3}
                      placeholder="Enter your True/False/Not Given question..."
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Correct Answer</label>
                    <div className="flex gap-2">
                      {Object.values(GAME_CONFIG.ANSWER_TYPES).map(type => (
                        <button
                          key={type}
                          onClick={() => setNewSegment(prev => ({
                            ...prev,
                            question: { ...prev.question, correctAnswer: type }
                          }))}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                            newSegment.question.correctAnswer === type
                              ? type === 'TRUE' 
                                ? 'bg-green-500 text-white'
                                : type === 'FALSE'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-yellow-500 text-black'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleAddSegment}
                    disabled={!newSegment.title || !newSegment.question.text}
                    className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                      newSegment.title && newSegment.question.text
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                    Add Round
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Segments List & Start */}
            <div className="space-y-6">
              {/* Segments List */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Question Rounds ({segments.length})
                </h2>

                {segments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No rounds added yet</p>
                    <p className="text-sm">Add question rounds to start the game</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {segments.map((segment, index) => (
                      <motion.div
                        key={segment.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-cyber-darker rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-sm flex items-center justify-center">
                                {index + 1}
                              </span>
                              <h3 className="font-medium text-white">{segment.title}</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">{segment.question.text}</p>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              segment.question.correctAnswer === 'TRUE'
                                ? 'bg-green-500/20 text-green-400'
                                : segment.question.correctAnswer === 'FALSE'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {segment.question.correctAnswer}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveSegment(segment.id)}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Players by Faction */}
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Players by Faction
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {FACTION_IDS.map(factionId => {
                    const faction = FACTIONS[factionId];
                    const playerCount = gameState.factions[factionId]?.players?.length || 0;
                    return (
                      <div
                        key={factionId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-cyber-darker"
                        style={{ borderLeft: `3px solid ${faction.color}` }}
                      >
                        <span className="text-2xl">{faction.icon}</span>
                        <div>
                          <p className="text-white text-sm font-medium">{faction.name}</p>
                          <p className="text-gray-500 text-xs">{playerCount} players</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Start Game Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartGame}
                disabled={segments.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  segments.length > 0
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-6 h-6" />
                Start Game ({segments.length} rounds)
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // GAME CONTROL VIEW (when game has started)
  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* Top Bar */}
      <div className="bg-cyber-darker border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">
              <span className="text-cyan-400">SONIC</span> FACTIONS
            </h1>
            <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
              Round {gameState.roundNumber} / {segments.length}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-gray-400">
              Phase: <span className="text-white font-medium">{gameState.phase}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400">
              <Users className="w-4 h-4" />
              {totalPlayers}
            </div>
            <button
              onClick={handleBackToSetup}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Battle Arena */}
          <div className="col-span-8">
            <BattleArena 
              factions={gameState.factions} 
              attackResults={gameState.attackResults}
              phase={gameState.phase}
            />
          </div>

          {/* Control Panel & Event Log */}
          <div className="col-span-4 space-y-4">
            {/* Game Controls */}
            <div className="glass rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Game Controls</h2>
              
              {/* Phase indicator */}
              <div className="mb-4 p-3 rounded-lg bg-cyber-darker">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Current Phase</span>
                  <span className="text-cyan-400 font-medium">{gameState.phase}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Round</span>
                  <span className="text-white">{gameState.roundNumber} / {segments.length}</span>
                </div>
              </div>
              
              {/* Phase-specific controls */}
              <div className="space-y-2">
                {gameState.phase === GAME_CONFIG.PHASES.LISTENING && (
                  <button
                    onClick={handleStartQuestion}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500"
                  >
                    <ChevronRight className="w-5 h-5" />
                    Start Question
                  </button>
                )}

                {gameState.phase === GAME_CONFIG.PHASES.ANSWERING && (
                  <button
                    onClick={handleStartVoting}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-purple-400 hover:to-pink-500"
                  >
                    <Target className="w-5 h-5" />
                    End Answering → Start Voting
                  </button>
                )}

                {gameState.phase === GAME_CONFIG.PHASES.VOTING && (
                  <button
                    onClick={handleExecuteAttacks}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-red-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-red-400 hover:to-orange-500"
                  >
                    <Zap className="w-5 h-5" />
                    Execute Attacks!
                  </button>
                )}

                {gameState.phase === GAME_CONFIG.PHASES.BATTLE && (
                  <>
                    {gameState.currentSegmentIndex < segments.length - 1 ? (
                      <button
                        onClick={handleNextRound}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-green-400 hover:to-emerald-500"
                      >
                        <SkipForward className="w-5 h-5" />
                        Next Round ({gameState.roundNumber + 1} / {segments.length})
                      </button>
                    ) : (
                      <button
                        onClick={handleEndGame}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-amber-500"
                      >
                        <StopCircle className="w-5 h-5" />
                        End Game (Final Round)
                      </button>
                    )}
                  </>
                )}

                {gameState.phase === GAME_CONFIG.PHASES.GAME_OVER && (
                  <div className="text-center py-4">
                    <p className="text-yellow-400 font-bold text-lg mb-2">🏆 Game Over!</p>
                    <p className="text-gray-400 text-sm">Winner: {FACTIONS[gameState.winner]?.name}</p>
                    <button
                      onClick={handleBackToSetup}
                      className="mt-4 w-full py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                    >
                      Start New Game
                    </button>
                  </div>
                )}

                {/* Quick skip button (always visible during game) */}
                {gameState.phase !== GAME_CONFIG.PHASES.GAME_OVER && (
                  <button
                    onClick={handleForceNextPhase}
                    className="w-full py-2 rounded-lg bg-gray-700 text-gray-300 text-sm flex items-center justify-center gap-2 hover:bg-gray-600"
                  >
                    <FastForward className="w-4 h-4" />
                    Skip to Next Phase
                  </button>
                )}
              </div>

              {/* Current Segment Info */}
              {effectiveCurrentSegment && gameState.phase !== GAME_CONFIG.PHASES.GAME_OVER && (
                <div className="mt-4 p-3 rounded-lg bg-cyber-darker border border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Current Question</p>
                  <p className="text-white font-medium text-sm">{effectiveCurrentSegment.title}</p>
                  <p className="text-cyan-400 text-xs mt-2 line-clamp-2">{effectiveCurrentSegment.question?.text}</p>
                  <div className="mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      effectiveCurrentSegment.question?.correctAnswer === 'TRUE'
                        ? 'bg-green-500/20 text-green-400'
                        : effectiveCurrentSegment.question?.correctAnswer === 'FALSE'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      Answer: {effectiveCurrentSegment.question?.correctAnswer}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Event Log */}
            <EventLog events={gameState.eventLog} />
          </div>
        </div>
      </div>
    </div>
  );
};
