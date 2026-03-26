import React, { useState, useEffect } from 'react';
import { X, Sliders, Activity } from 'lucide-react';

const MixerModal = ({ isOpen, onClose, tracks, onVolumeChange, onMute, onSolo, onOpenFX }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-[#111] w-[90vw] h-[80vh] rounded-2xl border border-gray-800 flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="h-16 border-b border-gray-800 flex justify-between items-center px-6 bg-[#161616]">
                    <div className="flex items-center gap-3">
                        <Activity className="text-purple-500" />
                        <h2 className="text-xl font-bold text-white">Mixing Console</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Mixer Channels */}
                <div className="flex-1 overflow-x-auto p-6 flex gap-4">
                    {tracks.map((track, i) => (
                        <div key={track.id} className="w-32 bg-[#1a1a1a] border border-gray-800 rounded-xl flex flex-col p-4 relative group shrink-0">
                            {/* Track Name */}
                            <div className="text-center mb-4 truncate font-bold text-sm text-gray-300" title={track.name}>
                                {track.name}
                            </div>

                            {/* FX Slots (Integrated Pedalboard FX) */}
                            <div className="flex-1 bg-[#111] rounded mb-4 border border-gray-900 p-2 space-y-1 overflow-y-auto">
                                <p className="text-[10px] text-gray-600 font-mono text-center mb-1">INSERTS</p>
                                {Array.from({ length: 6 }).map((_, fxIdx) => (
                                    <button
                                        key={fxIdx}
                                        onClick={() => onOpenFX(track.id)} // For now re-use FX modal
                                        className="w-full h-6 bg-[#222] hover:bg-[#333] border border-gray-800 rounded text-[10px] text-gray-500 flex items-center justify-center truncate"
                                    >
                                        Empty
                                    </button>
                                ))}
                            </div>

                            {/* Meter Bridge (Visual) */}
                            <div className="h-32 bg-[#0a0a0a] rounded mx-auto w-4 relative overflow-hidden mb-4 border border-gray-800">
                                {/* Fake meter bouncing for UI demo - would need real analyser node */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 opacity-80 transition-all duration-75"
                                    style={{
                                        height: track.muted ? '0%' : `${Math.random() * (track.volume * 100)}%`
                                    }}
                                />
                            </div>

                            {/* Fader Area */}
                            <div className="flex flex-col items-center gap-3">
                                {/* Mute/Solo */}
                                <div className="flex gap-2 w-full justify-center">
                                    <button
                                        onClick={() => onMute(track.id)}
                                        className={`w-8 h-8 rounded font-bold text-xs ${track.muted ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        M
                                    </button>
                                    <button
                                        onClick={() => onSolo(track.id)}
                                        className={`w-8 h-8 rounded font-bold text-xs ${track.soloed ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        S
                                    </button>
                                </div>

                                {/* Volume Fader (Vertical) */}
                                <input
                                    type="range"
                                    min="0"
                                    max="1.2"
                                    step="0.01"
                                    value={track.volume}
                                    onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
                                    className="h-32 w-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500 -rotate-180"
                                    style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
                                />

                                <span className="text-xs font-mono text-gray-500">{(track.volume * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    ))}

                    {/* Master Channel (Right side) */}
                    <div className="w-32 bg-[#222] border-l border-gray-700 rounded-xl flex flex-col p-4 shadow-xl ml-4">
                        <div className="text-center mb-4 font-bold text-purple-400">MASTER</div>
                        <div className="flex-1 bg-[#111] rounded mb-4 flex justify-center p-2 gap-1 border border-gray-800">
                            {/* L/R Meters */}
                            <div className="w-3 bg-gradient-to-t from-green-600 via-yellow-500 to-red-600 h-full rounded-sm opacity-50" />
                            <div className="w-3 bg-gradient-to-t from-green-600 via-yellow-500 to-red-600 h-full rounded-sm opacity-50" />
                        </div>
                        <input
                            type="range"
                            className="h-32 w-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-red-500 self-center"
                            style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
                            defaultValue={1}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MixerModal;
