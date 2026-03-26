import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Zap, Shield, Repeat, Clock, DollarSign, Globe } from 'lucide-react';

const Comparison = () => {
  return (
    <section className="py-32 px-4 relative overflow-hidden bg-[#0a0f1d]">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <p className="text-cyan-400 text-xs font-black tracking-[0.4em] uppercase mb-4">The Battle for the Source</p>
          <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white">
            Stop Renting Stems.<br/>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent italic">Own the Engine.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
            Cloud platforms charge you per song and keep your data. StemSplit lives on your hardware, forever.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-stretch relative">
          {/* VS Badge */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white text-[#0a0f1d] font-black flex items-center justify-center z-20 border-8 border-[#0a0f1d] hidden lg:flex">
            VS
          </div>

          {/* Cloud Based */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/5 flex flex-col grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-700"
          >
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500">
                <Globe size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-400">Leading Cloud Sites</h3>
            </div>

            <ul className="space-y-6 flex-1 mb-10">
              {[
                { icon: <DollarSign size={20} />, text: 'Pay per track ($2 – $10 each)', cross: true },
                { icon: <Clock size={20} />, text: 'Queue wait times during peak hours', cross: true },
                { icon: <Shield size={20} />, text: 'Upload paths (Privacy Risk)', cross: true },
                { icon: <Repeat size={20} />, text: 'Monthly subscription required', cross: true },
                { icon: <Zap size={20} />, text: 'No offline processing', cross: true },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-gray-500 font-medium">
                  <div className="text-red-500/50 flex-shrink-0"><X size={20} /></div>
                  <div className="flex items-center gap-2">
                    <span className="opacity-40">{item.icon}</span>
                    {item.text}
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* StemSplit Desktop */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="p-10 rounded-[2.5rem] bg-cyan-400/[0.02] border border-cyan-400/20 flex flex-col relative overflow-hidden group shadow-[0_0_50px_rgba(34,211,238,0.05)] hover:shadow-[0_0_80px_rgba(34,211,238,0.1)] transition-all duration-700"
          >
            <div className="absolute top-0 right-0 px-6 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
              The Winner
            </div>

            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">StemSplit Desktop</h3>
            </div>

            <ul className="space-y-6 flex-1 mb-10">
              {[
                { icon: <DollarSign size={20} />, text: 'Infinite splits (Free / One-time Buy)' },
                { icon: <Clock size={20} />, text: 'Instant hardware acceleration' },
                { icon: <Shield size={20} />, text: '100% Private (No Uploads)' },
                { icon: <Repeat size={20} />, text: 'No subs. No limits. Just sound.' },
                { icon: <Globe size={20} />, text: 'Works offline in any studio' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-gray-200 font-bold group">
                  <div className="text-cyan-400 flex-shrink-0 group-hover:scale-125 transition-transform"><Check size={20} /></div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400/40">{item.icon}</span>
                    {item.text}
                  </div>
                </li>
              ))}
            </ul>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 mt-auto">
               <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-widest">
                  "The difference is night and day. Having the models run locally saved me hours of waiting for uploads."
                  <span className="block mt-2 text-cyan-400/60">— Verified User</span>
               </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
    </section>
  );
};

export default Comparison;
