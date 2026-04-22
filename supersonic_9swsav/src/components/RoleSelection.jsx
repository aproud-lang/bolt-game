import { motion } from 'framer-motion';
import { Users, Crown, Gamepad2 } from 'lucide-react';

export const RoleSelection = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cyber-dark via-purple-900/20 to-cyber-dark">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 text-center">
        {/* Logo */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-glow">
              SONIC
            </span>
            <br />
            <span className="text-white">FACTIONS</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl">
            The Ultimate Classroom Battle Arena
          </p>
        </motion.div>

        {/* Role Selection Cards */}
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          {/* Teacher Card */}
          <motion.button
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectRole('TEACHER')}
            className="group relative w-72 h-80 rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 group-hover:from-amber-500/30 group-hover:to-orange-600/30 transition-all duration-300" />
            <div className="absolute inset-[1px] rounded-2xl bg-cyber-dark/90 backdrop-blur-xl" />
            <div className="absolute inset-0 border border-amber-500/30 rounded-2xl group-hover:border-amber-400/50 transition-colors" />
            
            <div className="relative h-full flex flex-col items-center justify-center p-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-amber-400 mb-2">TEACHER</h2>
              <p className="text-gray-400 text-sm text-center">
                Host the game, control segments, and watch the battle unfold
              </p>
              <div className="mt-6 px-6 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium group-hover:bg-amber-500/30 transition-colors">
                Host Game
              </div>
            </div>
          </motion.button>

          {/* Student Card */}
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectRole('STUDENT')}
            className="group relative w-72 h-80 rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-all duration-300" />
            <div className="absolute inset-[1px] rounded-2xl bg-cyber-dark/90 backdrop-blur-xl" />
            <div className="absolute inset-0 border border-cyan-500/30 rounded-2xl group-hover:border-cyan-400/50 transition-colors" />
            
            <div className="relative h-full flex flex-col items-center justify-center p-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">STUDENT</h2>
              <p className="text-gray-400 text-sm text-center">
                Join a faction, answer questions, and lead your team to victory
              </p>
              <div className="mt-6 px-6 py-2 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium group-hover:bg-cyan-500/30 transition-colors">
                Join Battle
              </div>
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 flex items-center justify-center gap-2 text-gray-500"
        >
          <Users className="w-4 h-4" />
          <span className="text-sm">Up to 150 players • 6 Factions • Real-time Battle</span>
        </motion.div>
      </div>
    </div>
  );
};
