import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 py-5 bg-[#0a0f1d]/80 backdrop-blur-xl border-b border-cyan-500/10">
      <Link to="/" className="flex items-center gap-3 no-underline group">
        <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center font-black text-xs text-[#0a0f1d] shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-500">
          SS
        </div>
        <div className="flex flex-col">
            <span className="text-lg font-black text-white leading-none tracking-tighter">
              StemSplit<span className="text-cyan-400">.AI</span>
            </span>
            <span className="text-[8px] font-bold text-cyan-400/40 uppercase tracking-[0.2em] mt-0.5">Part of NoDAW Studio</span>
        </div>
      </Link>
      <ul className="hidden md:flex gap-8 list-none">
        <li><a href="/#how" className="text-sm font-bold text-gray-400 hover:text-cyan-400 transition-all duration-300">How it works</a></li>
        <li><a href="/#demos" className="text-sm font-bold text-gray-400 hover:text-cyan-400 transition-all duration-300">Benchmarks</a></li>
        <li><Link to="/youtube" className="text-sm font-black text-cyan-400 hover:text-white transition-all duration-300 uppercase tracking-widest italic drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">YouTube Splitter (v2)</Link></li>
      </ul>
      <a href="/#download" className="bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0a0f1d] px-6 py-2.5 rounded-full text-sm font-black shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all duration-500">
        ⬇ Download Free
      </a>
    </nav>
  );
};

export default Navbar;
