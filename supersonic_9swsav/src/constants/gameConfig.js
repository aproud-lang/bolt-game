export const GAME_CONFIG = {
  // HP Settings
  INITIAL_HP: 100,
  MAX_HP: 100,
  
  // Timing
  QUESTION_TIME_LIMIT: 10, // seconds
  VOTING_TIME_LIMIT: 15, // seconds
  AUDIO_SEGMENT_BUFFER: 2, // seconds after audio ends before questions
  
  // Scoring
  BASE_DAMAGE: 10,
  SPEED_BONUS_MAX: 5, // max bonus for fast answers
  ACCURACY_MULTIPLIER: 1.5, // multiplier for correct answers
  
  // Guardian Mechanic
  GUARDIAN_SHIELD_PER_PLAYER: 0.5, // % damage reduction per guardian
  GUARDIAN_HEAL_AMOUNT: 5, // HP healed per correct MCQ
  
  // Game Phases
  PHASES: {
    LOBBY: 'LOBBY',
    LISTENING: 'LISTENING',
    ANSWERING: 'ANSWERING',
    VOTING: 'VOTING',
    BATTLE: 'BATTLE',
    RESULTS: 'RESULTS',
    GAME_OVER: 'GAME_OVER',
  },
  
  // Answer Types
  ANSWER_TYPES: {
    TRUE: 'TRUE',
    FALSE: 'FALSE',
    NOT_GIVEN: 'NOT_GIVEN',
  },
};

export const MESSAGE_TYPES = {
  // Host -> All
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
  PHASE_CHANGE: 'PHASE_CHANGE',
  START_AUDIO: 'START_AUDIO',
  START_QUESTION: 'START_QUESTION',
  START_VOTING: 'START_VOTING',
  EXECUTE_ATTACK: 'EXECUTE_ATTACK',
  GAME_OVER: 'GAME_OVER',
  
  // Player -> Host
  PLAYER_JOIN: 'PLAYER_JOIN',
  PLAYER_ANSWER: 'PLAYER_ANSWER',
  PLAYER_VOTE: 'PLAYER_VOTE',
  GUARDIAN_PROTECT: 'GUARDIAN_PROTECT',
  GUARDIAN_MCQ_ANSWER: 'GUARDIAN_MCQ_ANSWER',
  
  // Sync
  REQUEST_STATE: 'REQUEST_STATE',
  SYNC_STATE: 'SYNC_STATE',
};
