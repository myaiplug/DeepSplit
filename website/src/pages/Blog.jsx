import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const BLOG_POSTS = [
  {
    slug: 'how-to-split-stems-from-youtube-free-ai',
    title: 'How to Split Stems from YouTube for Free (AI Method)',
    excerpt:
      'Step-by-step guide to isolating vocals, drums, bass, and more from any YouTube video — 100% free, 100% offline, no quality loss.',
    readTime: '8 min read',
    tags: ['Stem Splitting', 'YouTube', 'Free Tool', 'Tutorial'],
    date: 'April 3, 2025',
    featured: true,
  },
  {
    slug: 'demucs-vs-mdx-net-honest-comparison',
    title: 'MDX-Net vs. Demucs: An Honest Comparison (We Tested Both)',
    excerpt:
      'We ran hundreds of tracks through both models. Here is the real-world breakdown of quality, speed, and which one wins for each use-case.',
    readTime: '6 min read',
    tags: ['AI Models', 'Comparison', 'Demucs', 'MDX-Net'],
    date: 'March 28, 2025',
    featured: false,
  },
  {
    slug: 'privacy-cloud-stem-splitting',
    title: 'Why You Should Never Upload Your Unreleased Music to a Cloud Stem Splitter',
    excerpt:
      'The terms of service most cloud tools use are alarming. Your unreleased masters may not be as private as you think.',
    readTime: '5 min read',
    tags: ['Privacy', 'Security', 'Cloud vs Local'],
    date: 'March 20, 2025',
    featured: false,
  },
  {
    slug: 'stem-splitting-sampling-producers',
    title: 'Stem Splitting for Producers: The Ultimate Sampling Workflow',
    excerpt:
      'How to use AI separation to legally flip samples, rebuild drum patterns, and extract basslines — the right way.',
    readTime: '7 min read',
    tags: ['Production', 'Sampling', 'Workflow'],
    date: 'March 12, 2025',
    featured: false,
  },
];

const tagColors = [
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
];

const Blog = () => {
  const featured = BLOG_POSTS.find((p) => p.featured);
  const rest = BLOG_POSTS.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#f3f4f6] font-sans">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-16 max-w-6xl mx-auto px-4">
        <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4">Free Game</p>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-none">
          No Gatekeeping.<br />
          <span className="text-cyan-400">Just Real Knowledge.</span>
        </h1>
        <p className="max-w-2xl text-gray-400 text-lg font-medium leading-relaxed">
          Tutorials, honest model comparisons, and deep dives into the tech behind AI stem splitting — written by the people who built it.
        </p>
      </section>

      {/* Featured Post */}
      {featured && (
        <section className="max-w-6xl mx-auto px-4 mb-16">
          <Link
            to={`/blog/${featured.slug}`}
            className="group block p-10 md:p-14 bg-white/[0.02] border border-cyan-500/20 rounded-3xl hover:bg-cyan-500/[0.03] hover:border-cyan-500/40 transition-all duration-500 no-underline"
          >
            <div className="flex flex-wrap gap-2 mb-6">
              {featured.tags.map((tag, i) => (
                <span
                  key={tag}
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${tagColors[i % tagColors.length]}`}
                >
                  {tag}
                </span>
              ))}
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2 flex items-center gap-1">
                <Clock size={10} /> {featured.readTime}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-4 group-hover:text-cyan-300 transition-colors leading-tight">
              {featured.title}
            </h2>
            <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-3xl mb-8">
              {featured.excerpt}
            </p>
            <div className="flex items-center gap-2 text-sm font-black text-cyan-400 tracking-widest uppercase">
              Read the Full Guide <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </section>
      )}

      {/* Rest of posts */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {rest.map((post, i) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group block p-8 bg-white/[0.01] border border-white/5 rounded-3xl hover:bg-cyan-500/[0.02] hover:border-cyan-500/20 transition-all duration-500 no-underline"
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.slice(0, 2).map((tag, j) => (
                  <span
                    key={tag}
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${tagColors[(i + j + 1) % tagColors.length]}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-black tracking-tighter text-white mb-3 group-hover:text-cyan-300 transition-colors leading-tight uppercase italic">
                {post.title}
              </h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {post.readTime}
                </span>
                <span className="flex items-center gap-1 text-cyan-400 group-hover:gap-2 transition-all uppercase tracking-widest font-black">
                  Read <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
