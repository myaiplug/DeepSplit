import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import GenreBenchmarks from './components/GenreBenchmarks';
import Comparison from './components/Comparison';
import Pricing from './components/Pricing';
import SEOSection from './components/SEOSection';
import Footer from './components/Footer';
import ProFeatures from './components/ProFeatures';

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#f3f4f6] selection:bg-cyan-500/30 font-sans">
      <Navbar />
      <main>
        <Hero />
        
        {/* Features Preview Section */}
        <section id="how" className="py-24 max-w-6xl mx-auto px-4">
           <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-4">
                 <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-2xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10">🎵</div>
                 <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Drop your track</h3>
                 <p className="text-gray-400 text-sm leading-relaxed">Upload any MP3, WAV, FLAC or M4A file. Select a region or use the entire track.</p>
              </div>
              <div className="space-y-4">
                 <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-2xl border border-purple-500/20 shadow-lg shadow-purple-500/10">🎛</div>
                 <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Choose your mode</h3>
                 <p className="text-gray-400 text-sm leading-relaxed">Pick from 2-stem all the way up to 6-stem + advanced drum separation. GPU-optional.</p>
              </div>
              <div className="space-y-4">
                 <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-2xl border border-cyan-500/20 shadow-lg shadow-cyan-500/10">⬇</div>
                 <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Play & download</h3>
                 <p className="text-gray-400 text-sm leading-relaxed">Stems are ready individually — play them in the built-in mixer, apply FX, or export.</p>
              </div>
           </div>
        </section>

        <GenreBenchmarks />
        <ProFeatures />
        <Comparison />
        
        {/* Features Detail Section */}
        <section id="features" className="py-24 max-w-6xl mx-auto px-4 border-t border-white/5">
           <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4">Built different</p>
           <h2 className="text-4xl md:text-5xl font-black mb-16 tracking-tighter text-white">Everything you need.<br/>Nothing you don't.</h2>
           
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: '🏠', title: '100% Offline', desc: 'Your music never leaves your machine. All AI processing runs locally using your CPU or GPU.' },
                { icon: '🤖', title: 'SOTA AI Models', desc: 'Powered by Kim_Vocal_2 (MDX-Net) and htdemucs_6s — the same models used by professional studios.' },
                { icon: '⚡', title: 'GPU Acceleration', desc: 'StemSplit automatically detects your NVIDIA GPU and uses CUDA acceleration for 8x faster processing.' },
                { icon: '🎛', title: 'Studio Mixer', desc: 'Play, mute, solo and blend stems right in the app. Apply FX chains to individual tracks.' },
                { icon: '🥁', title: 'Advanced DrumSep', desc: 'Go beyond "drums" — isolate kick, snare, hi-hat and percussion as individual tracks.' },
                { icon: '📁', title: 'All Formats', desc: 'Accepts MP3, WAV, FLAC and M4A. Outputs clean normalized MP3 stems ready for your DAW.' },
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition-all duration-500 group">
                   <div className="text-3xl mb-6 group-hover:scale-110 transition-transform">{f.icon}</div>
                   <h3 className="text-lg font-black mb-3 uppercase italic tracking-tight text-white">{f.title}</h3>
                   <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
           </div>
        </section>

        <Pricing />
        
        {/* Final CTA */}
        <section id="download" className="py-32 text-center border-t border-white/5 relative overflow-hidden">
           <div className="absolute inset-0 bg-cyan-500/5 blur-[120px] rounded-full translate-y-1/2" />
           <div className="relative z-10 max-w-4xl mx-auto px-4">
              <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4">Free download</p>
              <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter text-white">Start separating<br/>today. For free.</h2>
              <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto">StemSplit is completely free. Download, install, and separate your first track in minutes.</p>
              
              <div className="flex flex-col items-center gap-4">
                 <button className="px-12 py-5 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] rounded-2xl font-black text-xl shadow-[0_0_50px_rgba(34,211,238,0.3)] hover:shadow-[0_0_80px_rgba(34,211,238,0.5)] hover:scale-105 transition-all duration-500">
                    Download for Windows (.exe)
                 </button>
                 <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                    v1.0 · Windows 10/11 · ~1.5 GB · Free forever
                 </div>
              </div>
           </div>
        </section>

        <SEOSection />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
