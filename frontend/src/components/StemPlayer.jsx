import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Volume2, VolumeX, Sliders, Download } from 'lucide-react';

const StemPlayer = ({
    src,
    name,
    color = '#a855f7',
    mainVolume,
    isPlaying,
    onSolo,
    onMute,
    onFX,
    isSoloed,
    isMuted,
    anysoloed,
    downloadUrl,
}) => {
    const containerRef = useRef(null);
    const wavesurfer = useRef(null);
    const [localVolume, setLocalVolume] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4b5563',
            progressColor: color,
            cursorColor: color,
            barWidth: 2,
            barGap: 3,
            barRadius: 3,
            height: 64,
            responsive: true,
            normalize: true,
            backend: 'WebAudio',
        });

        wavesurfer.current.load(src);
        wavesurfer.current.on('ready', () => setLoading(false));

        return () => { wavesurfer.current.destroy(); };
    }, [src, color]);

    useEffect(() => {
        if (!wavesurfer.current) return;
        isPlaying ? wavesurfer.current.play() : wavesurfer.current.pause();
    }, [isPlaying]);

    // Effective volume: muted = 0, solo-inactive = 0, otherwise = localVolume * mainVolume
    useEffect(() => {
        if (!wavesurfer.current) return;
        let vol = localVolume * mainVolume;
        if (isMuted) vol = 0;
        else if (anysoloed && !isSoloed) vol = 0;
        wavesurfer.current.setVolume(Math.max(0, Math.min(1, vol)));
    }, [localVolume, mainVolume, isMuted, isSoloed, anysoloed]);

    // Derive visual "silenced" state for the row
    const silenced = isMuted || (anysoloed && !isSoloed);

    return (
        <div
            className={`backdrop-blur-md border rounded-xl p-4 mb-3 transition-all
                ${silenced
                    ? 'bg-black/20 border-white/5 opacity-50'
                    : 'bg-black/40 border-white/10 hover:bg-white/5'
                }`}
        >
            {/* Header row */}
            <div className="flex items-center gap-3 mb-2">
                {/* Color dot */}
                <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
                />

                <span className="font-bold text-sm uppercase tracking-wider text-gray-300 flex-1">{name}</span>

                {/* Volume slider */}
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={localVolume}
                    onChange={e => setLocalVolume(Number(e.target.value))}
                    className="w-20 accent-purple-500 cursor-pointer"
                    title="Volume"
                />

                {/* Volume icon */}
                <button
                    onClick={() => setLocalVolume(v => v > 0 ? 0 : 1)}
                    className="text-gray-500 hover:text-white transition-colors"
                    title="Toggle volume"
                >
                    {localVolume === 0 || isMuted
                        ? <VolumeX className="w-4 h-4 text-red-400" />
                        : <Volume2 className="w-4 h-4" />
                    }
                </button>

                {/* FX button */}
                <button
                    onClick={onFX}
                    className="px-2 py-1 text-xs rounded border border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:text-white transition-colors flex items-center gap-1"
                    title="Add FX"
                >
                    <Sliders className="w-3 h-3" />
                    FX
                </button>

                {/* Download button */}
                {downloadUrl && (
                    <a
                        href={downloadUrl}
                        download
                        className="px-2 py-1 text-xs rounded border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-white transition-colors flex items-center gap-1"
                        title={`Download ${name}`}
                    >
                        <Download className="w-3 h-3" />
                    </a>
                )}

                {/* SOLO */}
                <button
                    onClick={onSolo}
                    className={`w-7 h-7 text-xs rounded border font-bold transition-all ${
                        isSoloed
                            ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/30'
                            : 'text-gray-500 border-gray-700 hover:border-yellow-400 hover:text-yellow-400'
                    }`}
                    title="Solo"
                >
                    S
                </button>

                {/* MUTE */}
                <button
                    onClick={onMute}
                    className={`w-7 h-7 text-xs rounded border font-bold transition-all ${
                        isMuted
                            ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30'
                            : 'text-gray-500 border-gray-700 hover:border-red-500 hover:text-red-400'
                    }`}
                    title="Mute"
                >
                    M
                </button>
            </div>

            {/* Waveform */}
            <div className="relative h-16 w-full" ref={containerRef}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 animate-pulse">
                        Loading waveform...
                    </div>
                )}
            </div>
        </div>
    );
};

export default StemPlayer;
