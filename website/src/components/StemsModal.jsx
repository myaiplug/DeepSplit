import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Play, Pause, Music, Archive, Volume2, VolumeX, AlertTriangle, Sparkles, Activity } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

const STEM_META = {
  vocals: { label: 'Vocals', gradient: 'from-pink-500 to-rose-500', wave: '#fb7185' },
  drums: { label: 'Drums', gradient: 'from-orange-500 to-red-500', wave: '#fb923c' },
  bass: { label: 'Bass', gradient: 'from-blue-500 to-cyan-500', wave: '#38bdf8' },
  guitar: { label: 'Guitar', gradient: 'from-green-500 to-emerald-500', wave: '#10b981' },
  piano: { label: 'Piano', gradient: 'from-violet-500 to-purple-500', wave: '#8b5cf6' },
  other: { label: 'Other', gradient: 'from-purple-500 to-indigo-500', wave: '#a855f7' },
  instrumental: { label: 'Instrumental', gradient: 'from-indigo-400 to-blue-500', wave: '#60a5fa' },
};

const normalizeStems = (incoming = [], files = []) => {
  if (incoming.length) {
    return incoming.map((stem, idx) => {
      const meta = STEM_META[stem.key] || STEM_META[stem.type] || {};
      return {
        id: stem.id || `${stem.key}-${idx}`,
        key: stem.key || stem.type || `stem-${idx}`,
        label: stem.label || meta.label || 'Stem',
        url: stem.url,
        gradient: stem.gradient || meta.gradient || 'from-gray-500 to-slate-500',
        wave: stem.wave || meta.wave || '#22d3ee',
        filename: stem.filename || stem.id || stem.key,
      };
    });
  }

  const stems = [];
  files.forEach((file, idx) => {
    const lower = (file.filename || '').toLowerCase();
    if (lower.endsWith('.zip')) return;
    const key = Object.keys(STEM_META).find((k) => lower.includes(k)) || 'other';
    const meta = STEM_META[key] || {};
    stems.push({
      id: file.filename || `stem-${idx}`,
      key,
      label: meta.label || 'Stem',
      url: file.url,
      gradient: meta.gradient || 'from-gray-500 to-slate-500',
      wave: meta.wave || '#22d3ee',
      filename: file.filename,
    });
  });
  return stems;
};

