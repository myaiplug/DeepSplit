import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

function YoutubeIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
    );
}

const YoutubeInput = ({ onSubmit, disabled, defaultStems = 6 }) => {
    const [url, setUrl] = useState('');
    const [format, setFormat] = useState('wav');
    const [numStems, setNumStems] = useState(defaultStems);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = url.trim();
        if (!trimmed) {
            setError('Please enter a YouTube URL.');
            return;
        }
        if (!YT_REGEX.test(trimmed)) {
            setError('Please enter a valid YouTube video URL.');
            return;
        }
        setError('');
        onSubmit(trimmed, format, numStems);
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6">
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border-2 border-gray-700 hover:border-purple-500/50
                           transition-all duration-300 bg-black/20 p-8 flex flex-col gap-6"
            >
                {/* Ambient glow */}
                <div className="absolute inset-0 pointer-events-none opacity-15">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-red-600 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-600 blur-[100px]" />
                </div>

                {/* Icon + label */}
                <div className="flex flex-col items-center gap-3 z-10">
                    <div className="p-4 bg-gradient-to-br from-red-500/20 to-purple-500/20 rounded-full">
                        <span className="text-red-400"><YoutubeIcon /></span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Paste a YouTube URL</h3>
                    <p className="text-gray-400 text-sm text-center">
                        We'll download the audio and split it into stems automatically
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 z-10">
                    <input
                        type="url"
                        value={url}
                        onChange={e => { setUrl(e.target.value); setError(''); }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={disabled}
                        className="w-full rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2
                                   focus:ring-purple-500/60 transition placeholder-gray-600 disabled:opacity-50"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />

                    {/* Format selector */}
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm shrink-0">Output format:</span>
                        <div className="flex gap-2">
                            {['wav', 'mp3', 'flac'].map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFormat(f)}
                                    disabled={disabled}
                                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all
                                        ${format === f
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                                            : 'text-gray-500 border border-gray-700 hover:border-purple-500/50 hover:text-gray-300'
                                        } disabled:opacity-50`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        {format === 'wav' && (
                            <span className="text-xs text-green-400/70 font-mono">lossless</span>
                        )}
                    </div>

                    {/* Stem count selector */}
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm shrink-0">Stems:</span>
                        <div className="flex gap-2">
                            {[
                                { val: 2, label: '2', desc: 'Vocals / Inst' },
                                { val: 4, label: '4', desc: 'Demucs' },
                                { val: 5, label: '5', desc: 'MDX+Demucs' },
                                { val: 6, label: '6', desc: '6-stem' },
                            ].map(({ val, label, desc }) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setNumStems(val)}
                                    disabled={disabled}
                                    title={desc}
                                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all
                                        ${numStems === val
                                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                                            : 'text-gray-500 border border-gray-700 hover:border-cyan-500/50 hover:text-gray-300'
                                        } disabled:opacity-50`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <span className="text-xs text-gray-600 font-mono">
                            {numStems === 2 ? 'Vocals + Instrumental' :
                             numStems === 4 ? 'Vocals, Drums, Bass, Other' :
                             numStems === 5 ? 'Vocals, Drums, Bass, Guitar, Other' :
                             'Vocals, Drums, Bass, Guitar, Piano, Other'}
                        </span>
                    </div>

                    <motion.button
                        type="submit"
                        disabled={disabled || !url.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 0 25px rgba(124,58,237,0.3)' }}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <YoutubeIcon />
                            Split YouTube Track →
                        </span>
                    </motion.button>
                </form>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-start gap-2 text-red-400 text-sm px-4 py-3 rounded-xl z-10"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <p className="text-gray-600 text-xs text-center z-10">
                    Supports single videos · YouTube only · Rate limited
                </p>
            </motion.div>
        </div>
    );
};

export default YoutubeInput;
