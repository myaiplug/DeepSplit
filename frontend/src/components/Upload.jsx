import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, CheckCircle2, XCircle, AlertCircle, Edit3, ShieldCheck, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YoutubeInput from './YoutubeInput';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aiff'];
const BASE_URL = 'http://localhost:8000';
const POLL_INTERVAL = 250; // ms — how often we check server progress

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBytes(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function getExt(filename) {
    const i = filename.lastIndexOf('.');
    return i >= 0 ? filename.slice(i).toLowerCase() : '';
}
function genUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// Stage metadata
const STAGE_META = {
    waiting:    { label: 'Waiting…',             color: '#9333ea', icon: null },
    uploading:  { label: 'Uploading',             color: '#a855f7', icon: null },
    validating: { label: 'Validating format…',   color: '#c084fc', icon: null },
    scanning:   { label: 'Scanning for threats…', color: '#f59e0b', icon: ShieldCheck },
    finalizing: { label: 'Finalizing…',           color: '#10b981', icon: null },
    complete:   { label: 'Complete!',             color: '#10b981', icon: CheckCircle2 },
    error:      { label: 'Failed',                color: '#ef4444', icon: XCircle },
};

// ─── Shimmer component ────────────────────────────────────────────────────────
function ShimmerBar({ pct, stage, color }) {
    const isActive = stage !== 'complete' && stage !== 'error';
    return (
        <div className="w-full">
            {/* Track */}
            <div className="relative h-3 bg-gray-800/80 rounded-full overflow-hidden"
                 style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
                {/* Fill */}
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ ease: 'linear', duration: 0.18 }}
                    style={{
                        background: `linear-gradient(90deg, #7c3aed, ${color}, #ec4899)`,
                        boxShadow: `0 0 12px ${color}60, 0 0 4px ${color}40`,
                    }}
                >
                    {/* Animated shimmer overlay */}
                    {isActive && pct > 4 && (
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                            style={{
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                                width: '50%',
                            }}
                        />
                    )}
                </motion.div>
                {/* Glow pulse on the tip when active */}
                {isActive && pct > 1 && pct < 100 && (
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                        style={{
                            left: `calc(${Math.min(pct, 99)}% - 6px)`,
                            background: color,
                            boxShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Upload modal ─────────────────────────────────────────────────────────────
function UploadModal({
    state, fileName, xhrPct, xhrLoaded, xhrTotal,
    serverStage, serverPct,
    serverError, displayName, onDisplayNameChange, onConfirm, onRetry,
    scanActive,
}) {
    const inputRef = useRef(null);

    // Combined progress: XHR controls 0-75%, server stages control 75-100%
    const combinedPct = state === 'uploading'
        ? Math.min(xhrPct * 0.75, 74)           // bytes in transit → 0-74%
        : state === 'server-processing'
        ? 74 + (serverPct / 100) * 26            // server stages → 74-100%
        : state === 'success' ? 100
        : 0;

    const stageMeta = STAGE_META[serverStage] || STAGE_META.waiting;
    const stageColor = stageMeta.color;
    const ScanIcon = stageMeta.icon;

    const displayPct = Math.round(combinedPct);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(5,5,5,0.90)' }}
        >
            {/* Ambient orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    style={{ background: '#7c3aed', filter: 'blur(80px)' }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
                    animate={{ scale: [1.15, 1, 1.15], opacity: [0.12, 0.2, 0.12] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    style={{ background: '#db2777', filter: 'blur(80px)' }}
                />
            </div>

            <motion.div
                initial={{ scale: 0.88, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.88, y: 30 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="relative w-full max-w-lg mx-4 rounded-3xl p-8 shadow-2xl"
                style={{
                    background: 'rgba(12,12,16,0.95)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 60px rgba(124,58,237,0.15), 0 30px 60px rgba(0,0,0,0.6)',
                }}
            >
                <AnimatePresence mode="wait">

                    {/* ─── UPLOADING + SERVER PROCESSING ─────────────────── */}
                    {(state === 'uploading' || state === 'server-processing') && (
                        <motion.div
                            key="uploading"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-7"
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 shrink-0">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                        <circle cx="24" cy="24" r="20" fill="none"
                                                stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                                        <motion.circle
                                            cx="24" cy="24" r="20" fill="none"
                                            stroke="url(#prog-grad)" strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeDasharray={`${2 * Math.PI * 20}`}
                                            animate={{
                                                strokeDashoffset: 2 * Math.PI * 20 * (1 - displayPct / 100)
                                            }}
                                            transition={{ ease: 'linear', duration: 0.2 }}
                                        />
                                        <defs>
                                            <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#7c3aed"/>
                                                <stop offset="100%" stopColor="#ec4899"/>
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                                        {displayPct}%
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-bold text-lg leading-tight">
                                        {state === 'uploading' ? 'Uploading…' : stageMeta.label}
                                    </p>
                                    <p className="text-gray-500 text-xs font-mono truncate mt-0.5">{fileName}</p>
                                </div>
                                {/* Scan shield badge */}
                                {state === 'server-processing' && serverStage === 'scanning' && (
                                    <motion.div
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="ml-auto shrink-0 flex items-center gap-1.5 px-2.5 py-1
                                                   rounded-full text-amber-400 text-xs font-mono"
                                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
                                    >
                                        <Shield className="w-3 h-3" />
                                        AV Scan
                                    </motion.div>
                                )}
                            </div>

                            {/* Styled progress bar */}
                            <div>
                                <ShimmerBar
                                    pct={displayPct}
                                    stage={serverStage || 'uploading'}
                                    color={stageColor}
                                />

                                {/* Stats row */}
                                <div className="flex justify-between items-center mt-2.5 text-xs font-mono text-gray-500">
                                    <span>{fmtBytes(xhrLoaded)} / {fmtBytes(xhrTotal)}</span>
                                    <motion.span
                                        key={serverStage}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-right"
                                        style={{ color: stageColor }}
                                    >
                                        {state === 'uploading'
                                            ? 'Transferring bytes…'
                                            : stageMeta.label}
                                    </motion.span>
                                </div>
                            </div>

                            {/* Stage pills */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {['uploading', 'validating', 'scanning', 'finalizing'].map((s, i) => {
                                    const stages = ['uploading', 'validating', 'scanning', 'finalizing', 'complete'];
                                    const currentIdx = stages.indexOf(serverStage || 'uploading');
                                    const thisIdx = stages.indexOf(s);
                                    const done = thisIdx < currentIdx;
                                    const active = thisIdx === currentIdx;
                                    return (
                                        <div key={s}
                                             className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono
                                                         transition-all duration-500
                                                         ${active ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300' :
                                                           done  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' :
                                                                   'bg-white/3 border border-white/5 text-gray-600'}`}>
                                            {done && <span>✓</span>}
                                            {active && (
                                                <motion.span
                                                    animate={{ opacity: [1,0.4,1] }}
                                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                                    className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"
                                                />
                                            )}
                                            {s}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Scan status */}
                            {!scanActive && (
                                <p className="text-xs text-gray-600 font-mono text-center">
                                    ⚠ Virus scanning inactive — install ClamAV to enable
                                </p>
                            )}

                            <p className="text-center text-gray-600 text-xs">Do not close this window</p>
                        </motion.div>
                    )}

                    {/* ─── SUCCESS ─────────────────────────────────────── */}
                    {state === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-6 text-center"
                        >
                            {/* Completed bar */}
                            <div className="w-full">
                                <ShimmerBar pct={100} stage="complete" color="#10b981" />
                            </div>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 14, stiffness: 240, delay: 0.05 }}
                                className="w-20 h-20 rounded-full flex items-center justify-center"
                                style={{
                                    background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    boxShadow: '0 0 40px rgba(16,185,129,0.2)',
                                }}
                            >
                                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                            </motion.div>

                            <div>
                                <p className="text-emerald-400 font-bold text-xl">Upload Complete</p>
                                <p className="text-gray-500 text-xs font-mono mt-1">{fmtBytes(xhrTotal)} received • {scanActive ? '✓ AV scanned' : '⚠ scan skipped'}</p>
                            </div>

                            {/* Rename input */}
                            <div className="w-full">
                                <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 text-left">
                                    <Edit3 className="w-3 h-3" />
                                    Track name — edit before splitting
                                </label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={displayName}
                                    onChange={e => onDisplayNameChange(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && onConfirm()}
                                    className="w-full rounded-xl px-4 py-3 text-white text-sm
                                               focus:outline-none focus:ring-1 focus:ring-purple-500/40
                                               transition placeholder-gray-600"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}
                                    placeholder="Track name…"
                                    maxLength={80}
                                    autoFocus
                                />
                            </div>

                            <motion.button
                                onClick={onConfirm}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                                    boxShadow: '0 0 30px rgba(124,58,237,0.35)',
                                }}
                            >
                                Start Splitting →
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ─── ERROR ───────────────────────────────────────── */}
                    {state === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-5 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 14, stiffness: 240 }}
                                className="w-20 h-20 rounded-full flex items-center justify-center"
                                style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    boxShadow: '0 0 30px rgba(239,68,68,0.15)',
                                }}
                            >
                                <XCircle className="w-10 h-10 text-red-400" />
                            </motion.div>
                            <div>
                                <p className="text-red-400 font-bold text-xl">Upload Failed</p>
                                <p className="text-gray-400 text-sm mt-2 max-w-sm leading-relaxed">{serverError}</p>
                            </div>
                            <motion.button
                                onClick={onRetry}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full py-3 rounded-xl text-gray-300 text-sm transition hover:bg-white/5"
                                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                ← Try a different file
                            </motion.button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────
function DropZone({ getRootProps, getInputProps, isDragActive, error }) {
    return (
        <div className="w-full max-w-2xl mx-auto p-6">
            <motion.div
                {...getRootProps()}
                className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
                    ${isDragActive
                        ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_50px_rgba(168,85,247,0.2)]'
                        : 'border-gray-700 hover:border-purple-500/50 hover:bg-white/[0.02]'
                    }
                    h-80 flex flex-col items-center justify-center group`}
                whileHover={{ scale: 1.008 }}
                whileTap={{ scale: 0.995 }}
            >
                <input {...getInputProps()} />
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-purple-600 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-pink-600 blur-[100px]" />
                </div>
                <div className="flex flex-col items-center text-center space-y-4 z-10 px-8">
                    <div className="p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full
                                    group-hover:shadow-[0_0_35px_rgba(168,85,247,0.4)] transition-shadow duration-500">
                        <UploadIcon className="w-10 h-10 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {isDragActive ? 'Release to upload' : 'Drop your track here'}
                    </h3>
                    <p className="text-gray-400 text-sm">or click to browse files</p>
                    <div className="flex gap-2 flex-wrap justify-center">
                        {['MP3', 'WAV', 'FLAC', 'M4A', 'OGG', 'AIFF'].map(f => (
                            <span key={f} className="px-2 py-1 rounded-md bg-white/5 text-gray-500 text-xs font-mono">{f}</span>
                        ))}
                    </div>
                    <p className="text-gray-600 text-xs">Max 50 MB · AV scanned · Rate limited</p>
                </div>
            </motion.div>
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mt-4 flex items-start gap-2 text-red-400 text-sm px-4 py-3 rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Tab toggle ───────────────────────────────────────────────────────────────
function InputTabs({ active, onChange }) {
    return (
        <div className="flex items-center gap-1 p-1 rounded-xl mb-2"
             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
                { id: 'file',    label: '⬆ Upload File' },
                { id: 'youtube', label: '▶ YouTube URL' },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200
                        ${active === tab.id
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                            : 'text-gray-500 hover:text-gray-300'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
const Upload = ({ onUploadSuccess, onYoutubeSubmit }) => {
    const [inputTab, setInputTab] = useState('file');
    const [modalState,   setModalState]   = useState(null); // null|uploading|server-processing|success|error
    const [xhrPct,       setXhrPct]       = useState(0);
    const [xhrLoaded,    setXhrLoaded]    = useState(0);
    const [xhrTotal,     setXhrTotal]     = useState(0);
    const [serverStage,  setServerStage]  = useState('waiting');
    const [serverPct,    setServerPct]    = useState(0);
    const [serverError,  setServerError]  = useState('');
    const [dropError,    setDropError]    = useState('');
    const [fileName,     setFileName]     = useState('');
    const [displayName,  setDisplayName]  = useState('');
    const [scanActive,   setScanActive]   = useState(false);
    const uploadDataRef  = useRef(null);
    const pollRef        = useRef(null);
    const uploadIdRef    = useRef(null);

    // ── Fetch scan status on mount ─────────────────────────────────────────
    useEffect(() => {
        fetch(`${BASE_URL}/system/scan_status`)
            .then(r => r.json())
            .then(d => setScanActive(d.clamd_available))
            .catch(() => setScanActive(false));
    }, []);

    // ── Stop polling helper ────────────────────────────────────────────────
    const stopPoll = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    // ── Start server-side progress polling ─────────────────────────────────
    const startPoll = (uploadId) => {
        stopPoll();
        pollRef.current = setInterval(async () => {
            try {
                const r    = await fetch(`${BASE_URL}/upload/progress/${uploadId}`);
                const data = await r.json();
                setServerStage(data.stage || 'waiting');
                setServerPct(data.pct || 0);

                if (data.done) {
                    stopPoll();
                    if (data.error) {
                        setServerError(data.error);
                        setModalState('error');
                    } else {
                        setModalState('success');
                    }
                }
            } catch (_) { /* ignore transient poll errors */ }
        }, POLL_INTERVAL);
    };

    // ── Main upload handler ────────────────────────────────────────────────
    const startUpload = useCallback((file) => {
        setDropError('');

        const ext = getExt(file.name);
        if (!ALLOWED_EXTS.includes(ext)) {
            setDropError(`"${ext}" is not supported. Accepted: ${ALLOWED_EXTS.join(', ')}`);
            return;
        }
        if (file.size > MAX_BYTES) {
            setDropError(`Too large (${fmtBytes(file.size)}). Maximum is 50 MB.`);
            return;
        }

        const stem     = file.name.replace(/\.[^/.]+$/, '');
        const uploadId = genUUID();
        uploadIdRef.current = uploadId;

        setFileName(file.name);
        setDisplayName(stem);
        setXhrPct(0); setXhrLoaded(0); setXhrTotal(file.size);
        setServerStage('waiting'); setServerPct(0);
        setServerError('');
        setModalState('uploading');

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                setXhrLoaded(e.loaded);
                setXhrTotal(e.total);
                setXhrPct((e.loaded / e.total) * 100);
            }
        };

        // When all bytes sent → switch to server-processing state + start polling
        xhr.upload.onload = () => {
            setXhrPct(100);
            setModalState('server-processing');
            setServerStage('validating');
            startPoll(uploadId);
        };

        xhr.onload = () => {
            stopPoll();
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                uploadDataRef.current = data;
                setXhrLoaded(file.size);
                setXhrTotal(file.size);
                setServerStage('complete');
                setServerPct(100);
                setModalState('success');
            } else {
                let msg = `Server error (${xhr.status}).`;
                try { msg = JSON.parse(xhr.responseText).detail || msg; } catch (_) {}
                setServerError(msg);
                setServerStage('error');
                setModalState('error');
            }
        };

        xhr.onerror = () => {
            stopPoll();
            setServerError('Could not reach the backend. Is the server running on port 8000?');
            setModalState('error');
        };

        xhr.open('POST', `${BASE_URL}/upload/`);
        xhr.setRequestHeader('X-Upload-ID', uploadId);
        xhr.send(formData);
    }, []);

    const onDrop = useCallback((files) => {
        if (files[0]) startUpload(files[0]);
    }, [startUpload]);

    const handleConfirm = () => {
        if (!uploadDataRef.current) return;
        const name = displayName.trim() || uploadDataRef.current.filename.replace(/\.[^/.]+$/, '');
        onUploadSuccess({ ...uploadDataRef.current, display_name: name });
        setModalState(null);
        uploadDataRef.current = null;
    };

    const handleRetry = () => {
        stopPoll();
        setModalState(null);
        setServerError('');
        setXhrPct(0); setXhrLoaded(0);
        uploadDataRef.current = null;
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'audio/*': ALLOWED_EXTS },
        maxFiles: 1,
        noClick: modalState !== null,
        noDrag:  modalState !== null,
    });

    return (
        <>
            {/* Tab toggle */}
            <InputTabs active={inputTab} onChange={setInputTab} />

            <AnimatePresence mode="wait">
                {inputTab === 'file' ? (
                    <motion.div key="file-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                        <DropZone
                            getRootProps={getRootProps}
                            getInputProps={getInputProps}
                            isDragActive={isDragActive}
                            error={dropError}
                        />
                    </motion.div>
                ) : (
                    <motion.div key="yt-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                        <YoutubeInput onSubmit={onYoutubeSubmit} disabled={false} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {modalState && (
                    <UploadModal
                        state={modalState}
                        fileName={fileName}
                        xhrPct={xhrPct}
                        xhrLoaded={xhrLoaded}
                        xhrTotal={xhrTotal}
                        serverStage={serverStage}
                        serverPct={serverPct}
                        serverError={serverError}
                        displayName={displayName}
                        onDisplayNameChange={setDisplayName}
                        onConfirm={handleConfirm}
                        onRetry={handleRetry}
                        scanActive={scanActive}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default Upload;
