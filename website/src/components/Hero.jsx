import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-32 pb-16 overflow-hidden bg-[#0a0f1d]">
      {/* Background Glows */}
      <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[120px] animate-[pulse_12s_infinite]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-black text-cyan-400 tracking-[0.2em] mb-8 uppercase"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        STATE-OF-THE-ART AI · MDX + DEMUCS HYBRID
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-[clamp(3rem,8vw,6.5rem)] font-black leading-[1.0] tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-cyan-500"
      >
        Stop Renting Stems.<br />
        <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent italic">Own the Source.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-2xl text-lg md:text-xl text-gray-400 font-medium mb-10 leading-relaxed"
      >
        The world's first professional AI stem separator that lives on your desktop.
        No cloud, no track limits, and zero subscriptions. Total privacy for your creative process.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-wrap gap-4 justify-center mb-16"
      >
        <a href="#download" className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] rounded-2xl font-black shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:translate-y-[-3px] hover:shadow-[0_0_60px_rgba(34,211,238,0.5)] transition-all duration-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download for Windows
        </a>
        <a href="#how" className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
          See how it works
        </a>
      </motion.div>

      {/* Waveform Mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full max-w-4xl bg-white/[0.01] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-700"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="flex justify-between items-center mb-6">
          <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">// Engine V2.1 Process: hybrid_pipeline.wav</span>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/40" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
            <div className="w-2 h-2 rounded-full bg-green-500/40" />
          </div>
        </div>
        
        <div className="space-y-3">
          {['VOCALS', 'DRUMS', 'BASS', 'OTHER'].map((label, i) => (
            <div key={label} className="flex items-center gap-4">
              <span className={`w-16 text-[10px] font-bold font-mono ${i === 0 ? 'text-pink-500' : i === 1 ? 'text-yellow-500' : i === 2 ? 'text-blue-500' : 'text-purple-500'}`}>{label}</span>
              <div className="flex-1 h-8 flex items-center gap-[2px]">
                {Array.from({ length: 40 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex-1 rounded-full bar"
                    style={{
                      height: `${20 + Math.random() * 80}%`,
                      backgroundColor: i === 0 ? '#22d3ee88' : i === 1 ? '#eab30888' : i === 2 ? '#a855f788' : '#6b728088',
                      animationDelay: `${j * 0.05 + i * 0.1}s`
                    }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] text-gray-600 w-10 text-right">-{Math.round(Math.random()*6+2)}dB</span>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-bold tracking-[0.2em] text-gray-500">
           <span className="text-cyan-400">99.4% QUALITY SCORE</span>
           <span>LOCAL PROCESSING (0.0ms LATENCY)</span>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
