import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { Volume2, VolumeX, Mic, Move, Trash2, Sliders, Eye, EyeOff } from 'lucide-react';

const TrackRow = ({
    track,
    index,
    onMute,
    onSolo,
    onVolumeChange,
    onRemove,
    onMoveUp,
    onMoveDown,
    onOpenFX,
    onChangeStartTime, // New prop
    isPlaying,
    currentTime,
    audioContext, // Shared context
    pixelsPerSecond = 50
}) => {
    const containerRef = useRef(null);
    const wavesurfer = useRef(null);
    const regions = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [initialStartTime, setInitialStartTime] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize WaveSurfer
        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: track.color || '#555',
            progressColor: track.color ? `${track.color}88` : '#555',
            cursorColor: 'transparent',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 80,
            normalize: true,
            audioContext: audioContext, // Use shared context
            interact: false,
            fillParent: true, // We will control the parent width/offset
            minPxPerSec: pixelsPerSecond,
        });

        // Initialize Regions
        const wsRegions = wavesurfer.current.registerPlugin(RegionsPlugin.create());
        regions.current = wsRegions;

        wsRegions.on('region-created', (region) => {
            // Handle region creation (e.g. for cutting/muting)
            region.color = 'rgba(255, 0, 0, 0.3)';
        });

        wsRegions.on('region-clicked', (region, e) => {
            e.stopPropagation();
            if (confirm("Remove this section (Mute)?")) {
                region.setOptions({ color: 'rgba(0, 0, 0, 0.8)' });
                // Logic to actually mute during playback would go here in the engine
            }
        });

        // Load audio
        if (track.src) {
            wavesurfer.current.load(track.src);
        }

        wavesurfer.current.on('ready', () => {
            wavesurfer.current.setVolume(track.muted ? 0 : track.volume);
        });

        return () => {
            if (wavesurfer.current) wavesurfer.current.destroy();
        };
    }, [track.src, track.color, pixelsPerSecond]);

    // Update Volume/Mute
    useEffect(() => {
        if (!wavesurfer.current) return;
        wavesurfer.current.setVolume(track.muted ? 0 : track.volume);
    }, [track.volume, track.muted]);

    // Sync Playback Position (Global Transport)
    useEffect(() => {
        if (!wavesurfer.current) return;

        const relativeTime = currentTime - track.startTime;
        const duration = wavesurfer.current.getDuration();
        const inRange = relativeTime >= 0 && relativeTime < duration;

        if (isPlaying) {
            if (inRange) {
                if (!wavesurfer.current.isPlaying()) {
                    wavesurfer.current.setTime(relativeTime);
                    wavesurfer.current.play();
                } else {
                    // Drift check: if we are off by more than 50ms, jump to correct time
                    const wsTime = wavesurfer.current.getCurrentTime();
                    if (Math.abs(wsTime - relativeTime) > 0.05) {
                        wavesurfer.current.setTime(relativeTime);
                    }
                }
            } else {
                if (wavesurfer.current.isPlaying()) wavesurfer.current.pause();
            }
        } else {
            if (wavesurfer.current.isPlaying()) wavesurfer.current.pause();
            if (inRange) {
                // Seek to show position on waveform while paused
                wavesurfer.current.setTime(relativeTime);
            } else if (relativeTime < 0) {
                wavesurfer.current.setTime(0);
            } else {
                wavesurfer.current.setTime(duration);
            }
        }
    }, [isPlaying, currentTime, track.startTime]);


    // Sliding Handlers
    const handleMouseDown = (e) => {
        if (e.target.className.includes('wave')) return; // Avoid conflict with region creation if needed
        setIsDragging(true);
        setDragStartX(e.clientX);
        setInitialStartTime(track.startTime);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStartX;
        const deltaSeconds = deltaX / pixelsPerSecond;
        const newTime = Math.max(0, initialStartTime + deltaSeconds);
        onChangeStartTime(track.id, newTime);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Global mouse up to catch drops outside
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove);
        } else {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        }
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
        }
    }, [isDragging, dragStartX, initialStartTime, pixelsPerSecond, onChangeStartTime, track.id]);


    return (
        <div
            className="flex h-24 bg-[#111] border-b border-gray-800 hover:bg-[#161616] transition-colors group relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Track Header (Controls) */}
            <div className="w-64 bg-[#1a1a1a] border-r border-gray-800 p-2 flex flex-col justify-between shrink-0 z-20">
                <div className="flex justify-between items-center">
                    <input
                        type="text"
                        defaultValue={track.name}
                        className="bg-transparent text-white font-bold text-sm w-32 focus:outline-none focus:border-b border-purple-500 truncate"
                    />
                    <div className="flex gap-1">
                        <button onClick={() => onOpenFX(track.id)} className="p-1 hover:text-purple-400" title="FX Chain">
                            <Sliders className="w-3 h-3" />
                        </button>
                        <button onClick={() => onRemove(track.id)} className="p-1 hover:text-red-500" title="Remove Track">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mute/Solo */}
                    <button
                        onClick={() => onMute(track.id)}
                        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${track.muted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                    >
                        M
                    </button>
                    <button
                        onClick={() => onSolo(track.id)}
                        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${track.soloed ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}
                    >
                        S
                    </button>

                    {/* Volume Slider */}
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={track.volume}
                        onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
                        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
            </div>

            {/* Timeline Area (Droppable/Scrollable) */}
            <div className="relative flex-1 bg-[#0a0a0a] overflow-hidden" onMouseDown={handleMouseDown}>
                {/* Visual Grid Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{ backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px)', backgroundSize: `${pixelsPerSecond}px 100%` }}
                />

                {/* Draggable Waveform Container */}
                <div
                    ref={containerRef}
                    className="absolute top-2 bottom-2 rounded-md overflow-hidden cursor-move hover:ring-1 ring-white/20 transition-shadow"
                    style={{
                        left: `${track.startTime * pixelsPerSecond}px`,
                        width: '1000px', // Fixed width for now, ideally duration * pixelsPerSecond
                        // Creating a transform for smoother dragging?
                        // transform: `translateX(${track.startTime * pixelsPerSecond}px)`
                        // Using left is easier for initial layout but transforms are performant.
                    }}
                />
            </div>
        </div>
    );
};

export default TrackRow;
