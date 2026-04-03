import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ARTICLES = [
  {
    slug: 'how-to-split-stems-from-youtube-free-ai',
    title: 'How to Split Stems from YouTube for Free (AI Method)',
    desc: 'Step-by-step: paste a YouTube link, get back lossless stems — vocals, drums, bass, more. 100% free, fully offline, no quality loss.',
  },
  {
    slug: 'demucs-vs-mdx-net-honest-comparison',
    title: 'MDX-Net vs. Demucs: Which is Better for Your Mix?',
    desc: 'A deep dive into the architecture of modern separation models and why a hybrid approach is the only way to get artifact-free audio.',
  },
  {
    slug: 'privacy-cloud-stem-splitting',
    title: 'Privacy in the AI Era: The Hidden Cost of Cloud Separation.',
    desc: "Why uploading your unreleased masters to cloud platforms might be a security risk you aren't prepared for.",
  },
];

const SEOSection = () => {
  return (
    <section className="py-24 max-w-6xl mx-auto px-4 bg-[#0a0f1d]">
      <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4">Free Game</p>
      <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter text-white">Master the Science<br/>of Sound.</h2>
      <p className="max-w-xl text-gray-400 text-lg mb-16 font-medium">We believe in transparent tech. Learn how stem splitting works and why it's changing the music industry.</p>

      <div className="grid md:grid-cols-3 gap-6">
        {ARTICLES.map((article, i) => (
          <Link
            key={i}
            to={`/blog/${article.slug}`}
            className="group p-10 bg-white/[0.01] border border-white/5 rounded-3xl hover:bg-cyan-500/[0.02] hover:border-cyan-500/20 transition-all duration-500 cursor-pointer backdrop-blur-sm block no-underline"
          >
            <h4 className="text-lg font-black mb-4 leading-tight group-hover:text-white transition-colors uppercase italic tracking-tighter text-white">{article.title}</h4>
            <p className="text-sm text-gray-400 font-medium leading-relaxed mb-8">{article.desc}</p>
            <div className="flex items-center gap-2 text-xs font-black text-cyan-400 tracking-widest uppercase">
              Read Full Guide <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-black text-gray-500 hover:text-cyan-400 transition-colors uppercase tracking-widest">
          View all articles <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
};

export default SEOSection;
