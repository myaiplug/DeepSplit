import React from 'react';
import { ArrowRight } from 'lucide-react';

const ARTICLES = [
  { title: 'MDX-Net vs. Demucs: Which is better for your mix?', desc: 'An deep dive into the architecture of modern separation models and why a hybrid approach is the only way to get artifacts-free audio.' },
  { title: 'Privacy in the AI Era: The hidden cost of cloud separation.', desc: 'Why uploading your unreleased masters to cloud platforms might be a security risk you aren\'t prepared for.' },
  { title: 'Sampling Mastery: How DrumSep isolates hits.', desc: 'Isolate individual kicks and snares from a fully mastered record to build your custom sample packs with zero phase issues.' },
];

const SEOSection = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-4 bg-[#0a0f1d]">
      <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4">Free Game</p>
      <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter text-white">Master the Science<br/>of Sound.</h2>
      <p className="max-w-xl text-gray-400 text-lg mb-16 font-medium">We believe in transparent tech. Learn how stem splitting works and why it's changing the music industry.</p>

      <div className="grid md:grid-cols-3 gap-6">
        {ARTICLES.map((article, i) => (
          <div key={i} className="group p-10 bg-white/[0.01] border border-white/5 rounded-3xl hover:bg-cyan-500/[0.02] hover:border-cyan-500/20 transition-all duration-500 cursor-pointer backdrop-blur-sm">
            <h4 className="text-lg font-black mb-4 leading-tight group-hover:text-white transition-colors uppercase italic tracking-tighter text-white">{article.title}</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-8">{article.desc}</p>
            <div className="flex items-center gap-2 text-xs font-black text-cyan-400 tracking-widest uppercase">
              Read Full Guide <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

    </section>
  );
};

export default SEOSection;
