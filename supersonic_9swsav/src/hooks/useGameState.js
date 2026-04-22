import { useState, useCallback } from 'react';
import { GAME_CONFIG } from '../constants/gameConfig';
import { FACTION_IDS } from '../constants/factions';

const createInitialFactionState = () => {
  const factions = {};
  FACTION_IDS.forEach(id => {
    factions[id] = {
      id,
      hp: GAME_CONFIG.INITIAL_HP,
      players: [],
      isEliminated: false,
      guardianShield: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
    };
  });
  return factions;
};

const INITIAL_GAME_STATE = {
  phase: GAME_CONFIG.PHASES.LOBBY,
  currentSegmentIndex: 0,
  currentQuestionIndex: 0,
  factions: createInitialFactionState(),
  segments: [],
  currentQuestion: null,
  timeRemaining: 0,
  roundNumber: 1,
  eventLog: [],
  votingResults: {},
  attackResults: null,
  winner: null,
  setupMode: true,
  currentSegment: null,
};

export const useGameState = () => {
  const [gameState, setGameState] = useState(() => ({
    ...INITIAL_GAME_STATE,
    factions: createInitialFactionState(),
  }));

  const updateGameState = useCallback((updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  }, []);

  const addEventLog = useCallback((message, type = 'info') => {
    const event = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString(),
    };
    setGameState(prev => ({
      ...prev,
      eventLog: [event, ...prev.eventLog].slice(0, 50),
    }));
  }, []);

  const joinFaction = useCallback((playerId, playerName, factionId) => {
    setGameState(prev => {
      const faction = prev.factions[factionId];
      if (!faction || faction.players.some(p => p.id === playerId)) {
        return prev;
      }
      return {
        ...prev,
        factions: {
          ...prev.factions,
          [factionId]: {
            ...faction,
            players: [...faction.players, { id: playerId, name: playerName, score: 0 }],
          },
        },
      };
    });
  }, []);

  const setSegments = useCallback((segments) => {
    setGameState(prev => ({
      ...prev,
      segments,
      currentSegment: segments[0] || null,
    }));
  }, []);

  const setSetupMode = useCallback((mode) => {
    setGameState(prev => ({ ...prev, setupMode: mode }));
  }, []);

  const setCurrentSegment = useCallback((segment) => {
    setGameState(prev => ({ ...prev, currentSegment: segment }));
  }, []);

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: GAME_CONFIG.PHASES.LISTENING,
      currentSegmentIndex: 0,
      roundNumber: 1,
      setupMode: false,
      currentSegment: prev.segments[0] || null,
      eventLog: [
        {
          id: Date.now(),
          message: '🎮 Game Started! Prepare for battle!',
          type: 'success',
          timestamp: new Date().toISOString(),
        },
        ...prev.eventLog,
      ].slice(0, 50),
    }));
  }, []);

  const startListeningPhase = useCallback((segmentIndex) => {
    setGameState(prev => ({
      ...prev,
      phase: GAME_CONFIG.PHASES.LISTENING,
      currentSegmentIndex: segmentIndex,
      currentSegment: prev.segments[segmentIndex] || null,
      eventLog: [
        {
          id: Date.now(),
          message: `🎧 Listening Phase - Segment ${segmentIndex + 1}`,
          type: 'info',
          timestamp: new Date().toISOString(),
        },
        ...prev.eventLog,
      ].slice(0, 50),
    }));
  }, []);

  const startQuestionPhase = useCallback((question) => {
    setGameState(prev => ({
      ...prev,
      phase: GAME_CONFIG.PHASES.ANSWERING,
      currentQuestion: question,
      timeRemaining: GAME_CONFIG.QUESTION_TIME_LIMIT,
      eventLog: [
        {
          id: Date.now(),
          message: '❓ Answer the question!',
          type: 'warning',
          timestamp: new Date().toISOString(),
        },
        ...prev.eventLog,
      ].slice(0, 50),
    }));
  }, []);

  const startVotingPhase = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: GAME_CONFIG.PHASES.VOTING,
      timeRemaining: GAME_CONFIG.VOTING_TIME_LIMIT,
      votingResults: {},
      eventLog: [
        {
          id: Date.now(),
          message: '🎯 Choose your target!',
          type: 'warning',
          timestamp: new Date().toISOString(),
        },
        ...prev.eventLog,
      ].slice(0, 50),
    }));
  }, []);

  const recordPlayerAnswer = useCallback((playerId, factionId, answer, timeSpent) => {
    setGameState(prev => {
      const faction = prev.factions[factionId];
      if (!faction) return prev;

      const playerIndex = faction.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return prev;

      const isCorrect = answer === prev.currentQuestion?.correctAnswer;
      const speedBonus = Math.max(0, GAME_CONFIG.SPEED_BONUS_MAX - Math.floor(timeSpent / 2));
      const points = isCorrect ? (10 + speedBonus) : 0;

      const updatedPlayers = [...faction.players];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        lastAnswer: answer,
        lastAnswerCorrect: isCorrect,
        lastAnswerTime: timeSpent,
        score: updatedPlayers[playerIndex].score + points,
      };

      return {
        ...prev,
        factions: {
          ...prev.factions,
          [factionId]: {
            ...faction,
            players: updatedPlayers,
          },
        },
      };
    });
  }, []);

  const recordVote = useCallback((factionId, targetFactionId) => {
    setGameState(prev => ({
      ...prev,
      votingResults: {
        ...prev.votingResults,
        [factionId]: {
          ...(prev.votingResults[factionId] || {}),
          [targetFactionId]: (prev.votingResults[factionId]?.[targetFactionId] || 0) + 1,
        },
      },
    }));
  }, []);

  const calculateAndExecuteAttacks = useCallback(() => {
    setGameState(prev => {
      const attacks = [];
      const newFactions = JSON.parse(JSON.stringify(prev.factions));

      Object.keys(prev.factions).forEach(attackerId => {
        const attacker = prev.factions[attackerId];
        if (attacker.isEliminated) return;

        const votes = prev.votingResults[attackerId] || {};
        let targetId = null;
        let maxVotes = 0;

        Object.entries(votes).forEach(([targetFactionId, voteCount]) => {
          if (voteCount > maxVotes) {
            maxVotes = voteCount;
            targetId = targetFactionId;
          }
        });

        if (!targetId || prev.factions[targetId]?.isEliminated) return;

        const correctAnswers = attacker.players.filter(p => p.lastAnswerCorrect).length;
        const totalPlayers = attacker.players.length || 1;
        const accuracy = correctAnswers / totalPlayers;
        const avgSpeed = attacker.players.reduce((sum, p) => sum + (p.lastAnswerTime || GAME_CONFIG.QUESTION_TIME_LIMIT), 0) / totalPlayers;
        const speedBonus = Math.max(0, GAME_CONFIG.SPEED_BONUS_MAX - Math.floor(avgSpeed / 2));
        
        let damage = Math.round(GAME_CONFIG.BASE_DAMAGE * accuracy * GAME_CONFIG.ACCURACY_MULTIPLIER + speedBonus);
        
        const target = prev.factions[targetId];
        const shieldReduction = target.guardianShield / 100;
        damage = Math.round(damage * (1 - shieldReduction));

        if (damage > 0) {
          attacks.push({
            attackerId,
            targetId,
            damage,
            accuracy: Math.round(accuracy * 100),
          });

          newFactions[targetId].hp = Math.max(0, newFactions[targetId].hp - damage);
          newFactions[targetId].totalDamageTaken += damage;
          newFactions[targetId].isEliminated = newFactions[targetId].hp <= 0;
          newFactions[attackerId].totalDamageDealt += damage;
        }
      });

      const survivingFactions = Object.values(newFactions).filter(f => !f.isEliminated);
      const winner = survivingFactions.length === 1 ? survivingFactions[0].id : null;

      return {
        ...prev,
        phase: GAME_CONFIG.PHASES.BATTLE,
        factions: newFactions,
        attackResults: attacks,
        winner,
      };
    });
  }, []);

  const applyGuardianProtection = useCallback((guardianFactionId, protectedFactionId) => {
    setGameState(prev => {
      const guardianFaction = prev.factions[guardianFactionId];
      if (!guardianFaction?.isEliminated) return prev;

      const guardianCount = guardianFaction.players.length;
      const shieldBonus = guardianCount * GAME_CONFIG.GUARDIAN_SHIELD_PER_PLAYER;

      return {
        ...prev,
        factions: {
          ...prev.factions,
          [protectedFactionId]: {
            ...prev.factions[protectedFactionId],
            guardianShield: prev.factions[protectedFactionId].guardianShield + shieldBonus,
          },
        },
        eventLog: [
          {
            id: Date.now(),
            message: `👻 Guardians protecting with ${GAME_CONFIG.GUARDIAN_SHIELD_PER_PLAYER}% shield!`,
            type: 'info',
            timestamp: new Date().toISOString(),
          },
          ...prev.eventLog,
        ].slice(0, 50),
      };
    });
  }, []);

  const healFaction = useCallback((factionId, amount) => {
    setGameState(prev => ({
      ...prev,
      factions: {
        ...prev.factions,
        [factionId]: {
          ...prev.factions[factionId],
          hp: Math.min(GAME_CONFIG.MAX_HP, prev.factions[factionId].hp + amount),
        },
      },
    }));
  }, []);

  const nextRound = useCallback(() => {
    setGameState(prev => {
      const nextIndex = prev.currentSegmentIndex + 1;
      return {
        ...prev,
        phase: GAME_CONFIG.PHASES.LISTENING,
        roundNumber: prev.roundNumber + 1,
        currentSegmentIndex: nextIndex,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        attackResults: null,
        votingResults: {},
        currentSegment: prev.segments[nextIndex] || null,
      };
    });
  }, []);

  const endGame = useCallback((winnerId) => {
    setGameState(prev => ({
      ...prev,
      phase: GAME_CONFIG.PHASES.GAME_OVER,
      winner: winnerId,
      eventLog: [
        {
          id: Date.now(),
          message: '🏆 Game Over! Winner declared!',
          type: 'success',
          timestamp: new Date().toISOString(),
        },
        ...prev.eventLog,
      ].slice(0, 50),
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      ...INITIAL_GAME_STATE,
      factions: createInitialFactionState(),
    });
  }, []);

  return {
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
  };
};
