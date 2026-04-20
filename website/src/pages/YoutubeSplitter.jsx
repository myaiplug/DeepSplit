import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Download, Shield, Zap, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const YoutubeSplitter = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('input'); // input, preview, failed
  const [error, setError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [numStems, setNumStems] = useState(4);
  const [outputFormat, setOutputFormat] = useState('wav');

  // Extract YouTube video ID from URL
  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/,
      /youtube\.com\/embed\/([^&?/]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  const handlePreview = async () => {
    if (!url) return;

    setIsProcessing(true);
    setError(null);
    setVideoInfo(null);

    try {
      const videoId = extractVideoId(url);

      if (!videoId) {
        throw new Error('Invalid YouTube URL. Please paste a valid YouTube video link.');
      }

      // Fetch video metadata from noembed (free, no API key required)
      const noembed = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await noembed.json();

      if (data.error) {
        throw new Error('Could not fetch video information. Please check the URL.');
      }

      setVideoInfo({
        id: videoId,
        title: data.title || 'Unknown Title',
        author: data.author_name || 'Unknown Channel',
        thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      });

      setStep('preview');
    } catch (err) {
      setError(err.message || 'Failed to load video information.');
      setStep('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#f3f4f6] selection:bg-cyan-500/30 font-sans">
      <Navbar />
      
      <main className="pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Abstract Background Glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] -z-10" />

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Youtube size={14} /> YouTube to Stems (v2 Beta)
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white">
              Instant YouTube<br/>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent italic">Stem Separation.</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
              Paste a video or playlist URL. We'll handle the download, conversion, and surgical stem splitting with zero quality loss.
            </p>
          </motion.div>

          {/* Main Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-1 px-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/5 shadow-2xl backdrop-blur-xl mb-12"
          >
            <div className="bg-[#0a0f1d]/80 rounded-[2.4rem] p-8 md:p-12">
              <AnimatePresence mode="wait">
                {step === 'input' || step === 'failed' ? (
                  <motion.div 
                    key="input-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {/* URL Input */}
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Paste YouTube URL (Video or Playlist)..."
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl px-6 py-5 text-lg font-medium focus:outline-none focus:border-cyan-400/50 transition-all text-white placeholder-gray-600"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-cyan-400 transition-colors">
                          <Youtube size={24} />
                        </div>
                      </div>
                  </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-2">Output Format</p>
                        <select
                          value={outputFormat}
                          onChange={(e) => setOutputFormat(e.target.value)}
                          className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-medium focus:outline-none focus:border-cyan-400/50 transition-all"
                        >
                          <option value="wav">WAV (Lossless)</option>
                          <option value="mp3">MP3 (Compressed)</option>
                          <option value="flac">FLAC (Lossless)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">We normalize and keep it 44.1kHz stereo for clean downstream mastering.</p>
                      </div>
                      <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-2">Stem Mode</p>
                        <select
                          value={numStems}
                          onChange={(e) => setNumStems(parseInt(e.target.value))}
                          className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-medium focus:outline-none focus:border-purple-400/50 transition-all"
                        >
                          <option value="4">4-Stem: Vocals · Drums · Bass · Other</option>
                          <option value="5">5-Stem: + Guitar</option>
                          <option value="6">6-Stem: + Piano (Best Quality)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Demucs + MDX chain tuned for YouTube audio. Zero setup, pure split.</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handlePreview}
                      disabled={!url || isProcessing}
                      className="w-full py-6 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] rounded-2xl font-black text-xl shadow-[0_0_50px_rgba(34,211,238,0.3)] hover:shadow-[0_0_80px_rgba(34,211,238,0.5)] hover:scale-[1.02] transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none"
                    >
                      <Zap size={24} />
                      {isProcessing ? 'Loading...' : 'Preview & Get DeepSplit'}
                    </button>
                    
                    {step === 'failed' && error && (
                       <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold"
                       >
                          Error: {error}
                       </motion.div>
                    )}
                    {step === 'failed' && (
                       <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold"
                       >
                          Error: {error}
                       </motion.div>
                    )}
                  </motion.div>
                ) : step === 'preview' ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    {/* Video Preview */}
                    {videoInfo && (
                      <div className="space-y-6">
                        <div className="relative rounded-2xl overflow-hidden border border-white/10">
                          <img
                            src={videoInfo.thumbnail}
                            alt={videoInfo.title}
                            className="w-full aspect-video object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <h3 className="text-2xl font-black text-white mb-2 line-clamp-2">
                              {videoInfo.title}
                            </h3>
                            <p className="text-gray-300 font-medium">
                              {videoInfo.author}
                            </p>
                          </div>
                        </div>

                        {/* Download Call to Action */}
                        <div className="p-8 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-400/20">
                          <div className="text-center space-y-4">
                            <h3 className="text-3xl font-black text-white">
                              Ready to Split This into {numStems} Stems?
                            </h3>
                            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                              Download <span className="text-cyan-400 font-bold">DeepSplit</span> — the FREE desktop app for Windows & Mac.
                              Process unlimited videos offline with studio-grade quality.
                            </p>

                            {/* Features Grid */}
                            <div className="grid md:grid-cols-3 gap-4 py-6">
                              {[
                                { icon: '🎵', title: 'Unlimited Splits', desc: 'Process as many videos as you want, completely free' },
                                { icon: '⚡', title: 'GPU Accelerated', desc: 'Lightning fast with your graphics card' },
                                { icon: '🔒', title: '100% Offline', desc: 'Your audio never leaves your computer' }
                              ].map((feat, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                  <div className="text-3xl mb-2">{feat.icon}</div>
                                  <h4 className="font-bold text-white text-sm mb-1">{feat.title}</h4>
                                  <p className="text-xs text-gray-400">{feat.desc}</p>
                                </div>
                              ))}
                            </div>

                            {/* Download Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                              <a
                                href="#download"
                                className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] rounded-2xl font-black text-lg shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:shadow-[0_0_60px_rgba(34,211,238,0.6)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                              >
                                <Download size={24} />
                                Download for Windows
                              </a>
                              <a
                                href="#download"
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 border border-white/20"
                              >
                                <Download size={24} />
                                Download for Mac
                              </a>
                            </div>

                            <p className="text-sm text-gray-500 pt-2">
                              Free forever. No account required. Works on Windows 10+ and macOS 11+
                            </p>
                          </div>
                        </div>

                        {/* Selected Settings Preview */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Your Settings</p>
                            <p className="text-white font-medium">Output: {outputFormat.toUpperCase()}</p>
                            <p className="text-white font-medium">Stems: {numStems}-stem mode</p>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">What You'll Get</p>
                            <p className="text-gray-300 text-sm">
                              {numStems === 4 && 'Vocals, Drums, Bass, Other'}
                              {numStems === 5 && 'Vocals, Drums, Bass, Guitar, Other'}
                              {numStems === 6 && 'Vocals, Drums, Bass, Guitar, Piano, Other'}
                            </p>
                          </div>
                        </div>

                        {/* Back Button */}
                        <button
                          onClick={() => {
                            setStep('input');
                            setVideoInfo(null);
                            setError(null);
                          }}
                          className="w-full py-3 text-gray-400 hover:text-white font-medium transition-colors"
                        >
                          ← Try Another Video
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="py-12 flex flex-col items-center text-center space-y-8"
                  >
                    <div className="relative w-32 h-32">
                       <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full"
                       />
                       <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 border-4 border-purple-500/20 border-t-purple-500 rounded-full"
                       />
                       <div className="absolute inset-0 flex items-center justify-center text-white">
                          <Zap size={32} className="animate-pulse text-cyan-400" />
                       </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
                        Loading Video Info...
                      </h3>
                      <p className="text-gray-500 font-medium">
                        Please wait...
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield size={20} />, title: 'Privacy First', desc: 'Process everything locally on your computer. Your audio never leaves your machine.' },
              { icon: <Zap size={20} />, title: 'Lossless Audio', desc: 'Direct separation from source without unnecessary re-compression.' },
              { icon: <Globe size={20} />, title: 'Playlist Support', desc: 'Separate entire albums or channels with one click in the desktop app.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center">
                <div className="text-cyan-400 mb-4">{f.icon}</div>
                <h4 className="font-black uppercase italic tracking-tight text-white mb-2 text-sm">{f.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Download Section */}
          <div id="download" className="mt-16 p-12 rounded-3xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-white/10">
            <div className="text-center max-w-3xl mx-auto space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                  Download DeepSplit
                </h2>
                <p className="text-gray-400 text-lg">
                  Free, unlimited, offline stem separation for your desktop.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-all">
                  <h3 className="text-2xl font-black text-white mb-3">Windows</h3>
                  <p className="text-gray-400 text-sm mb-6">Windows 10 or later</p>
                  <a
                    href="https://github.com/myaiplug/DeepSplit/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] rounded-xl font-black hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all"
                  >
                    <Download size={20} />
                    Download .exe
                  </a>
                  <p className="text-xs text-gray-500 mt-4">
                    Installer size: ~200 MB<br />
                    Includes Python runtime & AI models
                  </p>
                </div>

                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all">
                  <h3 className="text-2xl font-black text-white mb-3">macOS</h3>
                  <p className="text-gray-400 text-sm mb-6">macOS 11 (Big Sur) or later</p>
                  <a
                    href="https://github.com/myaiplug/DeepSplit/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold border border-white/20 transition-all"
                  >
                    <Download size={20} />
                    Download .dmg
                  </a>
                  <p className="text-xs text-gray-500 mt-4">
                    Universal binary (Intel & Apple Silicon)<br />
                    Optimized for M1/M2/M3 chips
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-sm text-gray-500 mb-4">
                  Looking for the technical setup?{' '}
                  <a href="https://github.com/myaiplug/DeepSplit" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                    View on GitHub
                  </a>
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-600">
                  <span>✓ Open Source (MIT License)</span>
                  <span>✓ No Telemetry</span>
                  <span>✓ GPU Accelerated</span>
                  <span>✓ Batch Processing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default YoutubeSplitter;
