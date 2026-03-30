import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Download, Music, Share2, Shield, Zap, Globe, FileAudio, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const YoutubeSplitter = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('wav');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [step, setStep] = useState('input'); // input, processing, results, failed
  const [fileId, setFileId] = useState(null);
  const [error, setError] = useState(null);
  const [processedFiles, setProcessedFiles] = useState([]);

  const startPolling = (id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/progress/${id}`);
        const data = await res.json();
        
        setProgress(data.progress);
        
        if (data.status === 'downloading') {
          setStatusText('Downloading from YouTube...');
        } else if (data.status === 'separating') {
          setStatusText('Surgical Stem Splitting (MDX-Net)...');
        } else if (data.status === 'packaging') {
          setStatusText('Packaging stems for download...');
        } else if (data.status === 'done') {
          clearInterval(interval);
          setIsProcessing(false);
          // Fetch the list of files
          try {
             const filesRes = await fetch(`http://localhost:8000/files/${id}`);
             const filesData = await filesRes.json();
             setProcessedFiles(filesData.files || []);
             setStep('results');
          } catch (e) {
             setStep('failed');
             setError('Failed to fetch processed files.');
          }
        } else if (data.status === 'failed') {
          setStep('failed');
          setError(data.error || 'Separation failed.');
          setIsProcessing(false);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const FileRow = ({ file, fileId }) => {
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
                  setProcessedFiles(filesData.files || []);
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
    setProgress(0);
    setStatusText('Initializing Pipeline...');

    try {
      const res = await fetch('http://localhost:8000/process_youtube/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format, num_stems: 6 })
      });
      
      if (!res.ok) throw new Error('Failed to start processing');
      
      const data = await res.json();
      setFileId(data.file_id);
      startPolling(data.file_id);
    } catch (err) {
      setStep('failed');
      setError(err.message);
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

                    {/* Format Selector */}
                    <div className="grid grid-cols-3 gap-4">
                      {['wav', 'mp3', 'flac'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setFormat(f)}
                          className={`py-4 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all duration-300 ${format === f ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-white/5' : 'bg-transparent border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-400'}`}
                        >
                          {f}
                        </button>
                      ))}
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
                    className="space-y-6"
                  >
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-3">
                           <Music className="text-cyan-400" />
                           Your Stems Are Ready
                        </h3>
                        <button 
                           onClick={() => { setStep('input'); setUrl(''); setProcessedFiles([]); setFormat('wav'); }}
                           className="text-sm font-bold text-gray-400 hover:text-white transition-colors"
                        >
                           Process Another
                        </button>
                     </div>
                     
                     <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {processedFiles.map((file, i) => (
                           <FileRow key={i} file={file} fileId={fileId} />
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
    </div>
  );
};

export default YoutubeSplitter;
