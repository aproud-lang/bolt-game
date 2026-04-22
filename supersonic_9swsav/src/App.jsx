import { useEffect, useRef, useState, useCallback } from 'react';
import { useNoonAuth } from './hooks/useNoonAuth';
import { useQuestions } from './hooks/useQuestions';
import { answerService } from './services/answerService';
import {
  cleanup,
  initTelemetry,
  setConfig,
  trackActivityEnd,
  trackActivityStart,
  trackPointEnd,
  trackPointStart,
} from './services/telemetry';
import { multiplayerService } from './services/MultiplayerService';
import { useGameState } from './hooks/useGameState';
import { RoleSelection } from './components/RoleSelection';
import { DemoModeWrapper } from './components/DemoModeWrapper';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { PresenterView } from './components/presenter/PresenterView';
import { StudentController } from './components/student/StudentController';
import { MESSAGE_TYPES, GAME_CONFIG } from './constants/gameConfig';
import './index.css';

// Configure telemetry for this activity
setConfig({
  activityId: 'sonic-factions',
  debug: import.meta.env.DEV,
});

function App() {
  // All hooks must be called unconditionally at the top
  const { token, user, sessionDetails, team, defaultHeaders, status, error } = useNoonAuth();
  
  const {
    questions,
    activityId,
    status: questionsStatus,
    isConfigured: questionsConfigured,
  } = useQuestions({
    sessionSlideId: sessionDetails?.sessionSlideId,
    token,
    sessionDetails,
    defaultHeaders,
    authStatus: status,
  });

  const {
    gameState,
    updateGameState,
    addEventLog,
    joinFaction,
    setSegments,
    setSetupMode,
    setCurrentSegment,
    startGame,
    startListeningPhase,
    startQuestionPhase,
    startVotingPhase,
    recordPlayerAnswer,
    recordVote,
    calculateAndExecuteAttacks,
    applyGuardianProtection,
    healFaction,
    nextRound,
    endGame,
    resetGame,
  } = useGameState();

  const [selectedRole, setSelectedRole] = useState(null);
  const [hasSelectedInitialRole, setHasSelectedInitialRole] = useState(false);
  const [multiplayerStatus, setMultiplayerStatus] = useState('disconnected');
  const [demoPlayerId] = useState('demo-player-1');
  const [demoPlayerName, setDemoPlayerName] = useState('Demo Player');
  
  const activityStartedRef = useRef(false);

  // Initialize telemetry when auth is ready
  useEffect(() => {
    if (status === 'authenticated' && token?.accessToken) {
      initTelemetry({
        accessToken: token.accessToken,
        sessionDetails,
        user,
        defaultHeaders,
      });

      if (!activityStartedRef.current) {
        trackActivityStart();
        activityStartedRef.current = true;
      }
    }
  }, [status, token, sessionDetails, user, defaultHeaders]);

  // Handle incoming multiplayer messages
  const handleMultiplayerMessage = useCallback((msg) => {
    const { type, payload, senderId } = msg;

    switch (type) {
      case MESSAGE_TYPES.GAME_STATE_UPDATE:
        updateGameState(payload);
        break;

      case MESSAGE_TYPES.PHASE_CHANGE:
        updateGameState({ phase: payload.phase });
        if (payload.segmentIndex !== undefined) {
          updateGameState({ currentSegmentIndex: payload.segmentIndex });
        }
        break;

      case MESSAGE_TYPES.START_QUESTION:
        startQuestionPhase(payload.question);
        break;

      case MESSAGE_TYPES.START_VOTING:
        startVotingPhase();
        break;

      case MESSAGE_TYPES.EXECUTE_ATTACK:
        updateGameState({
          phase: GAME_CONFIG.PHASES.BATTLE,
          attackResults: payload.attacks,
          factions: payload.factions,
        });
        break;

      case MESSAGE_TYPES.PLAYER_JOIN:
        joinFaction(senderId, payload.playerName, payload.factionId);
        addEventLog(`${payload.playerName} joined ${payload.factionId}!`, 'info');
        break;

      case MESSAGE_TYPES.PLAYER_ANSWER:
        recordPlayerAnswer(senderId, payload.factionId, payload.answer, payload.timeSpent);
        break;

      case MESSAGE_TYPES.PLAYER_VOTE:
        recordVote(payload.factionId, payload.targetFactionId);
        break;

      case MESSAGE_TYPES.GUARDIAN_PROTECT:
        applyGuardianProtection(payload.guardianFactionId, payload.protectedFactionId);
        break;

      case MESSAGE_TYPES.GUARDIAN_MCQ_ANSWER:
        if (payload.isCorrect) {
          healFaction(payload.protectedFactionId, GAME_CONFIG.GUARDIAN_HEAL_AMOUNT);
        }
        break;

      case MESSAGE_TYPES.GAME_OVER:
        endGame(payload.winner);
        break;

      default:
        console.log('[Game] Unknown message type:', type);
    }
  }, [updateGameState, joinFaction, addEventLog, recordPlayerAnswer, recordVote, 
      applyGuardianProtection, healFaction, startQuestionPhase, startVotingPhase, endGame]);

  // Connect multiplayer when auth + room are ready
  useEffect(() => {
    if (status !== 'authenticated' || !token?.accessToken || !sessionDetails?.roomId) {
      return;
    }

    multiplayerService
      .connect({ accessToken: token.accessToken, sessionDetails }, 'sonic-factions')
      .catch((err) => console.error('[Multiplayer] Connection error:', err));

    const unsubStatus = multiplayerService.onStatusChange((newStatus) => {
      setMultiplayerStatus(newStatus.status);
    });

    const unsubMessages = multiplayerService.onMessage((msg) => {
      handleMultiplayerMessage(msg);
    });

    const unsubHistory = multiplayerService.onHistoryReceived((history) => {
      console.log('[Multiplayer] Received history:', history.length, 'messages');
      const latestState = history.find(m => m.type === 'GAME_STATE_UPDATE');
      if (latestState?.payload) {
        updateGameState(latestState.payload);
      }
    });

    return () => {
      unsubStatus();
      unsubMessages();
      unsubHistory();
      multiplayerService.disconnect();
    };
  }, [status, token, sessionDetails, handleMultiplayerMessage, updateGameState]);

  // Cleanup telemetry on unmount
  useEffect(() => {
    return () => cleanup();
  }, []);

  // Broadcast helper
  const broadcast = useCallback((payload) => {
    multiplayerService.broadcast(payload);
  }, []);

  // Get effective player ID (real or demo)
  const getPlayerId = useCallback(() => {
    return user?.id || demoPlayerId;
  }, [user, demoPlayerId]);

  const getPlayerName = useCallback(() => {
    return user?.name || demoPlayerName;
  }, [user, demoPlayerName]);

  // Player action handlers
  const handlePlayerJoin = useCallback((playerName, factionId) => {
    const playerId = getPlayerId();
    joinFaction(playerId, playerName, factionId);
    setDemoPlayerName(playerName);
    broadcast({
      type: MESSAGE_TYPES.PLAYER_JOIN,
      playerName,
      factionId,
    });
    trackPointStart('player_join', { factionId });
  }, [getPlayerId, joinFaction, broadcast]);

  const handlePlayerAnswer = useCallback((answer, timeSpent) => {
    const playerId = getPlayerId();
    let playerFactionId = null;
    
    for (const [factionId, faction] of Object.entries(gameState.factions)) {
      if (faction.players.some(p => p.id === playerId)) {
        playerFactionId = factionId;
        break;
      }
    }

    if (!playerFactionId) return;

    recordPlayerAnswer(playerId, playerFactionId, answer, timeSpent);
    broadcast({
      type: MESSAGE_TYPES.PLAYER_ANSWER,
      factionId: playerFactionId,
      answer,
      timeSpent,
    });

    const isCorrect = answer === gameState.currentQuestion?.correctAnswer;
    trackPointEnd('question_' + gameState.currentQuestionIndex, {
      answer,
      correct: isCorrect,
      timeSpent,
    });
  }, [getPlayerId, gameState.factions, gameState.currentQuestion, gameState.currentQuestionIndex, recordPlayerAnswer, broadcast]);

  const handlePlayerVote = useCallback((targetFactionId) => {
    const playerId = getPlayerId();
    let playerFactionId = null;
    
    for (const [factionId, faction] of Object.entries(gameState.factions)) {
      if (faction.players.some(p => p.id === playerId)) {
        playerFactionId = factionId;
        break;
      }
    }

    if (!playerFactionId) return;

    recordVote(playerFactionId, targetFactionId);
    broadcast({
      type: MESSAGE_TYPES.PLAYER_VOTE,
      factionId: playerFactionId,
      targetFactionId,
    });
  }, [getPlayerId, gameState.factions, recordVote, broadcast]);

  const handleGuardianProtect = useCallback((protectedFactionId) => {
    const playerId = getPlayerId();
    let guardianFactionId = null;
    
    for (const [factionId, faction] of Object.entries(gameState.factions)) {
      if (faction.players.some(p => p.id === playerId)) {
        guardianFactionId = factionId;
        break;
      }
    }

    if (!guardianFactionId) return;

    applyGuardianProtection(guardianFactionId, protectedFactionId);
    broadcast({
      type: MESSAGE_TYPES.GUARDIAN_PROTECT,
      guardianFactionId,
      protectedFactionId,
    });
  }, [getPlayerId, gameState.factions, applyGuardianProtection, broadcast]);

  const handleGuardianMCQ = useCallback((isCorrect) => {
    broadcast({
      type: MESSAGE_TYPES.GUARDIAN_MCQ_ANSWER,
      isCorrect,
      protectedFactionId: null,
    });
  }, [broadcast]);

  // Role change handler
  const handleRoleChange = useCallback((newRole) => {
    console.log('[App] Role change:', newRole);
    setSelectedRole(newRole);
  }, []);

  // Initial role selection handler
  const handleInitialRoleSelect = useCallback((role) => {
    console.log('[App] Initial role select:', role);
    setSelectedRole(role);
    setHasSelectedInitialRole(true);
  }, []);

  // Render loading state
  if (status === 'initializing') {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connecting to Noon...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400">{error?.message || 'Failed to authenticate'}</p>
        </div>
      </div>
    );
  }

  // Render role selection
  if (!hasSelectedInitialRole) {
    return <RoleSelection onSelectRole={handleInitialRoleSelect} />;
  }

  // Render main app
  return (
    <DemoModeWrapper
      currentRole={selectedRole}
      onRoleChange={handleRoleChange}
      gameState={gameState}
    >
      {selectedRole === 'TEACHER' && (
        <TeacherDashboard
          gameState={gameState}
          onStartGame={startGame}
          onSetSegments={setSegments}
          onSetSetupMode={setSetupMode}
          onSetCurrentSegment={setCurrentSegment}
          onStartListening={startListeningPhase}
          onStartQuestion={startQuestionPhase}
          onStartVoting={startVotingPhase}
          onExecuteAttacks={calculateAndExecuteAttacks}
          onNextRound={nextRound}
          onEndGame={endGame}
          onResetGame={resetGame}
          multiplayerStatus={multiplayerStatus}
          broadcast={broadcast}
        />
      )}

      {selectedRole === 'PRESENTER' && (
        <PresenterView gameState={gameState} />
      )}

      {selectedRole === 'STUDENT' && (
        <StudentController
          gameState={gameState}
          playerId={getPlayerId()}
          playerName={getPlayerName()}
          onJoin={handlePlayerJoin}
          onAnswer={handlePlayerAnswer}
          onVote={handlePlayerVote}
          onGuardianProtect={handleGuardianProtect}
          onGuardianMCQ={handleGuardianMCQ}
        />
      )}

      {!selectedRole && (
        <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
          <p className="text-white">No role selected. Use the demo mode button to select a role.</p>
        </div>
      )}
    </DemoModeWrapper>
  );
}

export default App;
