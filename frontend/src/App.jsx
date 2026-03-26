import { useState, useEffect } from 'react'
import Upload from './components/Upload'
import StemPlayer from './components/StemPlayer'
import WaveformSelector from './components/WaveformSelector'
import StemModeSelector from './components/StemModeSelector'
import { motion, AnimatePresence } from 'framer-motion'
import FXSelector from './components/FXSelector'
import StudioView from './components/Studio/StudioView'
import Background from './components/Background'
import TitleBar from './components/TitleBar'

const STEM_POLL_MAP = {
    2: ['vocals', 'instrumental'],
    4: ['vocals', 'drums', 'bass', 'other'],
    5: ['vocals', 'drums', 'bass', 'guitar', 'other'],
    6: ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'],
    7: ['vocals', 'kick', 'snare', 'hihat', 'overhead', 'room', 'bass', 'guitar', 'piano', 'other'],
};

const STEM_COLORS = {
    vocals: '#ec4899', instrumental: '#6366f1',
    drums: '#eab308', kick: '#ef4444', snare: '#f97316',
    hihat: '#34d399', overhead: '#fbbf24', room: '#b45309',
    bass: '#3b82f6', guitar: '#f97316', piano: '#10b981', other: '#a855f7',
};

function DeviceBadge({ info, loading }) {
    if (loading) return (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            Detecting...
        </div>
    );
    if (!info) return null;
    const isGpu = info.device === 'cuda';
    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border
                ${isGpu
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-gray-500/10 border-gray-600/30 text-gray-400'}`}
        >
            <div className={`w-1.5 h-1.5 rounded-full ${isGpu ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-500'}`} />
            {isGpu ? `GPU · ${info.gpu_name} · ${info.vram_gb}GB` : 'CPU mode'}
        </motion.div>
    );
}

