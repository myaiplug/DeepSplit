import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Play, Pause, Scissors, Check } from 'lucide-react';

const toMMSS = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const WaveformSelector = ({ url, onConfirmSelection }) => {
    const containerRef = useRef(null);
    const wavesurfer = useRef(null);
    const regions = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [looping, setLooping] = useState(false);
    const loopRef = useRef(false);
    const selectionRef = useRef({ start: 0, end: 0 });

    // Store start/end in seconds
    const [selection, setSelection] = useState({ start: 0, end: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4b5563',
            progressColor: '#a855f7',
            cursorColor: '#ffffff',
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            height: 128,
            responsive: true,
            normalize: true,
            media: audio, // Use MediaElement for playback
            url: url,   // Use URL for waveform rendering
        });

        // Initialize Regions Plugin
        const wsRegions = wavesurfer.current.registerPlugin(RegionsPlugin.create());
        regions.current = wsRegions;

        wavesurfer.current.on('ready', () => {
            setIsReady(true);
            // wavesurfer.current.setVolume(1.0); // Not strictly needed for MediaElement but fine to keep
            const duration = wavesurfer.current.getDuration();
            setSelection({ start: 0, end: duration });

            // Create initial region covering whole track
            wsRegions.addRegion({
                start: 0,
                end: duration,
                color: 'rgba(168, 85, 247, 0.3)',
                drag: true,
                resize: true,
            });
        });

        wsRegions.on('region-updated', (region) => {
            const s = { start: region.start, end: region.end };
            setSelection(s);
            selectionRef.current = s;
        });

        wavesurfer.current.on('play', () => setIsPlaying(true));
        wavesurfer.current.on('pause', () => setIsPlaying(false));
        wavesurfer.current.on('finish', () => {
            if (loopRef.current) {
                const { start, end } = selectionRef.current;
                wavesurfer.current.setTime(start);
                wavesurfer.current.play();
                setTimeout(() => {
                    const checkStop = () => {
                        if (wavesurfer.current && wavesurfer.current.getCurrentTime() >= end - 0.05) {
                            if (loopRef.current) {
                                wavesurfer.current.setTime(selectionRef.current.start);
                            }
                        }
                    };
                }, 50);
            }
        });

        return () => {
            wavesurfer.current.destroy();
        };
    }, [url]);

    const togglePlay = () => {
        if (!wavesurfer.current) return;
        if (!isPlaying) {
            // Start from selection start
            wavesurfer.current.setTime(selection.start);
        }
        wavesurfer.current.setVolume(1.0);
        wavesurfer.current.playPause();
    };

    const toggleLoop = () => {
        const next = !looping;
        setLooping(next);
        loopRef.current = next;
        if (next && !isPlaying && wavesurfer.current) {
            wavesurfer.current.setTime(selection.start);
            wavesurfer.current.play();
        }
    };

    const handleConfirm = () => {
        // Convert to milliseconds for backend
        onConfirmSelection({
            start_ms: Math.floor(selection.start * 1000),
            end_ms: Math.floor(selection.end * 1000)
        });
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-[#111] rounded-3xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-purple-500" />
                    Select Region to Process
                </h3>
                <div className="text-sm font-mono text-gray-400 tabular-nums">
                    {toMMSS(selection.start)} – {toMMSS(selection.end)}
                    <span className="ml-2 text-gray-600 text-xs">
                        ({Math.max(0, selection.end - selection.start).toFixed(1)}s)
                    </span>
                </div>
            </div>

            <div className="relative mb-6 bg-black/50 rounded-xl overflow-hidden border border-white/5" ref={containerRef}>
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-purple-400 animate-pulse">
                        Loading Waveform...
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-4">
                <button
                    onClick={togglePlay}
                    className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors flex items-center gap-2"
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isPlaying ? 'Pause' : 'Preview'}
                </button>

                <button
                    onClick={toggleLoop}
                    className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${
                        looping
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    title="Loop selected region"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    Loop
                </button>

                <button
                    onClick={handleConfirm}
                    className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg shadow-purple-500/20 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                    <Check className="w-5 h-5" />
                    Confirm & Split
                </button>
            </div>
        </div>
    );
};

export default WaveformSelector;
