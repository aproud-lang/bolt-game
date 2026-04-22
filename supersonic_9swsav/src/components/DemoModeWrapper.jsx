import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Users, Crown, Gamepad2, X, Monitor, Smartphone } from 'lucide-react';

export const DemoModeWrapper = ({ 
  children, 
  currentRole, 
  onRoleChange,
  gameState,
}) => {
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [viewMode, setViewMode] = useState('desktop');

  const roles = [
    { id: 'TEACHER', label: 'Teacher', icon: Crown, color: 'amber' },
    { id: 'STUDENT', label: 'Student', icon: Gamepad2, color: 'cyan' },
    { id: 'PRESENTER', label: 'Presenter', icon: Monitor, color: 'purple' },
  ];

  const handleRoleClick = useCallback((roleId) => {
    console.log('[DemoModeWrapper] Role clicked:', roleId);
    console.log('[DemoModeWrapper] Current role before change:', currentRole);
    onRoleChange(roleId);
    console.log('[DemoModeWrapper] onRoleChange called');
  }, [currentRole, onRoleChange]);

  return (
    <div className="relative w-full h-full">
      {/* Demo Mode Toggle Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => {
          console.log('[DemoModeWrapper] Toggle button clicked');
          setShowRoleSwitcher(!showRoleSwitcher);
        }}
        className="fixed bottom-4 right-4 z-[60] w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg flex items-center justify-center hover:from-purple-400 hover:to-pink-400 transition-all"
      >
        <Eye className="w-6 h-6" />
      </motion.button>

      {/* Role Switcher Panel */}
      <AnimatePresence>
        {showRoleSwitcher && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-20 right-4 z-[60] w-72 bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 shadow-2xl border border-purple-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                Demo Mode
              </h3>
              <button
                onClick={() => setShowRoleSwitcher(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Game State */}
            <div className="mb-4 p-3 rounded-lg bg-gray-800 text-xs">
              <p className="text-gray-400 mb-1">Game State</p>
              <p className="text-white">Phase: <span className="text-cyan-400">{gameState?.phase || 'LOBBY'}</span></p>
              <p className="text-white">Round: <span className="text-cyan-400">{gameState?.roundNumber || 1}</span></p>
              <p className="text-white">Segments: <span className="text-cyan-400">{gameState?.segments?.length || 0}</span></p>
              <p className="text-white">Setup Mode: <span className="text-cyan-400">{gameState?.setupMode ? 'Yes' : 'No'}</span></p>
            </div>

            {/* Role Selection */}
            <div className="space-y-2 mb-4">
              <p className="text-gray-400 text-xs mb-2">Switch View (preserves state)</p>
              {roles.map(role => {
                const Icon = role.icon;
                const isActive = currentRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleClick(role.id)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                      isActive
                        ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{role.label}</span>
                    {isActive && (
                      <span className="ml-auto text-xs bg-purple-500/30 px-2 py-0.5 rounded">Active</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('desktop')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all ${
                  viewMode === 'desktop'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Desktop
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all ${
                  viewMode === 'mobile'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Mobile
              </button>
            </div>

            {/* Info */}
            <p className="text-gray-500 text-xs mt-4 text-center">
              Switching roles preserves game state
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="w-full h-full">
        {viewMode === 'mobile' && currentRole === 'STUDENT' ? (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
            <div className="relative">
              {/* Phone Frame */}
              <div className="w-[375px] h-[812px] bg-black rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800">
                <div className="w-full h-full bg-gray-900 rounded-[2.5rem] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
                  {/* Content */}
                  <div className="w-full h-full overflow-auto">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