const StemsModal = ({ 
  isOpen, 
  onClose, 
  files = [], 
  stems = [], 
  loading = false, 
  statusText = 'Splitting stems…', 
  error = null, 
  zipUrl, 
  title = 'Your Stems' 
}) => {
  const [activeId, setActiveId] = useState(null);
  const [soloId, setSoloId] = useState(null);
  const [mutedIds, setMutedIds] = useState(new Set());
  const waveRefs = useRef({});
  const waveforms = useRef({});

  const archiveFromFiles = useMemo(() => {
    const zip = files.find((f) => (f.filename || '').toLowerCase().endsWith('.zip'));
    return zip?.url || zipUrl || null;
  }, [files, zipUrl]);

  const resolvedStems = useMemo(() => normalizeStems(stems, files), [stems, files]);

  const cleanup = useCallback(() => {
    Object.values(waveforms.current).forEach((ws) => ws?.destroy());
    waveforms.current = {};
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setActiveId(null);
      setSoloId(null);
      setMutedIds(new Set());
    }
  }, [isOpen, cleanup]);

  useEffect(() => {
    if (!isOpen || loading) return;

    resolvedStems.forEach((stem) => {
      if (waveforms.current[stem.id]) return;
      const container = waveRefs.current[stem.id];
      if (!container) return;

      const ws = WaveSurfer.create({
        container,
        url: stem.url,
        height: 84,
        waveColor: '#475569',
        progressColor: stem.wave || '#22d3ee',
        cursorColor: '#cbd5e1',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        minPxPerSec: 60,
        hideScrollbar: true,
        responsive: true,
        normalize: true,
      });

      ws.on('ready', () => applyVolumes());
      ws.on('finish', () => setActiveId((prev) => (prev === stem.id ? null : prev)));
      waveforms.current[stem.id] = ws;
    });

    return () => cleanup();
  }, [resolvedStems, isOpen, loading, cleanup]);

  const applyVolumes = useCallback(() => {
    const solo = soloId;
    Object.entries(waveforms.current).forEach(([id, ws]) => {
      const isMuted = mutedIds.has(id);
      let vol = isMuted ? 0 : 1;
      if (solo && solo !== id) vol = 0;
      try { ws.setVolume(vol); } catch (_) {}
    });
  }, [mutedIds, soloId]);

  useEffect(() => {
    applyVolumes();
  }, [applyVolumes, resolvedStems.length]);

  const togglePlay = (id) => {
    const target = waveforms.current[id];
    if (!target) return;
    Object.entries(waveforms.current).forEach(([otherId, ws]) => {
      if (otherId !== id) ws.pause();
    });
    target.playPause();
    setActiveId(target.isPlaying() ? id : null);
  };

  const toggleMute = (id) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSolo = (id) => setSoloId((prev) => (prev === id ? null : id));

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
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500">
                <Music className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
                <p className="text-sm text-gray-400 font-medium">
                  {loading ? 'Splitting stems…' : `${resolvedStems.length} high-quality stems ready`}
                </p>
              </div>
            </div>
            <button
              onClick={() => { cleanup(); onClose?.(); }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Activity className="absolute inset-0 m-auto text-cyan-400" size={22} />
                </div>
                <p className="text-lg font-black text-white">{statusText}</p>
                <p className="text-xs text-gray-500 font-semibold">No gatekeeping — we are cooking your stems now.</p>
              </div>
            )}

            {!loading && error && (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 flex items-center gap-3">
                <AlertTriangle size={18} />
                <div>
                  <p className="font-bold text-sm">We hit a snag</p>
                  <p className="text-xs text-red-100/80">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && resolvedStems.length === 0 && (
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-gray-200 text-sm">
                No stems detected yet. If you just finished processing, give it a moment.
              </div>
            )}

            {!loading && !error && resolvedStems.map((stem, index) => (
              <motion.div
                key={stem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="group relative p-5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 hover:border-white/20 transition-all"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stem.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stem.gradient} flex items-center justify-center text-xl shadow-lg text-white`}>
                      {stem.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">{stem.label}</h3>
                      <p className="text-xs text-gray-500 truncate font-medium" title={stem.filename}>
                        {stem.filename}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => toggleSolo(stem.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${soloId === stem.id ? 'bg-purple-500/20 text-purple-200 border-purple-400/40' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                      >
                        Solo
                      </button>
                      <button
                        onClick={() => toggleMute(stem.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${mutedIds.has(stem.id) ? 'bg-gray-700 text-gray-200 border-white/10' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => togglePlay(stem.id)}
                        className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                          activeId === stem.id
                            ? 'bg-gradient-to-br from-cyan-400 to-purple-500 text-white shadow-cyan-500/50'
                            : 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white'
                        }`}
                      >
                        {activeId === stem.id ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <a
                        href={stem.url}
                        download
                        className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors border border-white/10"
                        title="Download stem"
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  </div>

                  <div
                    ref={(el) => { if (el) waveRefs.current[stem.id] = el; }}
                    className="w-full h-20 rounded-xl overflow-hidden bg-[#0f1629] border border-white/5"
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {(archiveFromFiles || zipUrl) && (
            <div className="p-6 border-t border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3 text-white">
                <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0a0f1d]">
                  <Archive size={20} />
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400 font-black tracking-[0.2em]">Bundle</p>
                  <p className="text-sm font-semibold text-white">All stems (.zip)</p>
                </div>
              </div>
              <a
                href={archiveFromFiles || zipUrl}
                download
                className="w-full md:w-auto py-3 px-6 bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 text-white rounded-2xl font-bold text-base shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
                Download All Stems
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StemsModal;
