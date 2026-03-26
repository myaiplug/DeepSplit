import React from 'react';

const PRE_FX = [
  { name: 'AI BPM Detect', icon: '⏱️' },
  { name: 'Key & Scale Auto', icon: '🎹' },
  { name: 'LUFS Loudness Match', icon: '🔊' },
  { name: 'Phase Coherence', icon: '🌊' },
  { name: 'Stem → MIDI', icon: '🎼' },
  { name: 'Quick Bounce Mix', icon: '🎛️' },
];

const ProFeatures = () => {
  return (
    <section className="py-24 bg-[#0a0f1d] border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-[20%] left-[50%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] -translate-x-1/2 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4 text-center">Beyond Separation</p>
        <h2 className="text-4xl md:text-5xl font-black mb-16 tracking-tighter text-center text-white">
          A Complete Audio Suite.<br/>
          <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent italic">Zero DAW Required.</span>
        </h2>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pre-Processing */}
          <div className="lg:col-span-1 bg-white/[0.01] border border-white/5 rounded-3xl p-8 hover:border-cyan-500/30 transition-all duration-500 backdrop-blur-sm group shadow-2xl flex flex-col">
            <h3 className="text-xl font-black mb-2 text-white tracking-tight uppercase italic">Pre-Process Analytics</h3>
            <p className="text-gray-400 text-xs mb-8 font-medium leading-relaxed">Prepare audio before the split. Engine analyzes molecular structure instantly.</p>
            
            <div className="grid grid-cols-1 gap-3 flex-1">
              {PRE_FX.map((fx, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 group-hover:border-cyan-500/10 group-hover:bg-cyan-500/[0.02] transition-colors cursor-default">
                  <span className="text-lg">{fx.icon}</span>
                  <span className="text-xs font-bold text-gray-300 tracking-wide">{fx.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Processing */}
          <div className="lg:col-span-2 bg-white/[0.01] border border-white/5 rounded-3xl p-8 hover:border-purple-500/30 transition-all duration-500 backdrop-blur-sm group shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                 Post-Split Studio FX
                 <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase rounded-full border border-purple-500/30 animate-pulse">New</span>
              </h3>
            </div>
            
            <p className="text-gray-400 text-sm mb-8 font-medium leading-relaxed max-w-xl">
               Don't just isolate—elevate. Polish your stems with premium, top-shelf visual effects in a stunning, highly-responsive GUI. Includes full VST support and exclusive NoDAW Studio plugins.
            </p>
            
            <div className="flex flex-col md:flex-row gap-8 flex-1">
               {/* Categories */}
               <div className="flex-1 grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">Mastering & Dynamics</h4>
                     <div className="flex flex-wrap gap-2">
                        {['Pro Gate', 'Studio Comp', '3-Band EQ', 'Analog Warmth', 'Pro Maximizer', 'Stereo Widener', 'De-Reverb', 'DJ Filter'].map(fx => (
                           <span key={fx} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:border-cyan-500/50 transition-colors cursor-default">{fx}</span>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black tracking-[0.2em] text-purple-400 uppercase">Vocal Chain & Presets</h4>
                     <div className="flex flex-wrap gap-2">
                        {['Pitch Shifter', 'De-Esser', 'Tape Delay', 'Space Designer', 'Lead Vocal', 'Telephone', 'High Pitch', 'Loudness'].map(fx => (
                           <span key={fx} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:border-purple-500/50 transition-colors cursor-default">{fx}</span>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black tracking-[0.2em] text-pink-400 uppercase">Drums & Bass</h4>
                     <div className="flex flex-wrap gap-2">
                        {['Sub Enhance', 'Fuzz Bass', 'Synth Phase', 'Tight & Clean', 'Kick Boost', 'Jet Overhead', 'Crusher', 'Wide Kit', 'Octave Down'].map(fx => (
                           <span key={fx} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:border-pink-500/50 transition-colors cursor-default">{fx}</span>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">Exclusive Plugins + VST</h4>
                     <div className="flex flex-wrap gap-2 items-start">
                        {['Reverb De-Gloss', 'Temporal Pitch Portal', 'Vocal Breath Controller', '+ VST Capabilities', 'More soon...'].map((fx, i) => (
                           <span key={fx} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-default ${i < 3 ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' : 'bg-white/5 border border-white/10 text-gray-400'}`}>{fx}</span>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Visual UI */}
               <div className="w-full md:w-48 xl:w-56 h-full min-h-[160px] rounded-2xl bg-[#060912] border border-white/10 overflow-hidden relative group-hover:border-purple-500/30 transition-colors duration-500 shadow-inner flex shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
                  
                  {/* Mock Knobs / UI */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col items-center justify-center gap-6">
                     <div className="flex gap-4">
                        {[1, 2].map((_, i) => (
                           <div key={i} className="flex flex-col items-center gap-3">
                              <div className="w-12 h-12 rounded-full border-4 border-[#0a0f1d] bg-white/5 relative shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                 <div className="absolute top-0 left-0 w-full h-full rounded-full border-t-[3px] border-purple-400 rotate-45 group-hover:rotate-[180deg] transition-all duration-1000 ease-in-out" />
                                 <div className="w-1 h-2 bg-white absolute top-1.5 left-1/2 -translate-x-1/2 rounded-full group-hover:top-3 group-hover:left-[85%] transition-all duration-1000 ease-in-out" />
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="w-full px-8">
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-cyan-400 w-[30%] group-hover:w-full transition-all duration-1000 ease-in-out delay-200 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProFeatures;