function App() {
    // step: upload → mode → select → processing → results
    const [step, setStep] = useState('upload');
    const [fileData, setFileData] = useState(null);
    const [stems, setStems] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [studioMode, setStudioMode] = useState(false);
    const [stemMode, setStemMode] = useState(6);          // default 6-stem
    const [deviceInfo, setDeviceInfo] = useState(null);
    const [deviceLoading, setDeviceLoading] = useState(true);

    // FX State
    const [fxModalOpen, setFxModalOpen] = useState(false);
    const [activeFxStem, setActiveFxStem] = useState(null);
    const [fxProgress, setFxProgress] = useState(0);
    const [processingFx, setProcessingFx] = useState(false);

    // Solo / Mute state
    const [soloedStem, setSoloedStem] = useState(null);   // stem name string or null
    const [mutedStems, setMutedStems] = useState(new Set());

    // Fetch device info on mount
    useEffect(() => {
        fetch('http://localhost:8000/system/info', { signal: AbortSignal.timeout(5000) })
            .then(r => r.json())
            .then(data => { setDeviceInfo(data); setDeviceLoading(false); })
            .catch(() => {
                setDeviceInfo({ device: 'cpu', gpu_name: null, vram_gb: null, ffmpeg_available: false });
                setDeviceLoading(false);
            });
    }, []);

    // Polling Effect
    useEffect(() => {
        let intervalId;
        let dotIntervalId;

        if (step === 'processing' && fileData?.file_id) {
            setStatusMessage('Initializing separation engine...');

            let dots = 0;
            dotIntervalId = setInterval(() => {
                dots = (dots + 1) % 4;
                setStatusMessage(`Separating stems${'.'.repeat(dots)} `);
            }, 1000);

            const expectedSuffixes = STEM_POLL_MAP[stemMode] || STEM_POLL_MAP[6];
            const fileId = fileData.file_id;
            const nameWithoutExt = fileData.filename.replace(/\.[^/.]+$/, '');
            const safeFilename = nameWithoutExt.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();

            const checkFile = async () => {
                try {
                    // Poll for the first expected stem to know separation is done
                    const vocalRes = await fetch(
                        `http://localhost:8000/processed/${fileId}/${safeFilename}_${expectedSuffixes[0]}.mp3`,
                        { method: 'HEAD' }
                    );
                    if (!vocalRes.ok) return;

                    // Build stems list from whatever files are available
                    const newStems = [];
                    for (const suffix of expectedSuffixes) {
                        const url = `http://localhost:8000/processed/${fileId}/${safeFilename}_${suffix}.mp3`;
                        const r = await fetch(url, { method: 'HEAD' });
                        if (r.ok) {
                            newStems.push({
                                name: suffix.charAt(0).toUpperCase() + suffix.slice(1),
                                src: url,
                                color: STEM_COLORS[suffix] || '#6b7280',
                            });
                        }
                    }

                    if (newStems.length > 0) {
                        setStems(newStems);
                        setStep('results');
                    }
                } catch (e) {
                    console.error('Polling error:', e);
                }
            };

            intervalId = setInterval(checkFile, 3000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (dotIntervalId) clearInterval(dotIntervalId);
        };
    }, [step, fileData, stemMode]);

    const handleUploadSuccess = (data) => {
        // data includes file_id, filename, url, size_bytes, and display_name (from rename input)
        setFileData(data);
        setStep('mode');
    };

    const handleModeConfirmed = () => {
        setStep('select'); // then waveform selection
    };

    const handleSelectionConfirmed = async (times) => {
        setStep('processing');
        try {
            await fetch('http://localhost:8000/process/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: fileData.file_id,
                    filename: fileData.filename,
                    display_name: fileData.display_name || fileData.filename.replace(/\.[^/.]+$/, ''),
                    start_ms: times.start_ms,
                    end_ms: times.end_ms,
                    num_stems: stemMode,
                }),
            });
        } catch (e) {
            console.error(e);
            setStep('select');
        }
    };

    const handleOpenFX = (stemName) => { setActiveFxStem(stemName); setFxModalOpen(true); };

    const handleSolo = (stemName) => {
        setSoloedStem(prev => prev === stemName ? null : stemName);
    };

    const handleMute = (stemName) => {
        setMutedStems(prev => {
            const next = new Set(prev);
            next.has(stemName) ? next.delete(stemName) : next.add(stemName);
            return next;
        });
    };

    const handleApplyFX = async (stemName, presetId, passes, mix = 1.0, preview = false) => {
        setProcessingFx(true); setFxProgress(0);
        try {
            const res = await fetch('http://localhost:8000/process_fx/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_id: fileData.file_id, stem_name: stemName, preset_id: presetId, passes, mix, preview }),
            });
            if (res.ok) { const data = await res.json(); pollFxProgress(data.task_key, preview); }
        } catch (e) { console.error('FX Request failed', e); setProcessingFx(false); }
    };

    const pollFxProgress = (taskKey, isPreview = false) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:8000/fx_progress/${taskKey}`);
                const data = await res.json();
                if (!isPreview) setFxProgress(data.progress);
                if (data.progress >= 100) {
                    clearInterval(interval); setProcessingFx(false);
                    if (!isPreview) {
                        setStems(prev => prev.map(s => ({ ...s, src: s.src + '?t=' + Date.now() })));
                    }
                } else if (data.progress === -1) {
                    clearInterval(interval); setProcessingFx(false);
                    if (!isPreview) alert('FX Processing Failed');
                }
            } catch (e) { console.error(e); }
        }, 500);
    };

    if (studioMode) {
        return <StudioView stems={stems} fileData={fileData} onExit={() => setStudioMode(false)} />;
    }

    return (
        <div className="h-screen flex flex-col bg-transparent overflow-hidden">
            <Background />
            <TitleBar />
            
            <div className="flex-1 overflow-auto relative selection:bg-purple-500/30">
                {/* Background Gradients (Kept as secondary legacy layers) */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full" />
                </div>

            {/* Header */}
            <div className="absolute top-10 left-0 right-0 p-6 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center font-bold text-[#0a0f1d] shadow-lg shadow-cyan-500/20">
                        SS
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black tracking-tighter text-white leading-none">
                            StemSplit<span className="text-cyan-400">.AI</span>
                        </span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                            Part of NoDAW Studio
                        </span>
                    </div>
                </div><DeviceBadge info={deviceInfo} loading={deviceLoading} />
            </div>

            {/* FX overlay */}
            <AnimatePresence>
                {processingFx && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
                    >
                        <div className="w-64">
                            <div className="flex justify-between mb-2 text-sm">
                                <span className="text-purple-400">Processing FX...</span>
                                <span>{Math.round(fxProgress)}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-purple-500" initial={{ width: 0 }} animate={{ width: `${fxProgress}%` }} />
                            </div>
                            <p className="text-center text-xs text-gray-500 mt-4">Applying audio chain...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <FXSelector isOpen={fxModalOpen} onClose={() => setFxModalOpen(false)} stemName={activeFxStem} fileId={fileData?.file_id} onApply={handleApplyFX} />

            <AnimatePresence mode="wait">
                {/* UPLOAD */}
                {step === 'upload' && (
                    <motion.div key="upload"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="container mx-auto max-w-4xl px-4 py-16 flex flex-col items-center justify-center min-h-[80vh]"
                    >
                        <div className="text-center mb-12">
                            <h1 className="text-6xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                                DeepSplit
                            </h1>
                            <p className="text-xl text-gray-400 font-light tracking-wide">
                                Professional AI Audio Separation &amp; Mixing Environment
                            </p>
                        </div>
                        <Upload onUploadSuccess={handleUploadSuccess} />
                    </motion.div>
                )}

                {/* MODE SELECTOR */}
                {step === 'mode' && (
                    <motion.div key="mode"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="min-h-screen flex flex-col items-center justify-center pt-20 pb-8"
                    >
                        <StemModeSelector
                            selected={stemMode}
                            onSelect={setStemMode}
                            deviceInfo={deviceInfo}
                        />
                        <motion.button
                            onClick={handleModeConfirmed}
                            className="mt-6 px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-xl shadow-purple-900/30 hover:scale-105"
                            whileTap={{ scale: 0.97 }}
                        >
                            Continue →
                        </motion.button>
                        <button onClick={() => setStep('upload')} className="mt-4 text-gray-600 hover:text-gray-400 text-sm">
                            ← Back
                        </button>
                    </motion.div>
                )}

                {/* WAVEFORM SELECT */}
                {step === 'select' && fileData && (
                    <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <WaveformSelector
                            url={`http://localhost:8000/uploads/${fileData.file_id}_${fileData.filename}`}
                            onConfirmSelection={handleSelectionConfirmed}
                        />
                    </motion.div>
                )}

                {/* PROCESSING */}
                {step === 'processing' && (
                    <motion.div key="processing"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 border-t-4 border-b-4 border-purple-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center font-mono text-purple-400 text-xs">AI</div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-white">Separating Stems...</h3>
                            <p className="text-gray-400 font-mono">{statusMessage}</p>
                            <p className="text-gray-600 text-sm">
                                {stemMode}-stem mode on {deviceInfo?.device === 'cuda' ? `GPU (${deviceInfo.gpu_name})` : 'CPU'} —
                                this can take several minutes
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* RESULTS */}
                {step === 'results' && (
                    <motion.div key="results"
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="container mx-auto max-w-5xl px-4 py-8 relative"
                    >
                        <div className="flex justify-between items-end mb-8 pt-12">
                            <div>
                                <h2 className="text-5xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
                                    Your Stems.
                                </h2>
                                <p className="text-gray-400">Successfully separated into {stems.length} tracks.</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <button
                                    onClick={() => setStudioMode(true)}
                                    className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl font-bold shadow-lg shadow-white/10 flex items-center gap-2 transition-all hover:scale-105"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                                    Open Studio Editor
                                </button>
                                <p className="text-gray-600 text-xs">Mix, Edit &amp; Record</p>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            {stems.map((stem, i) => (
                                <StemPlayer
                                    key={i}
                                    {...stem}
                                    isPlaying={isPlaying}
                                    mainVolume={1}
                                    onSolo={() => handleSolo(stem.name)}
                                    onMute={() => handleMute(stem.name)}
                                    onFX={() => handleOpenFX(stem.name)}
                                    isSoloed={soloedStem === stem.name}
                                    isMuted={mutedStems.has(stem.name)}
                                    anysoloed={soloedStem !== null}
                                />
                            ))}
                        </div>

                        <div className="mt-8 flex justify-center gap-4">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-all shadow-xl shadow-purple-900/30"
                            >
                                {isPlaying
                                    ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="fill-current w-6 h-6"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
                                    : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="fill-current w-6 h-6 ml-1"><path d="M8 5v14l11-7z" /></svg>}
                            </button>
                        </div>

                        <div className="mt-12 text-center">
                            <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-white underline text-sm">
                                Process another file
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}

export default App;
