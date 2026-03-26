import React from 'react';
import { motion } from 'framer-motion';

const MODES = [
    {
        id: 2,
        label: '2 Stem',
        icon: '🎤',
        description: 'Vocals · Instrumental',
        detail: 'Fastest — perfect for karaoke or simple remixes.',
        cpuTime: '~1–2 min',
        gpuTime: '~10 sec',
        gradient: 'from-blue-500/20 to-cyan-500/20',
        border: 'border-blue-500/40',
        glow: 'shadow-blue-500/20',
    },
    {
        id: 4,
        label: '4 Stem',
        icon: '🥁',
        description: 'Vocals · Drums · Bass · Other',
        detail: 'Standard separation. Great for production and remixing.',
        cpuTime: '~3–5 min',
        gpuTime: '~30 sec',
        gradient: 'from-purple-500/20 to-blue-500/20',
        border: 'border-purple-500/40',
        glow: 'shadow-purple-500/20',
    },
    {
        id: 5,
        label: '5 Stem',
        icon: '🎸',
        description: 'Vocals · Drums · Bass · Guitar · Other',
        detail: 'Includes guitar isolation for band arrangements.',
        cpuTime: '~5–7 min',
        gpuTime: '~45 sec',
        gradient: 'from-orange-500/20 to-red-500/20',
        border: 'border-orange-500/40',
        glow: 'shadow-orange-500/20',
    },
    {
        id: 6,
        label: '6 Stem',
        icon: '🎹',
        description: 'Vocals · Drums · Bass · Guitar · Piano · Other',
        detail: 'Full separation for complex arrangements.',
        cpuTime: '~6–8 min',
        gpuTime: '~1 min',
        gradient: 'from-pink-500/20 to-purple-500/20',
        border: 'border-pink-500/40',
        glow: 'shadow-pink-500/20',
        recommended: true,
    },
    {
        id: 7,
        label: '6 Stem + DrumSep',
        icon: '🎺',
        description: 'Kicks · Snare · Hi-Hat · Overhead · Room + 5 others',
        detail: 'Maximum detail — drums split into individual hits.',
        cpuTime: '~10–15 min',
        gpuTime: '~2 min',
        gradient: 'from-yellow-500/20 to-orange-500/20',
        border: 'border-yellow-500/40',
        glow: 'shadow-yellow-500/20',
        disabled: true,
        tooltip: 'Coming Soon',
    },
];

const StemModeSelector = ({ selected, onSelect, deviceInfo }) => {
    const isGpu = deviceInfo?.device === 'cuda';

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-8">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Choose Separation Mode
                </h2>
                <p className="text-gray-400">
                    {isGpu
                        ? `Running on GPU · ${deviceInfo.gpu_name} · ${deviceInfo.vram_gb}GB VRAM — times are fast estimates`
                        : 'Running on CPU — separation times are approximate'}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODES.map((mode) => {
                    const isSelected = selected === mode.id;
                    return (
                        <motion.button
                            key={mode.id}
                            onClick={() => !mode.disabled && onSelect(mode.id)}
                            disabled={mode.disabled}
                            title={mode.tooltip || ''}
                            className={`relative text-left p-5 rounded-2xl border transition-all duration-200
                                ${mode.disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                                bg-gradient-to-br ${mode.gradient}
                                ${isSelected
                                    ? `${mode.border} shadow-xl ${mode.glow} scale-[1.02]`
                                    : 'border-white/10 hover:border-white/20 hover:scale-[1.01]'
                                }`}
                            whileTap={mode.disabled ? {} : { scale: 0.98 }}
                        >
                            {mode.recommended && (
                                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                    RECOMMENDED
                                </span>
                            )}
                            {mode.disabled && (
                                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                                    COMING SOON
                                </span>
                            )}

                            <div className="text-3xl mb-3">{mode.icon}</div>
                            <div className="flex items-baseline gap-2 mb-1">
                                <h3 className="text-lg font-bold text-white">{mode.label}</h3>
                                {isSelected && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2 h-2 rounded-full bg-green-400"
                                    />
                                )}
                            </div>
                            <p className="text-sm text-gray-300 font-mono mb-2">{mode.description}</p>
                            <p className="text-xs text-gray-500">{mode.detail}</p>

                            <div className="mt-4 pt-4 border-t border-white/10 flex gap-4 text-xs">
                                <div>
                                    <span className="text-gray-600">CPU </span>
                                    <span className="text-gray-400 font-mono">{mode.cpuTime}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">GPU </span>
                                    <span className={`font-mono ${isGpu ? 'text-green-400' : 'text-gray-500'}`}>
                                        {mode.gpuTime}
                                    </span>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default StemModeSelector;
