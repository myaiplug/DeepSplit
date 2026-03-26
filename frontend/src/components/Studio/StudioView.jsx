import React, { useState, useEffect, useRef } from 'react';
import TrackRow from './TrackRow';
import MixerModal from './MixerModal';
import { Play, Pause, FastForward, Rewind, Plus, Mic, Download, X, SlidersHorizontal, Upload as UploadIcon } from 'lucide-react';
import FXSelector from '../FXSelector';
import { AlertCircle } from 'lucide-react';

const StudioView = ({ stems, fileData, onExit }) => {
    // Convert initial stems prop to Track objects
    const [tracks, setTracks] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fxModal, setFxModal] = useState({ open: false, trackId: null, stemName: null });
    const [mixerOpen, setMixerOpen] = useState(false); // New state for mixer
    const fileInputRef = useRef(null); // Ref for file picker

    // Shared AudioContext for perfect sync
    const audioContext = React.useMemo(() => {
        return new (window.AudioContext || window.webkitAudioContext)();
    }, []);

    // Transport
    const [currentTime, setCurrentTime] = useState(0);

    // Initialize Tracks from Stems on mount
    useEffect(() => {
        if (stems && stems.length > 0 && tracks.length === 0) {
            const initialTracks = stems.map((stem, idx) => ({
                id: `track-${idx}-${Date.now()}`,
                name: stem.name,
                src: stem.src,
                color: stem.color,
                volume: 1.0,
                muted: false,
                soloed: false,
                startTime: 0, // In seconds
                effects: [] // Chain of effects
            }));
            setTracks(initialTracks);
        }
    }, [stems]);


    // --- Transport Logic (Simple Clock) ---
    useEffect(() => {
        let interval;
        if (isPlaying) {
            const startTimestamp = Date.now() - (currentTime * 1000);
            interval = setInterval(() => {
                const now = Date.now();
                setCurrentTime((now - startTimestamp) / 1000);
            }, 50); // 20fps update
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    const handleStartTimeChange = (id, newTime) => {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, startTime: newTime } : t));
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
    };

    // --- Mixer Logic ---

    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleVolume = (id, val) => {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: val } : t));
    };

    const handleMute = (id) => {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t));
    };

    const handleSolo = (id) => {
        setTracks(prev => {
            const anyoneSoloed = prev.some(t => t.id !== id && t.soloed);
            // If soloing this track, others should mute effectively (handled in TrackRow via effect?)
            // Actually, we pass solo state down.
            return prev.map(t => t.id === id ? { ...t, soloed: !t.soloed } : t);
        });
    };

    const handleRemove = (id) => {
        setTracks(prev => prev.filter(t => t.id !== id));
    };

    // --- Add Track (Custom Import) ---
    const handleAddTrack = () => {
        // Mock add track logic - in real app would open file picker
        // For now, let's just duplicate the first track or add an empty one
        alert("To add custom samples, Drag & Drop files directly onto the grid!");
    };

    // Drag & Drop File Import
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const newTracks = files.map((file, idx) => ({
                id: `custom-${Date.now()}-${idx}`,
                name: file.name,
                src: URL.createObjectURL(file), // Create local blob URL
                color: '#ffffff',
                volume: 1.0,
                muted: false,
                soloed: false,
                startTime: 0,
                effects: []
            }));
            setTracks(prev => [...prev, ...newTracks].slice(0, 10)); // Max 10
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // --- FX Logic ---

    const openFX = (trackId) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            setFxModal({ open: true, trackId, stemName: track.name });
        }
    };

    const applyFX = (stemName, presetId, passes) => {
        console.log(`Applying Studio FX ${presetId} to ${stemName}`);
        // Here we would ideally trigger the backend process for THIS specific track's file
        // For now, let's just log it. In a real app we'd need to update the track.src after processing.
        // We can reuse the App.jsx logic if passed down or reimplemented here.
        setFxModal({ open: false, trackId: null, stemName: null });
    };

    // Handle File Picker Click
    const handleLoadAudioClick = () => {
        fileInputRef.current.click();
    };

    // Handle File Selection
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const newTracks = files.map((file, idx) => ({
                id: `load-${Date.now()}-${idx}`,
                name: file.name,
                src: URL.createObjectURL(file),
                color: '#ffffff',
                volume: 1.0,
                muted: false,
                soloed: false,
                startTime: 0,
                effects: []
            }));
            setTracks(prev => [...prev, ...newTracks].slice(0, 10));
        }
    };


    return (
        <div className="fixed inset-0 bg-[#050505] z-40 flex flex-col">
            {/* FFmpeg Warning Banner */}
            {deviceInfo && !deviceInfo.ffmpeg_available && (
                <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-2 flex items-center gap-3 text-amber-200 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>
                        <strong>FFmpeg missing:</strong> Mixdown and Export features are disabled. Please install FFmpeg on the server to enable high-quality exports.
                    </span>
                </div>
            )}

            {/* Toolbar */}
            <div className="h-16 border-b border-gray-800 bg-[#111] flex items-center px-6 gap-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="text-gray-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        DEEP SPLIT <span className="text-white text-xs font-mono ml-2 opacity-50">STUDIO</span>
                    </h1>
                </div>

                {/* Transport */}
                <div className="flex-1 flex justify-center items-center gap-4">
                    <button className="text-gray-400 hover:text-white"><Rewind className="w-5 h-5" /></button>
                    <button
                        onClick={togglePlay}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform text-black"
                    >
                        {isPlaying ? <Pause className="fill-current w-4 h-4" /> : <Play className="fill-current w-4 h-4 ml-1" />}
                    </button>
                    <button className="text-gray-400 hover:text-white"><FastForward className="w-5 h-5" /></button>

                    <div className="bg-black border border-gray-800 px-3 py-1 rounded text-purple-400 font-mono text-lg">
                        {formatTime(currentTime)}
                    </div>
                </div>

                {/* Tools */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setMixerOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors border border-gray-700"
                    >
                        <SlidersHorizontal className="w-4 h-4" /> Mixer
                    </button>

                    <div className="h-6 w-px bg-gray-800 mx-2"></div>

                    <button className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/50 rounded hover:bg-red-500 hover:text-white transition-colors">
                        <Mic className="w-4 h-4" /> REC
                    </button>

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        multiple
                        accept="audio/*"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <button
                        onClick={handleLoadAudioClick}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                        <UploadIcon className="w-4 h-4" /> Load
                    </button>

                    <button
                        onClick={handleAddTrack}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Track
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded hover:bg-gray-200 transition-colors">
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>
            </div>

            {/* Tracks Grid */}
            <div
                className="flex-1 overflow-y-auto bg-[#0a0a0a] relative"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {/* Timeline Ruler (Optional placeholder) */}
                <div className="h-6 bg-[#1a1a1a] border-b border-gray-800 w-full sticky top-0 z-20 flex items-end pb-1 select-none">
                    {/* Time markers every second */}
                    {Array.from({ length: 100 }).map((_, i) => (
                        <div key={i} className="flex-1 text-[10px] text-gray-600 border-l border-gray-800 pl-1 h-2 relative" style={{ minWidth: '50px' }}>
                            {i}s
                        </div>
                    ))}
                </div>

                {/* Track List */}
                <div className="min-h-full pb-20 relative">
                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-[1px] bg-white z-30 pointer-events-none"
                        style={{ left: `${256 + (currentTime * 50)}px` }} // 256px is sidebar width, 50px per sec
                    />

                    {tracks.map((track, i) => (
                        <TrackRow
                            key={track.id}
                            index={i}
                            track={track}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            audioContext={audioContext}
                            onMute={handleMute}
                            onSolo={handleSolo}
                            onVolumeChange={handleVolume}
                            onRemove={handleRemove}
                            onOpenFX={openFX}
                            onChangeStartTime={handleStartTimeChange}
                        />
                    ))}

                    {/* Empty State / Add Track Area */}
                    {tracks.length < 10 && (
                        <div className="h-32 flex items-center justify-center text-gray-800 border-2 border-dashed border-gray-900 m-4 rounded-xl">
                            Drag and drop audio files or stems here to add tracks
                        </div>
                    )}
                </div>
            </div>

            <FXSelector
                isOpen={fxModal.open}
                onClose={() => setFxModal({ ...fxModal, open: false })}
                stemName={fxModal.stemName}
                onApply={applyFX}
            />

            <MixerModal
                isOpen={mixerOpen}
                onClose={() => setMixerOpen(false)}
                tracks={tracks}
                onVolumeChange={handleVolume}
                onMute={handleMute}
                onSolo={handleSolo}
                onOpenFX={openFX}
            />
        </div>
    );
};

export default StudioView;
