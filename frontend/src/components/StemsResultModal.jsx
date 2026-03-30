import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Play, Pause } from 'lucide-react';
import StemPlayer from './StemPlayer';

const BASE_URL = 'http://localhost:8000';

/**
 * StemsResultModal — pop-up modal shown after stem separation completes.
 * Displays each stem with waveform, play/pause, individual download, and
 * a "Download All (ZIP)" button.
 */
const StemsResultModal = ({
    isOpen,
    onClose,
    stems,
    fileId,
    title,
    deviceInfo,
    onOpenStudio,
    onSolo,
    onMute,
    onFX,
    soloedStem,
    mutedStems,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const zipUrl = fileId ? `${BASE_URL}/download/${fileId}/stems.zip` : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="stems-modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(4,4,10,0.88)' }}
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    {/* Ambient orbs */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div
                            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
                            animate={{ scale: [1, 1.1, 1], opacity: [0.06, 0.12, 0.06] }}
                            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                            style={{ background: '#7c3aed', filter: 'blur(100px)' }}
                        />
                        <motion.div
                            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
                            animate={{ scale: [1.1, 1, 1.1], opacity: [0.06, 0.12, 0.06] }}
                            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                            style={{ background: '#db2777', filter: 'blur(100px)' }}
                        />
                    </div>

                    <motion.div
                        key="stems-modal-card"
                        initial={{ scale: 0.88, y: 40, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.88, y: 40, opacity: 0 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
                        style={{
                            background: 'rgba(10,10,18,0.97)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 0 80px rgba(124,58,237,0.2), 0 40px 80px rgba(0,0,0,0.7)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">
                                    {title || 'Your Stems'}
                                </h2>
                                <p className="text-gray-500 text-sm mt-0.5">
                                    Separated into {stems.length} track{stems.length !== 1 ? 's' : ''} ·{' '}
                                    {deviceInfo?.device === 'cuda' ? `GPU · ${deviceInfo.gpu_name}` : 'CPU'}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Studio button */}
                                {onOpenStudio && (
                                    <button
                                        onClick={onOpenStudio}
                                        className="px-4 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-200 transition-all hover:scale-105 flex items-center gap-1.5 shadow-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                                        Studio
                                    </button>
                                )}
                                {/* Close */}
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable stems list */}
                        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
                            {stems.map((stem, i) => (
                                <StemPlayer
                                    key={i}
                                    {...stem}
                                    isPlaying={isPlaying}
                                    mainVolume={1}
                                    onSolo={() => onSolo && onSolo(stem.name)}
                                    onMute={() => onMute && onMute(stem.name)}
                                    onFX={() => onFX && onFX(stem.name)}
                                    isSoloed={soloedStem === stem.name}
                                    isMuted={mutedStems ? mutedStems.has(stem.name) : false}
                                    anysoloed={soloedStem !== null}
                                    downloadUrl={stem.src}
                                />
                            ))}
                        </div>

                        {/* Footer controls */}
                        <div
                            className="shrink-0 px-6 py-4 flex items-center justify-between gap-4"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)' }}
                        >
                            {/* Play / Pause all */}
                            <button
                                onClick={() => setIsPlaying(p => !p)}
                                className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-all shadow-xl shadow-purple-900/30 shrink-0"
                            >
                                {isPlaying
                                    ? <Pause className="w-5 h-5" />
                                    : <Play className="w-5 h-5 ml-0.5" />}
                            </button>

                            <span className="text-gray-500 text-xs font-mono flex-1">
                                {isPlaying ? 'Playing all stems…' : 'Press play to preview all stems together'}
                            </span>

                            {/* Download ZIP */}
                            {zipUrl && (
                                <a
                                    href={zipUrl}
                                    download="stems.zip"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white
                                               transition-all hover:scale-105 shadow-lg shadow-cyan-900/20"
                                    style={{ background: 'linear-gradient(135deg, #0891b2, #7c3aed)' }}
                                >
                                    <Download className="w-4 h-4" />
                                    Download All (.zip)
                                </a>
                            )}
                        </div>

                        {/* Start over link */}
                        <div className="shrink-0 py-3 text-center">
                            <button
                                onClick={onClose}
                                className="text-gray-600 hover:text-gray-400 text-xs underline transition-colors"
                            >
                                Process another track
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StemsResultModal;
