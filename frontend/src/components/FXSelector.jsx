import React, { useState, useEffect, useRef } from 'react';
import { X, Sliders, Layers, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FXSelector = ({ stemName, isOpen, onClose, onApply, fileId }) => {
    const [presets, setPresets] = useState([]);
    const [selectedPreset, setSelectedPreset] = useState("");
    const [passes, setPasses] = useState(1);
    const [mix, setMix] = useState(100); // percentage 0-100
    const [loading, setLoading] = useState(false);
    const [prevLoading, setPrevLoading] = useState(false);
    const [previewSrc, setPreviewSrc] = useState(null);
    const audioRef = useRef(null);

    // Initial Fetch
    useEffect(() => {
        if (isOpen && stemName) {
            setLoading(true);
            setPreviewSrc(null);
            fetch(`http://localhost:8000/presets/${stemName}`)
                .then(res => res.json())
                .then(data => {
                    setPresets(data);
                    if (data.length > 0) setSelectedPreset(data[0].id);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load presets", err);
                    setLoading(false);
                });
        }
    }, [isOpen, stemName]);

    // Cleanup audio on close
    useEffect(() => {
        if (!isOpen && audioRef.current) {
            audioRef.current.pause();
            setPreviewSrc(null);
        }
    }, [isOpen]);

    const handleApply = () => {
        if (selectedPreset) {
            onApply(stemName, selectedPreset, passes, mix / 100, false);
            onClose();
        }
    };

    const handlePreview = async () => {
        if (!selectedPreset || !fileId) return;
        setPrevLoading(true);
        setPreviewSrc(null);
        try {
            const res = await fetch('http://localhost:8000/process_fx/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: fileId,
                    stem_name: stemName,
                    preset_id: selectedPreset,
                    passes,
                    mix: mix / 100,
                    preview: true,
                }),
            });
            if (!res.ok) throw new Error('Preview request failed');
            const data = await res.json();
            const taskKey = data.task_key;

            // Poll until done
            const interval = setInterval(async () => {
                try {
                    const pr = await fetch(`http://localhost:8000/fx_progress/${taskKey}`);
                    const pd = await pr.json();
                    if (pd.progress >= 100) {
                        clearInterval(interval);
                        setPrevLoading(false);
                        // Build URL: the task key encodes file info; derive path from stem name
                        const previewUrl = `http://localhost:8000/processed/${fileId}/${stemName.toLowerCase()}_preview.mp3?t=${Date.now()}`;
                        setPreviewSrc(previewUrl);
                    } else if (pd.progress === -1) {
                        clearInterval(interval);
                        setPrevLoading(false);
                        alert('Preview generation failed.');
                    }
                } catch (e) { clearInterval(interval); setPrevLoading(false); }
            }, 600);
        } catch (e) {
            console.error(e);
            setPrevLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sliders className="w-5 h-5 text-purple-500" />
                            FX Processor
                        </h3>
                        <p className="text-gray-400 text-sm">Enhance <span className="text-purple-400 font-mono">{stemName}</span> stem</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Preset Selection */}
                    <div>
                        <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Select Preset</label>
                        {loading ? (
                            <div className="animate-pulse h-10 bg-gray-800 rounded"></div>
                        ) : (
                            <select
                                value={selectedPreset}
                                onChange={(e) => { setSelectedPreset(e.target.value); setPreviewSrc(null); }}
                                className="w-full bg-[#1a1a1a] text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors appearance-none"
                            >
                                {presets.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                                {presets.length === 0 && <option>No presets available</option>}
                            </select>
                        )}
                    </div>

                    {/* Passes Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-gray-400 text-xs uppercase tracking-wider flex items-center gap-2">
                                <Layers className="w-3 h-3" />
                                Processing Passes
                            </label>
                            <span className="text-purple-400 font-bold font-mono">{passes}x</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            {[1, 2, 4, 6, 8, 10].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setPasses(num)}
                                    className={`flex-1 py-2 text-sm rounded transition-all ${passes === num
                                        ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-900/50'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">More passes = stronger effect intensity.</p>
                    </div>

                    {/* Dry / Wet Mix */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-gray-400 text-xs uppercase tracking-wider">Dry / Wet Mix</label>
                            <span className="text-purple-400 font-bold font-mono">{mix}%</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={mix}
                            onChange={e => { setMix(Number(e.target.value)); setPreviewSrc(null); }}
                            className="w-full accent-purple-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>Dry (original)</span>
                            <span>Wet (full FX)</span>
                        </div>
                    </div>

                    {/* A/B Preview */}
                    <div>
                        <button
                            onClick={handlePreview}
                            disabled={prevLoading || loading || presets.length === 0}
                            className="w-full flex items-center justify-center gap-2 border border-purple-500/50 text-purple-400 hover:bg-purple-600/20 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {prevLoading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating preview…</>
                                : <><Play className="w-4 h-4" /> A/B Preview (5s)</>
                            }
                        </button>
                        {previewSrc && (
                            <audio
                                ref={audioRef}
                                src={previewSrc}
                                controls
                                autoPlay
                                className="w-full mt-3 rounded-lg"
                                style={{ filter: 'invert(0.85) hue-rotate(200deg)' }}
                            />
                        )}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleApply}
                        disabled={loading || presets.length === 0}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        APPLY EFFECTS
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default FXSelector;
