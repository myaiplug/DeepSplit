import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="py-16 border-t border-white/5 text-center text-sm text-gray-500 bg-[#0a0f1d]">
      <div className="flex flex-col items-center justify-center gap-3 no-underline mb-8">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center font-black text-[10px] text-[#0a0f1d] shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              SS
            </div>
            <span className="text-lg font-black text-white leading-none tracking-tighter">
              StemSplit<span className="text-cyan-400">.AI</span>
            </span>
        </div>
        <span className="text-[8px] font-bold text-cyan-400/40 uppercase tracking-[0.2em]">Part of NoDAW Studio</span>
      </div>
      <p className="mb-8 font-black text-xs uppercase tracking-widest text-[#f3f4f6]/40">Professional AI Audio Separation · Built with ❤️ & PyTorch</p>
      <div className="flex justify-center gap-8 mb-12">
        <a href="#how" className="font-bold text-gray-500 hover:text-cyan-400 transition-colors">How it works</a>
        <a href="#demos" className="font-bold text-gray-500 hover:text-cyan-400 transition-colors">Modes</a>
        <a href="/blog/how-to-split-stems-from-youtube" className="font-bold text-gray-500 hover:text-cyan-400 transition-colors">Blog</a>
        <a href="#features" className="font-bold text-gray-500 hover:text-cyan-400 transition-colors">Features</a>
        <Link to="/blog" className="font-bold text-gray-500 hover:text-cyan-400 transition-colors">Free Game</Link>
        <a href="#download" className="font-bold text-gray-500 hover:text-cyan-400 transition-colors">Download</a>
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 font-black">© 2025 StemSplit. Free & open source.</p>
    </footer>
  );
};

export default Footer;
