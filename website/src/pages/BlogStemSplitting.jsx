import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Music, Youtube, Zap, Download, Shield, Globe, CheckCircle, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const BlogStemSplitting = () => {
  // Set page metadata for SEO
  useEffect(() => {
    document.title = 'How to Split Stems from YouTube for Free (AI Method) | DeepSplit';

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn how to split stems from YouTube videos for free using AI-powered stem separation. Extract vocals, drums, bass, and more from any YouTube video with DeepSplit.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Learn how to split stems from YouTube videos for free using AI-powered stem separation. Extract vocals, drums, bass, and more from any YouTube video with DeepSplit.';
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#f3f4f6] selection:bg-cyan-500/30 font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] -z-10" />

        <article className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Music size={14} /> Free Game • No Gatekeeping
            </div>

            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter text-white leading-tight">
              How to Split Stems from YouTube for Free
              <span className="block bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent italic mt-2">
                (AI Method)
              </span>
            </h1>

            <p className="text-xl text-gray-400 font-medium mb-8">
              Extract vocals, drums, bass, guitar, piano, and more from any YouTube video using AI-powered stem separation. No downloads, no limits, completely free.
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>Last Updated: April 2026</span>
              <span>•</span>
              <span>10 min read</span>
              <span>•</span>
              <span>Beginner-Friendly</span>
            </div>
          </motion.div>

          {/* CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-16 p-8 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/10"
          >
            <h2 className="text-2xl font-black text-white mb-4">Try It Now (Takes 2 Minutes)</h2>
            <p className="text-gray-400 mb-6">
              Skip the tutorial and start splitting stems from YouTube videos right away. Paste any video URL and get studio-quality separated tracks.
            </p>
            <Link
              to="/youtube"
              className="inline-flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-white rounded-2xl font-bold shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transition-all"
            >
              <Youtube size={24} />
              Start Splitting Stems
              <ArrowRight size={20} />
            </Link>
          </motion.div>

          {/* Main Content */}
          <div className="prose prose-invert prose-lg max-w-none">

            {/* Section 1: What is Stem Splitting */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">What is Stem Splitting?</h2>

              <p className="text-gray-300 mb-4 leading-relaxed">
                Stem splitting (also called stem separation or audio source separation) is the process of taking a mixed audio track and separating it into individual components called "stems." Think of it like unmixing a cake back into flour, eggs, sugar, and butter—except for music.
              </p>

              <p className="text-gray-300 mb-4 leading-relaxed">
                A typical song might be split into:
              </p>

              <ul className="list-disc pl-6 text-gray-300 mb-6 space-y-2">
                <li><strong className="text-white">Vocals</strong> — Lead and backing vocals</li>
                <li><strong className="text-white">Drums</strong> — Kick, snare, hi-hats, cymbals, percussion</li>
                <li><strong className="text-white">Bass</strong> — Bass guitar, synth bass, 808s</li>
                <li><strong className="text-white">Guitar</strong> — Acoustic and electric guitars</li>
                <li><strong className="text-white">Piano</strong> — Keys, piano, synths</li>
                <li><strong className="text-white">Other</strong> — Everything else (strings, horns, FX)</li>
              </ul>

              <p className="text-gray-300 leading-relaxed">
                Until recently, this required expensive studio software and hours of manual editing. Now, AI models can do it in minutes with shockingly good quality.
              </p>
            </section>

            {/* Section 2: Why Split Stems from YouTube */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">Why Split Stems from YouTube?</h2>

              <p className="text-gray-300 mb-6 leading-relaxed">
                YouTube is the world's largest music library. Whether you're a producer, DJ, content creator, or musician, being able to extract stems directly from YouTube unlocks endless creative possibilities:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3">For Music Producers</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Sample vocals for remixes</li>
                    <li>• Study drum patterns from your favorite tracks</li>
                    <li>• Create mashups and bootlegs</li>
                    <li>• Learn mixing techniques by isolating elements</li>
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-purple-400 mb-3">For DJs & Performers</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Create acapellas for live performances</li>
                    <li>• Build custom instrumental versions</li>
                    <li>• Isolate drums for transitions</li>
                    <li>• Extract vocals for karaoke tracks</li>
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-pink-400 mb-3">For Content Creators</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Remove vocals from background music</li>
                    <li>• Create custom backing tracks</li>
                    <li>• Extract instrumentals for videos</li>
                    <li>• Study vocal melodies and harmonies</li>
                  </ul>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-orange-400 mb-3">For Musicians</h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>• Learn songs by ear with isolated parts</li>
                    <li>• Practice along with stems</li>
                    <li>• Transcribe complex arrangements</li>
                    <li>• Create custom practice tracks</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3: How AI Stem Separation Works */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">How AI Stem Separation Works</h2>

              <p className="text-gray-300 mb-4 leading-relaxed">
                Modern stem separation uses deep learning models trained on thousands of hours of music. The two most popular approaches are:
              </p>

              <h3 className="text-2xl font-bold text-white mb-4 mt-8">1. Demucs (Meta's Hybrid Transformer Model)</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Developed by Meta (Facebook) AI Research, Demucs is a state-of-the-art source separation model. It uses a hybrid architecture combining:
              </p>
              <ul className="list-disc pl-6 text-gray-300 mb-6 space-y-2">
                <li>Time-domain convolutional networks (for temporal patterns)</li>
                <li>Spectral transformers (for frequency analysis)</li>
                <li>Attention mechanisms (to focus on relevant features)</li>
              </ul>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Demucs excels at separating drums, bass, and other instruments with incredible clarity. It's the gold standard for 4-stem separation (vocals, drums, bass, other).
              </p>

              <h3 className="text-2xl font-bold text-white mb-4 mt-8">2. MDX-Net (Music Demixing Challenge Winner)</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">
                MDX-Net is an ensemble model that won multiple music demixing competitions. It specializes in vocal extraction and uses:
              </p>
              <ul className="list-disc pl-6 text-gray-300 mb-6 space-y-2">
                <li>Multi-scale spectral analysis</li>
                <li>Complex neural architectures with residual connections</li>
                <li>Ensemble averaging for robust predictions</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                MDX models are particularly good at cleanly isolating vocals, making them perfect for acapella extraction or vocal removal.
              </p>
            </section>

            {/* Section 4: DeepSplit vs Competitors */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">DeepSplit vs. Other Stem Splitters</h2>

              <p className="text-gray-300 mb-6 leading-relaxed">
                Let's be real—there are other stem splitting tools out there. Some are great, some are mediocre, and some are straight-up scams. Here's an honest comparison:
              </p>

              <div className="overflow-x-auto mb-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-4 px-4 text-white font-bold">Feature</th>
                      <th className="py-4 px-4 text-cyan-400 font-bold">DeepSplit</th>
                      <th className="py-4 px-4 text-gray-400 font-bold">Lalal.ai</th>
                      <th className="py-4 px-4 text-gray-400 font-bold">Moises</th>
                      <th className="py-4 px-4 text-gray-400 font-bold">Spleeter</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-4 text-gray-300">YouTube Support</td>
                      <td className="py-4 px-4 text-green-400 font-bold">✓ Direct URL</td>
                      <td className="py-4 px-4 text-gray-500">✗ Upload only</td>
                      <td className="py-4 px-4 text-green-400">✓ But limited</td>
                      <td className="py-4 px-4 text-gray-500">✗ Local only</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-4 text-gray-300">Price</td>
                      <td className="py-4 px-4 text-green-400 font-bold">FREE</td>
                      <td className="py-4 px-4 text-orange-400">$18/mo</td>
                      <td className="py-4 px-4 text-orange-400">$12/mo</td>
                      <td className="py-4 px-4 text-green-400">FREE</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-4 text-gray-300">Max Stems</td>
                      <td className="py-4 px-4 text-green-400 font-bold">6 stems</td>
                      <td className="py-4 px-4 text-gray-400">4 stems</td>
                      <td className="py-4 px-4 text-gray-400">5 stems</td>
                      <td className="py-4 px-4 text-gray-400">4 stems</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-4 text-gray-300">Audio Quality</td>
                      <td className="py-4 px-4 text-green-400 font-bold">Lossless WAV</td>
                      <td className="py-4 px-4 text-gray-400">MP3/WAV</td>
                      <td className="py-4 px-4 text-gray-400">MP3/WAV</td>
                      <td className="py-4 px-4 text-gray-400">WAV only</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-4 text-gray-300">Built-in FX</td>
                      <td className="py-4 px-4 text-green-400 font-bold">✓ Full suite</td>
                      <td className="py-4 px-4 text-gray-500">✗ None</td>
                      <td className="py-4 px-4 text-green-400">✓ Basic</td>
                      <td className="py-4 px-4 text-gray-500">✗ None</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-4 px-4 text-gray-300">Processing Speed</td>
                      <td className="py-4 px-4 text-green-400 font-bold">GPU-accelerated</td>
                      <td className="py-4 px-4 text-gray-400">Cloud-based</td>
                      <td className="py-4 px-4 text-gray-400">Cloud-based</td>
                      <td className="py-4 px-4 text-gray-400">CPU only</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-gray-300">Privacy</td>
                      <td className="py-4 px-4 text-green-400 font-bold">Local + Auto-delete</td>
                      <td className="py-4 px-4 text-orange-400">Cloud storage</td>
                      <td className="py-4 px-4 text-orange-400">Cloud storage</td>
                      <td className="py-4 px-4 text-green-400">Local only</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-2xl font-bold text-white mb-4 mt-8">What Makes DeepSplit Different?</h3>

              <div className="space-y-4 mb-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-cyan-500/20">
                      <Zap className="text-cyan-400" size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Hybrid AI Pipeline</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        We don't just use one model—we chain MDX-Net and Demucs together for the best possible results. Start with MDX for pristine vocal extraction, then run Demucs on the instrumental for surgical drum/bass/guitar separation. This hybrid approach gives you cleaner stems than any single-model solution.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/20">
                      <Music className="text-purple-400" size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">Built-in Mixing & Mastering</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        Every stem can be enhanced with professional FX presets: vocal tuning, drum compression, bass enhancement, guitar EQ, and more. These presets alone could be a separate product—but we include them for free because we're not gatekeeping. Apply studio-grade processing with one click.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-pink-500/20">
                      <Globe className="text-pink-400" size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-2">First of Its Kind</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        DeepSplit is the first online tool that combines high-quality offline processing, YouTube support, unlimited stem splitting, and automatic mixing/mastering—all in one place. No subscriptions, no watermarks, no limits. Just pure, studio-quality stems whenever you need them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Step-by-Step Guide */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">How to Split Stems from YouTube (Step-by-Step)</h2>

              <p className="text-gray-300 mb-8 leading-relaxed">
                Ready to extract stems? Here's exactly how to do it with DeepSplit:
              </p>

              <div className="space-y-6">
                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-black text-xl">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">Find Your YouTube Video</h3>
                    <p className="text-gray-300 mb-3 leading-relaxed">
                      Go to YouTube and find the video you want to split. It can be a music video, live performance, podcast, or anything with audio. Copy the URL from your browser's address bar.
                    </p>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-gray-400 font-mono">
                      Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-black text-xl">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">Go to DeepSplit YouTube Splitter</h3>
                    <p className="text-gray-300 mb-3 leading-relaxed">
                      Navigate to our YouTube stem splitting tool. You'll see a clean interface with an input field for your YouTube URL.
                    </p>
                    <Link
                      to="/youtube"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors text-sm font-bold"
                    >
                      <Youtube size={16} />
                      Open YouTube Splitter
                    </Link>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-black text-xl">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">Choose Your Settings</h3>
                    <p className="text-gray-300 mb-4 leading-relaxed">
                      Select your preferred output format and number of stems:
                    </p>
                    <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
                      <li><strong className="text-white">Format:</strong> WAV (lossless), MP3 (compressed), or FLAC (lossless compressed)</li>
                      <li><strong className="text-white">4 Stems:</strong> Vocals, Drums, Bass, Other (fastest, good quality)</li>
                      <li><strong className="text-white">5 Stems:</strong> Vocals, Drums, Bass, Guitar, Other (balanced)</li>
                      <li><strong className="text-white">6 Stems:</strong> Vocals, Drums, Bass, Guitar, Piano, Other (recommended)</li>
                    </ul>
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm">
                      <p className="text-cyan-400 font-bold mb-2">Pro Tip:</p>
                      <p className="text-gray-300">
                        Use WAV format with 6 stems for the highest quality. The processing takes a bit longer, but you'll get studio-grade separation that rivals expensive paid tools.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-black text-xl">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">Start Processing</h3>
                    <p className="text-gray-300 mb-3 leading-relaxed">
                      Paste your YouTube URL and click "Split to High-Res Stems." Our AI pipeline will:
                    </p>
                    <ol className="list-decimal pl-6 text-gray-300 space-y-2">
                      <li>Download the audio from YouTube (0-30% progress)</li>
                      <li>Convert to high-quality WAV format</li>
                      <li>Run surgical stem separation with AI models (30-95% progress)</li>
                      <li>Package all stems into a downloadable ZIP (95-100% progress)</li>
                    </ol>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-black text-xl">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">Preview & Download</h3>
                    <p className="text-gray-300 mb-4 leading-relaxed">
                      When processing completes, a modal will pop up showing all your stems. Each stem has:
                    </p>
                    <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
                      <li>Play/pause button to preview the isolated track</li>
                      <li>Volume control to adjust playback level</li>
                      <li>Mute/unmute toggle</li>
                      <li>Download button for individual stems</li>
                    </ul>
                    <p className="text-gray-300 leading-relaxed">
                      You can also download all stems at once as a ZIP archive. Perfect for importing into your DAW!
                    </p>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-black text-xl">
                    6
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">Apply FX (Optional)</h3>
                    <p className="text-gray-300 mb-3 leading-relaxed">
                      Want to enhance your stems? Use our built-in FX presets:
                    </p>
                    <ul className="list-disc pl-6 text-gray-300 space-y-2">
                      <li><strong className="text-white">Vocal presets:</strong> Auto-tune, de-esser, compression, reverb</li>
                      <li><strong className="text-white">Drum presets:</strong> Punch, thump, crisp, compression</li>
                      <li><strong className="text-white">Bass presets:</strong> Sub boost, harmonic saturation, compression</li>
                      <li><strong className="text-white">Guitar presets:</strong> Clarity EQ, warmth, brightness</li>
                      <li><strong className="text-white">Piano presets:</strong> Natural hall, room ambience, brightness</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <h4 className="text-lg font-bold text-white mb-3">That's It!</h4>
                <p className="text-gray-300 mb-4 leading-relaxed">
                  You now have high-quality isolated stems from any YouTube video. Import them into FL Studio, Ableton, Logic, Pro Tools, or any DAW and start creating.
                </p>
                <Link
                  to="/youtube"
                  className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-400 to-purple-500 text-white rounded-xl font-bold shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transition-all"
                >
                  <Zap size={20} />
                  Try It Now
                </Link>
              </div>
            </section>

            {/* Section 6: Best Practices */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">Best Practices for Stem Splitting</h2>

              <p className="text-gray-300 mb-6 leading-relaxed">
                Want the cleanest possible stems? Follow these tips:
              </p>

              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Use High-Quality Source Material
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    The better the input, the better the output. Look for YouTube videos with "HQ," "HD Audio," or "Official Audio" in the title. Avoid low-bitrate uploads, live recordings with crowd noise, or heavily compressed audio.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Choose the Right Number of Stems
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    More stems = better separation, but longer processing time. If you only need vocals and instrumental, 4 stems is plenty. For detailed work (like isolating piano or guitar), go with 6 stems.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Export to WAV for Lossless Quality
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Always choose WAV format if you're doing serious production work. MP3 is fine for quick previews or if you're tight on disk space, but WAV preserves every detail of the separation.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Listen Before Downloading Everything
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Use the preview player in the modal to check each stem before downloading. Sometimes a stem might have artifacts or bleed from other instruments—better to know upfront.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Experiment with FX Presets
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Don't skip the FX processing step. A little compression on vocals or punch on drums can make a huge difference. Try different presets and compare—it only takes a few seconds.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7: Use Cases */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-6 tracking-tight">Real-World Use Cases</h2>

              <p className="text-gray-300 mb-6 leading-relaxed">
                Here are some creative ways people are using DeepSplit to extract stems from YouTube:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
                  <h3 className="text-lg font-bold text-white mb-3">Create Remixes & Bootlegs</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    Extract vocals from a popular track, then build your own instrumental around them. Perfect for making bootleg remixes or unofficial edits.
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Example: Take Drake vocals, add UK garage drums, create a viral bootleg.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                  <h3 className="text-lg font-bold text-white mb-3">Study Music Production</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    Isolate drums, bass, or vocals from your favorite tracks to learn mixing, arrangement, and sound design techniques.
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Example: Study Metro Boomin's drum processing by isolating his kicks and 808s.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20">
                  <h3 className="text-lg font-bold text-white mb-3">Create Karaoke Tracks</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    Remove vocals from any song to create instant karaoke instrumentals. Perfect for practice or performances.
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Example: Extract instrumentals from Whitney Houston songs for karaoke night.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20">
                  <h3 className="text-lg font-bold text-white mb-3">Build Sample Packs</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    Extract drums, one-shots, or loops from classic tracks to build your own custom sample library.
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Example: Sample iconic drum breaks from 70s funk records.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20">
                  <h3 className="text-lg font-bold text-white mb-3">Create Mashups</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    Combine vocals from one song with instrumentals from another. Great for DJ sets or creative edits.
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Example: Mashup Billie Eilish vocals with Skrillex bass.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20">
                  <h3 className="text-lg font-bold text-white mb-3">Practice Instruments</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    Remove specific instruments (like guitar or bass) to practice playing along with the track.
                  </p>
                  <p className="text-xs text-gray-500 italic">
                    Example: Remove bass from Red Hot Chili Peppers tracks to practice Flea's lines.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 8: FAQ */}
            <section className="mb-16">
              <h2 className="text-3xl font-black text-white mb-8 tracking-tight">Frequently Asked Questions</h2>

              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">Is it legal to split stems from YouTube?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Technically, you're downloading copyrighted content. Whether it's "legal" depends on what you do with it. Personal use (learning, practice, remixing for fun) is generally fine under fair use. Commercial use (selling remixes, sync licensing) requires permission from copyright holders. Use common sense and respect artists' rights.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">How long does stem splitting take?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Depends on the length of the song and number of stems. A typical 3-minute song with 6 stems takes about 2-4 minutes on GPU hardware. 4-stem separation is faster (1-2 minutes). Processing time scales with song length.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">Can I split stems from private or unlisted videos?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    No, our system can only process publicly accessible YouTube videos. If you have a private video, download it first and use our file upload feature instead.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">Will the stems be perfect?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    AI stem separation is incredibly good, but not perfect. You might hear some "bleed" (artifacts from other instruments) or reverb tails that didn't fully separate. Complex mixes with lots of overlapping frequencies are harder to separate cleanly. That said, DeepSplit's hybrid pipeline produces some of the cleanest stems available—often better than expensive paid tools.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">Do you store my files?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    No. All files are automatically deleted after 24 hours. We use secure temporary storage during processing, then permanently delete everything. Your privacy is respected—we don't keep copies, train models on your data, or share anything with third parties.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">Can I process playlists?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Yes! Paste a playlist URL and we'll process each video sequentially. Great for batch processing an entire album or EP.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-3">Why is DeepSplit free?</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Because we're not gatekeeping. Stem separation should be accessible to everyone—not just people who can afford expensive subscriptions. We built this tool to give producers, musicians, and creators access to professional-grade audio processing without the barriers. Free game, no catches.
                  </p>
                </div>
              </div>
            </section>

            {/* Final CTA */}
            <section className="mb-16">
              <div className="p-10 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-white/20 text-center">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
                  Ready to Start Splitting Stems?
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Extract vocals, drums, bass, and more from any YouTube video in minutes. Free, unlimited, studio-quality.
                </p>
                <Link
                  to="/youtube"
                  className="inline-flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-cyan-400 to-purple-500 text-white rounded-2xl font-black text-xl shadow-[0_0_50px_rgba(34,211,238,0.4)] hover:shadow-[0_0_80px_rgba(34,211,238,0.6)] transition-all"
                >
                  <Youtube size={28} />
                  Split Stems from YouTube
                  <ArrowRight size={24} />
                </Link>
              </div>
            </section>

          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogStemSplitting;
