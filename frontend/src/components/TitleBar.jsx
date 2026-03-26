import React from 'react';
import { X, Minus, Square } from 'lucide-react';

const TitleBar = () => {
    const isElectron = window.electronAPI?.isElectron;

    const handleAction = (action) => {
        if (isElectron) {
            window.electronAPI.windowControl(action);
        }
    };

    return (
        <div 
            className="h-10 bg-[#0a0a0a] flex items-center justify-between px-4 select-none shrink-0 border-b border-white/5"
            style={{ WebkitAppRegion: 'drag' }}
        >
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center text-[10px] font-bold text-white">
                    SS
                </div>
                <span className="text-xs font-bold text-white/60 tracking-tight">StemSplit <span className="text-purple-500/80">Desktop</span> <span className="text-[9px] opacity-40 ml-1">NoDAW Studio</span></span>
            </div>

            {isElectron && (
                <div className="flex items-center no-drag" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button 
                        onClick={() => handleAction('minimize')}
                        className="p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleAction('maximize')}
                        className="p-2 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <Square className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => handleAction('close')}
                        className="p-2 hover:bg-red-500 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default TitleBar;
