import React from 'react';
import { Check } from 'lucide-react';

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-gradient-to-b from-[#0a0f1d] via-[#0a1528] to-[#0a0f1d]">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4">Pricing</p>
        <h2 className="text-4xl md:text-5xl font-black mb-16 tracking-tighter text-white">The Smart Creative Investment.</h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          {/* Free */}
          <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-10 flex flex-col hover:border-cyan-500/20 transition-all duration-500 backdrop-blur-sm">
            <h3 className="text-lg font-black mb-2 text-white italic">Open Source</h3>
            <div className="text-4xl font-black mb-6 text-white">$0 <span className="text-sm text-gray-500 font-normal">/forever</span></div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3 text-sm text-gray-400 font-medium"><Check size={16} className="text-cyan-400" /> 2-Stem Separation</li>
              <li className="flex items-center gap-3 text-sm text-gray-400 font-medium"><Check size={16} className="text-cyan-400" /> Clean Vocal Rip</li>
              <li className="flex items-center gap-3 text-sm text-gray-400 font-medium"><Check size={16} className="text-cyan-400" /> Unlimited Processing</li>
            </ul>
            <button className="w-full py-4 rounded-xl bg-white/5 border border-white/10 font-black text-xs uppercase tracking-widest text-white hover:bg-white/10 transition-all">Choose Free</button>
          </div>

          {/* Pro */}
          <div className="bg-white/[0.02] border border-cyan-500/30 rounded-3xl p-10 flex flex-col relative shadow-[0_30px_60px_-15px_rgba(34,211,238,0.2)] hover:shadow-[0_40px_80px_-15px_rgba(34,211,238,0.3)] transition-all duration-500 backdrop-blur-sm group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 to-purple-500" />
            <div className="absolute top-6 right-6 px-3 py-1 rounded-full bg-cyan-500/20 text-[10px] font-black text-cyan-400 tracking-widest uppercase border border-cyan-500/30">Best Value</div>
            <h3 className="text-lg font-black mb-2 text-white italic">Creator Pro</h3>
            <div className="text-4xl font-black mb-6 text-white">$49 <span className="text-sm text-gray-500 font-normal">/one-time</span></div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3 text-sm text-gray-200 font-bold"><Check size={16} className="text-cyan-400" /> 6-Stem Hybrid Pipeline</li>
              <li className="flex items-center gap-3 text-sm text-gray-200 font-bold"><Check size={16} className="text-cyan-400" /> Advanced DrumSep Module</li>
              <li className="flex items-center gap-3 text-sm text-gray-200 font-bold"><Check size={16} className="text-cyan-400" /> Desktop App (.exe) Included</li>
              <li className="flex items-center gap-3 text-sm text-gray-200 font-bold"><Check size={16} className="text-cyan-400" /> Early Access to Model V3</li>
            </ul>
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] font-black text-xs uppercase tracking-widest hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] hover:scale-[1.03] transition-all duration-500">Buy Once, Own Forever</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
