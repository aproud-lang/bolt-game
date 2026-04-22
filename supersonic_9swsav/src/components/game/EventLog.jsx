import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Shield, Skull, Trophy, Target } from 'lucide-react';

const getEventIcon = (type) => {
  switch (type) {
    case 'attack': return <Zap className="w-4 h-4 text-red-400" />;
    case 'shield': return <Shield className="w-4 h-4 text-purple-400" />;
    case 'elimination': return <Skull className="w-4 h-4 text-gray-400" />;
    case 'victory': return <Trophy className="w-4 h-4 text-yellow-400" />;
    case 'warning': return <Target className="w-4 h-4 text-orange-400" />;
    case 'success': return <Trophy className="w-4 h-4 text-green-400" />;
    default: return <Activity className="w-4 h-4 text-cyan-400" />;
  }
};

export const EventLog = ({ events }) => {
  return (
    <div className="glass rounded-xl p-4 h-80 flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Activity className="w-5 h-5 text-cyan-400" />
        Event Log
      </h3>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="flex items-start gap-2 p-2 rounded-lg bg-cyber-darker"
            >
              <div className="mt-0.5">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 break-words">{event.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {events.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
