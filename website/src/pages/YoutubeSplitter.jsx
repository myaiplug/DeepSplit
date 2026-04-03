import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Download, Music, Shield, Zap, Globe, FileAudio } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StemsModal from '../components/StemsModal';

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

  const refreshFiles = useCallback((files = [], openModal = false) => {
    setProcessedFiles(files);
    const archive = files.find((f) => (f.filename || '').toLowerCase().endsWith('.zip'));
    setZipUrl(archive?.url || null);
    if (openModal) {
      setShowStemsModal(true);
    }
  }, []);

  const FileRow = ({ file, fileId, onRefresh }) => {
    const [presets, setPresets] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState('');
    const [isApplying, setIsApplying] = useState(false);
    const [progress, setProgress] = useState(0);
    const isArchive = file.filename?.toLowerCase().endsWith('.zip');

    const getStemName = (fname) => {
       const lower = fname.toLowerCase();
       if (lower.includes('vocal')) return 'vocal';
       if (lower.includes('drum')) return 'drum';
       if (lower.includes('bass')) return 'bass';
       if (lower.includes('guitar')) return 'guitar';
       if (lower.includes('piano')) return 'piano';
       return 'other';
    };

    useEffect(() => {
       if (isArchive) return;
       fetch(`http://localhost:8000/presets/${getStemName(file.filename)}`)
         .then(res => res.json())
         .then(data => setPresets(data))
         .catch(err => console.error(err));
    }, [file.filename, isArchive]);

    const applyFx = async () => {
      if (!selectedPreset) return;
      setIsApplying(true);
      try {
         const res = await fetch('http://localhost:8000/process_fx/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_id: fileId, filename: file.filename, preset_id: selectedPreset })
         });
         const data = await res.json();
         const taskKey = data.task_key;
         
         const poll = setInterval(async () => {
            const pRes = await fetch(`http://localhost:8000/fx_progress/${taskKey}`);
            const pData = await pRes.json();
            setProgress(pData.progress);
            if (pData.progress >= 100 || pData.progress < 0) {
               clearInterval(poll);
               setIsApplying(false);
               if (pData.progress >= 100) {
                  // Refresh the whole files list
                  const filesRes = await fetch(`http://localhost:8000/files/${fileId}`);
                  const filesData = await filesRes.json();
                  onRefresh?.(filesData.files || []);
               }
            }
         }, 1000);
      } catch (e) {
         console.error(e);
         setIsApplying(false);
      }
    };

    return (
      <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl mb-3 gap-4">
         <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
            <FileAudio size={20} className="text-cyan-400 shrink-0" />
            <span className="text-gray-300 font-medium truncate" title={file.filename}>
              {isArchive ? 'All Stems (.zip)' : file.filename}
            </span>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            {presets.length > 0 && !file.filename.includes('_fx') && !isArchive && (
               <div className="flex items-center gap-2">
                  <select 
                     className="bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none focus:border-cyan-400/50"
                     value={selectedPreset}
                     onChange={e => setSelectedPreset(e.target.value)}
                     disabled={isApplying}
                  >
                     <option value="">Select FX Preset</option>
                     {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button 
                     onClick={applyFx}
                     disabled={!selectedPreset || isApplying}
                     className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
                  >
                     {isApplying ? `${Math.round(progress)}%` : 'Apply'}
                  </button>
               </div>
            )}
            <a 
               href={file.url} 
               download
               className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors shrink-0"
            >
               <Download size={20} />
            </a>
         </div>
      </div>
    );
  };

  const handleSplit = async () => {
    if (!url) return;
    setIsProcessing(true);
    setStep('processing');
    setError(null);
    setProgress(8);
    setStatusText('Splitting stems with Demucs + MDX...');
    setStemGroups([]);
    setZipUrl(null);
    setShowStemsModal(true);

    try {
      const res = await fetch('http://localhost:8000/api/youtube-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || 'Failed to split stems.');
      }
      
      const data = await res.json();
      setFileId(data.file_id);
      setProgress(92);
      try {
        const filesRes = await fetch(`http://localhost:8000/files/${data.file_id}`);
        const filesData = await filesRes.json();
        refreshFiles(filesData.files || [], true);
        setStep('results');
        setProgress(100);
        setStatusText('Stems ready to play');
      } catch (e) {
        setStep('failed');
        setError('Failed to fetch processed files.');
      }
    } catch (err) {
      setStep('failed');
      setError(err.message || 'YouTube split failed.');
      setIsProcessing(false);
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
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1">Output Format</p>
                        <p className="text-white font-bold text-lg">WAV (Lossless)</p>
                        <p className="text-xs text-gray-500">We normalize and keep it 44.1kHz stereo for clean downstream mastering.</p>
                      </div>
                      <div className="p-4 rounded-2xl border border-white/10 bg-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-1">Stem Mode</p>
                        <p className="text-white font-bold text-lg">4-Stem: Vocals · Drums · Bass · Other</p>
                        <p className="text-xs text-gray-500">Demucs + MDX chain tuned for YouTube audio. Zero setup, pure split.</p>
                      </div>
                    </div>

                    {/* Action Button */}
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
                ) : step === 'results' ? (
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
                          transition={{ type: "spring", delay: 0.2 }}
                          className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center"
                        >
                          <Music className="text-white" size={40} />
                        </motion.div>
                     </div>

                     <div className="space-y-3">
                        <h3 className="text-3xl font-black uppercase text-white tracking-tight">
                           Separation Complete!
                        </h3>
                        <button 
                           onClick={() => { 
                             setStep('input'); 
                             setUrl(''); 
                             setProcessedFiles([]); 
                             setZipUrl(null); 
                             setError(null);
                             setFileId(null);
                             setProgress(0);
                             setStatusText('');
                             setShowStemsModal(false);
                           }}
                           className="text-sm font-bold text-gray-400 hover:text-white transition-colors"
                        >
                           ← Process Another
                        </button>
                        <p className="text-gray-400 font-medium">
                           {processedFiles.filter(f => !f.filename.toLowerCase().endsWith('.zip')).length} high-quality stems ready
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
                           onClick={() => { 
                             setStep('input'); 
                             setUrl(''); 
                             setProcessedFiles([]); 
                             setZipUrl(null);
                             setError(null);
                             setShowStemsModal(false); 
                             setProgress(0);
                             setStatusText('');
                           }}
                           className="py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-colors"
                        >
                           Process Another
                        </button>
                     </div>
                     <div className="flex flex-wrap items-center gap-3">
                        {zipUrl && (
                          <a
                            href={zipUrl}
                            download
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] font-black text-sm shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] transition-all"
                          >
                            Download All (.zip)
                          </a>
                        )}
                     </div>
                     <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {processedFiles.map((file, i) => (
                           <FileRow key={i} file={file} fileId={fileId} onRefresh={refreshFiles} />
                        ))}
                     </div>
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
                        {statusText}
                      </h3>
                      <p className="text-gray-500 font-medium">
                        Total Pipeline Progress: {progress}%
                      </p>
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

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield size={20} />, title: 'Privacy First', desc: 'Secure encryption during processing. Files deleted after download.' },
              { icon: <Zap size={20} />, title: 'Lossless Audio', desc: 'Direct separation from source without unnecessary re-compression.' },
              { icon: <Globe size={20} />, title: 'Playlist Support', desc: 'Separate entire albums or channels with one click.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center">
                <div className="text-cyan-400 mb-4">{f.icon}</div>
                <h4 className="font-black uppercase italic tracking-tight text-white mb-2 text-sm">{f.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />

      {/* Stems Modal */}
      <StemsModal
        isOpen={showStemsModal}
        onClose={() => setShowStemsModal(false)}
        files={processedFiles}
        loading={isProcessing}
        statusText={statusText || 'Splitting stems…'}
        error={step === 'failed' ? error : null}
        zipUrl={zipUrl}
        title="YouTube Stems (Beta)"
      />
    </div>
  );
};

export default YoutubeSplitter;
