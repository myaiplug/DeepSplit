import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Download, Music, Shield, Zap, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StemsModal from '../components/StemsModal';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const HAS_CONFIGURED_BACKEND = Boolean(API_BASE);

const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

const formatStatus = (status, progressValue) => {
  const progressLabel = Number.isFinite(progressValue) ? ` (${Math.round(progressValue)}%)` : '';
  switch (status) {
    case 'initializing':
      return `Initializing pipeline${progressLabel}`;
    case 'downloading':
      return `Downloading audio from YouTube${progressLabel}`;
    case 'separating':
      return `Separating stems with Demucs/MDX${progressLabel}`;
    case 'packaging':
      return `Packaging stems${progressLabel}`;
    case 'done':
    case 'completed':
      return 'Stems ready to play';
    case 'failed':
      return 'Split failed';
    default:
      return status ? `${status}${progressLabel}` : 'Processing…';
  }
};

const YoutubeSplitter = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [step, setStep] = useState('input'); // input, processing, results, failed
  const [fileId, setFileId] = useState(null);
  const [error, setError] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [zipUrl, setZipUrl] = useState(null);
  const [showStemsModal, setShowStemsModal] = useState(false);
  const [numStems, setNumStems] = useState(6);
  const [outputFormat, setOutputFormat] = useState('wav');

  const refreshFiles = (files = [], openModal = false) => {
    setProcessedFiles(files);
    const archive = files.find((f) => (f.filename || '').toLowerCase().endsWith('.zip'));
    setZipUrl(archive?.url || null);
    if (openModal) setShowStemsModal(true);
  };

  const resetFlow = () => {
    setStep('input');
    setUrl('');
    setProcessedFiles([]);
    setZipUrl(null);
    setError(null);
    setFileId(null);
    setProgress(0);
    setStatusText('');
    setShowStemsModal(false);
    setIsProcessing(false);
  };

  const handleSplit = async () => {
    if (!url.trim()) return;

    if (!HAS_CONFIGURED_BACKEND) {
      setStep('failed');
      setError('This web deployment has no YouTube backend configured. Use the desktop app, or set VITE_API_BASE_URL for self-hosted API use.');
      setProgress(0);
      setStatusText('');
      setShowStemsModal(false);
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setError(null);
    setProgress(3);
    setStatusText('Queueing split job...');
    setZipUrl(null);
    setShowStemsModal(true);

    try {
      const startRes = await fetch(apiUrl('/process_youtube/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          format: outputFormat,
          num_stems: numStems,
        }),
      });

      if (!startRes.ok) {
        const detail = await startRes.json().catch(() => ({}));
        throw new Error(detail.detail || `Could not start split (${startRes.status}).`);
      }

      const startData = await startRes.json();
      const nextFileId = startData.file_id;
      if (!nextFileId) {
        throw new Error('Server did not return a file id.');
      }

      setFileId(nextFileId);

      let finished = false;
      for (let attempt = 0; attempt < 600; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const progressRes = await fetch(apiUrl(`/progress/${nextFileId}`));
        if (!progressRes.ok) continue;

        const progressData = await progressRes.json();
        const pct = Number(progressData.progress);
        const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : progress;
        setProgress(safePct);
        setStatusText(formatStatus(progressData.status, safePct));

        if (progressData.error) {
          throw new Error(progressData.error);
        }

        if (progressData.status === 'failed') {
          throw new Error('YouTube split failed on the server.');
        }

        if (progressData.status === 'done' || progressData.status === 'completed' || safePct >= 100) {
          finished = true;
          break;
        }
      }

      if (!finished) {
        throw new Error('Split timed out while waiting for completion.');
      }

      const filesRes = await fetch(apiUrl(`/files/${nextFileId}`));
      if (!filesRes.ok) {
        throw new Error('Failed to fetch processed stems.');
      }

      const filesData = await filesRes.json();
      refreshFiles(filesData.files || [], true);
      setStep('results');
      setProgress(100);
      setStatusText('Stems ready to play');
    } catch (err) {
      setStep('failed');
      setError(err.message || 'YouTube split failed.');
      setProgress(0);
      setStatusText('We could not split that link. Check the URL and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#f3f4f6] selection:bg-cyan-500/30 font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] -z-10" />

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Youtube size={14} /> YouTube to Stems (v2 Beta)
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white">
              Instant YouTube<br />
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent italic">Stem Separation.</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
              Paste a video URL. We&apos;ll download, separate 4–6 stems, and show waveforms with individual and zip downloads.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-1 px-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/5 shadow-2xl backdrop-blur-xl mb-12"
          >
            <div className="bg-[#0a0f1d]/80 rounded-[2.4rem] p-8 md:p-12">
              <AnimatePresence mode="wait">
                {(step === 'input' || step === 'failed') && (
                  <motion.div
                    key="input-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
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
                        <p className="text-xs text-gray-500 mt-2">Choose the format for exported stems.</p>
                      </div>
                      <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-2">Stem Mode</p>
                        <select
                          value={numStems}
                          onChange={(e) => setNumStems(parseInt(e.target.value, 10))}
                          className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-medium focus:outline-none focus:border-purple-400/50 transition-all"
                        >
                          <option value="4">4-Stem: Vocals · Drums · Bass · Other</option>
                          <option value="5">5-Stem: Vocals · Drums · Bass · Guitar · Other</option>
                          <option value="6">6-Stem: Vocals · Drums · Bass · Guitar · Piano · Other</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Demucs + MDX chain tuned for YouTube audio.</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSplit}
                      disabled={!url || isProcessing}
                      className="w-full py-6 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] rounded-2xl font-black text-xl shadow-[0_0_50px_rgba(34,211,238,0.3)] hover:shadow-[0_0_80px_rgba(34,211,238,0.5)] hover:scale-[1.02] transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none"
                    >
                      <Zap size={24} />
                      Split to High-Res Stems
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

                    {!HAS_CONFIGURED_BACKEND && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-300 text-xs font-semibold">
                        Web YouTube processing is disabled here because VITE_API_BASE_URL is not set.
                        Use the desktop app download options below.
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 'results' && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6 py-12 flex flex-col items-center text-center"
                  >
                    <div className="relative w-24 h-24 mb-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center"
                      >
                        <Music className="text-white" size={40} />
                      </motion.div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-3xl font-black uppercase text-white tracking-tight">Separation Complete!</h3>
                      <p className="text-gray-400 font-medium">
                        {processedFiles.filter((f) => !f.filename.toLowerCase().endsWith('.zip')).length} high-quality stems ready
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-md">
                      <button
                        onClick={() => setShowStemsModal(true)}
                        className="flex-1 py-4 px-6 bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 text-white rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transition-all duration-300 flex items-center justify-center gap-3"
                      >
                        <Music size={24} />
                        View & Play Stems
                      </button>
                      <button
                        onClick={resetFlow}
                        className="py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-colors"
                      >
                        Process Another
                      </button>
                    </div>

                    {zipUrl && (
                      <a
                        href={zipUrl}
                        download
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] font-black text-sm shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all"
                      >
                        Download All (.zip)
                      </a>
                    )}
                  </motion.div>
                )}

                {step === 'processing' && (
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
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full"
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-4 border-4 border-purple-500/20 border-t-purple-500 rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <Zap size={32} className="animate-pulse text-cyan-400" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">{statusText || 'Processing...'}</h3>
                      <p className="text-gray-500 font-medium">Total Pipeline Progress: {Math.round(progress)}%</p>
                    </div>

                    <div className="w-full max-w-md h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield size={20} />, title: 'Privacy First', desc: 'Process everything on your own backend and stream only the resulting stems.' },
              { icon: <Zap size={20} />, title: 'Lossless Audio', desc: 'Separate source audio without unnecessary re-compression.' },
              { icon: <Globe size={20} />, title: 'Playlist Support', desc: 'Use YouTube links directly from your browser.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center">
                <div className="text-cyan-400 mb-4">{f.icon}</div>
                <h4 className="font-black uppercase italic tracking-tight text-white mb-2 text-sm">{f.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div id="download" className="mt-16 p-12 rounded-3xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-white/10">
            <div className="text-center max-w-3xl mx-auto space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Download DeepSplit</h2>
                <p className="text-gray-400 text-lg">Free, unlimited, offline stem separation for your desktop.</p>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <StemsModal
        isOpen={showStemsModal}
        onClose={() => setShowStemsModal(false)}
        files={processedFiles}
        loading={isProcessing}
        statusText={statusText || 'Splitting stems...'}
        error={step === 'failed' ? error : null}
        zipUrl={zipUrl}
        title="YouTube Stems"
      />
    </div>
  );
};

export default YoutubeSplitter;
