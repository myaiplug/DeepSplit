import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Play, Pause, Music, Archive, Volume2, VolumeX } from 'lucide-react';

const StemsModal = ({ isOpen, onClose, files, fileId }) => {
  const [playingStems, setPlayingStems] = useState({});
  const [volumes, setVolumes] = useState({});
  const audioRefs = useRef({});

  // Identify stem type from filename
  const getStemInfo = (filename) => {
    const lower = filename.toLowerCase();

    if (lower.includes('vocal')) {
      return { type: 'vocals', label: 'Vocals', color: 'from-pink-500 to-rose-500', icon: '🎤' };
    } else if (lower.includes('drum')) {
      return { type: 'drums', label: 'Drums', color: 'from-orange-500 to-red-500', icon: '🥁' };
    } else if (lower.includes('bass')) {
      return { type: 'bass', label: 'Bass', color: 'from-purple-500 to-indigo-500', icon: '🎸' };
    } else if (lower.includes('guitar')) {
      return { type: 'guitar', label: 'Guitar', color: 'from-yellow-500 to-amber-500', icon: '🎸' };
    } else if (lower.includes('piano')) {
      return { type: 'piano', label: 'Piano', color: 'from-blue-500 to-cyan-500', icon: '🎹' };
    } else if (lower.includes('other')) {
      return { type: 'other', label: 'Other', color: 'from-green-500 to-emerald-500', icon: '🎵' };
    } else if (lower.includes('kick')) {
      return { type: 'kick', label: 'Kick Drum', color: 'from-red-600 to-orange-600', icon: '🥁' };
    } else if (lower.includes('snare')) {
      return { type: 'snare', label: 'Snare', color: 'from-amber-600 to-yellow-600', icon: '🥁' };
    } else if (lower.includes('hihat') || lower.includes('hi-hat')) {
      return { type: 'hihat', label: 'Hi-Hat', color: 'from-cyan-600 to-blue-600', icon: '🥁' };
    } else if (lower.includes('overhead')) {
      return { type: 'overhead', label: 'Overhead', color: 'from-indigo-600 to-purple-600', icon: '🥁' };
    } else if (lower.includes('room')) {
      return { type: 'room', label: 'Room', color: 'from-gray-600 to-slate-600', icon: '🥁' };
    } else if (lower.includes('instrumental')) {
      return { type: 'instrumental', label: 'Instrumental', color: 'from-teal-500 to-green-500', icon: '🎼' };
    }

    return { type: 'unknown', label: 'Track', color: 'from-gray-500 to-slate-500', icon: '🎵' };
  };

  // Separate stems from archive
  const stems = files.filter(f => !f.filename.toLowerCase().endsWith('.zip'));
  const zipFile = files.find(f => f.filename.toLowerCase().endsWith('.zip'));

  // Initialize audio refs and volumes
  useEffect(() => {
    stems.forEach(stem => {
      if (!volumes[stem.filename]) {
        setVolumes(prev => ({ ...prev, [stem.filename]: 1.0 }));
      }
    });
  }, [stems]);

  const togglePlay = (stem) => {
    const audio = audioRefs.current[stem.filename];
    if (!audio) return;

    const isPlaying = playingStems[stem.filename];

    if (isPlaying) {
      audio.pause();
      setPlayingStems(prev => ({ ...prev, [stem.filename]: false }));
    } else {
      audio.play();
      setPlayingStems(prev => ({ ...prev, [stem.filename]: true }));
    }
  };

  const handleVolumeChange = (filename, newVolume) => {
    const audio = audioRefs.current[filename];
    if (audio) {
      audio.volume = newVolume;
      setVolumes(prev => ({ ...prev, [filename]: newVolume }));
    }
  };

  const toggleMute = (filename) => {
    const currentVolume = volumes[filename];
    const newVolume = currentVolume > 0 ? 0 : 1.0;
    handleVolumeChange(filename, newVolume);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-4xl max-h-[90vh] bg-[#0a0f1d] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500">
                <Music className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Your Stems Are Ready</h2>
                <p className="text-sm text-gray-400 font-medium">{stems.length} high-quality stems separated</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Stems List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {stems.map((stem, index) => {
              const stemInfo = getStemInfo(stem.filename);
              const isPlaying = playingStems[stem.filename];
              const volume = volumes[stem.filename] || 1.0;
              const isMuted = volume === 0;

              return (
                <motion.div
                  key={stem.filename}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 hover:border-white/20 transition-all"
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stemInfo.color} opacity-0 group-hover:opacity-5 transition-opacity`} />

                  <div className="relative flex items-center gap-4">
                    {/* Stem Icon & Label */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stemInfo.color} flex items-center justify-center text-2xl shadow-lg`}>
                        {stemInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{stemInfo.label}</h3>
                        <p className="text-xs text-gray-500 truncate font-medium" title={stem.filename}>
                          {stem.filename}
                        </p>
                      </div>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex items-center gap-3">
                      {/* Volume Control */}
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                        <button
                          onClick={() => toggleMute(stem.filename)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={(e) => handleVolumeChange(stem.filename, parseFloat(e.target.value))}
                          className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
                        />
                      </div>

                      {/* Play/Pause Button */}
                      <button
                        onClick={() => togglePlay(stem)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                          isPlaying
                            ? 'bg-gradient-to-br from-cyan-400 to-purple-500 text-white shadow-cyan-500/50'
                            : 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white'
                        }`}
                      >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                      </button>

                      {/* Download Button */}
                      <a
                        href={stem.url}
                        download
                        className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <Download size={20} />
                      </a>
                    </div>
                  </div>

                  {/* Hidden Audio Element */}
                  <audio
                    ref={el => audioRefs.current[stem.filename] = el}
                    src={stem.url}
                    onEnded={() => setPlayingStems(prev => ({ ...prev, [stem.filename]: false }))}
                    preload="metadata"
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Footer with Download All */}
          {zipFile && (
            <div className="p-6 border-t border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent">
              <a
                href={zipFile.url}
                download
                className="w-full py-4 px-6 bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 text-white rounded-2xl font-bold text-lg shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <Archive size={24} className="group-hover:scale-110 transition-transform" />
                Download All Stems (.zip)
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StemsModal;
