import React, { useState } from 'react';
import { motion } from 'framer-motion';

const GENRES = [
  { id: 'pop', name: 'Synthetic Pop', tag: 'GENRE: POP', desc: 'Crystal clear vocal isolation with zero bleed from heavy 808s.', image: 'https://github.com/myaiplug/DeepSplit/blob/main/website/public/images/genres/country.png?raw=true' },
  { id: 'rock', name: 'Classic Rock', tag: 'GENRE: ROCK', desc: 'Separates the guitar solo without losing the snare punch.', image: 'https://github.com/myaiplug/DeepSplit/blob/main/website/public/images/genres/rock.png?raw=true' },
  { id: 'rap', name: 'Heavy Hip-Hop', tag: 'GENRE: RAP', desc: 'Extracts the melody loop perfectly from aggressive hi-hats.', image: 'https://github.com/myaiplug/DeepSplit/blob/main/website/public/images/genres/pop.png?raw=true' },
];

const GenreBenchmarks = () => {
  const [playing, setPlaying] = useState(null);

  return (
    <section id="demos" className="py-24 bg-[#0a0f1d]">
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <p className="text-cyan-400 text-xs font-black tracking-[0.3em] uppercase mb-4">Real-World Benchmarks</p>
        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter text-white">The Gold Standard<br/>Across Every Genre.</h2>
        <p className="max-w-xl text-gray-400 text-lg mb-16 font-medium">Don't take our word for it. Hear how our hybrid engine handles everything from distorted Metal to complex Jazz harmony.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GENRES.map((genre) => (
            <motion.div
              key={genre.id}
              whileHover="hover"
              initial="initial"
              className="group relative overflow-hidden rounded-3xl border border-white/5 p-8 transition-all duration-500 hover:border-cyan-500/30 backdrop-blur-sm min-h-[400px] flex flex-col justify-end"
            >
              {/* Background Image with Parallax/Scale Effect */}
              <motion.div
                variants={{
                  initial: { scale: 1, y: 0 },
                  hover: { scale: 1.15, y: -10 }
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute inset-0 z-0"
              >
                <img 
                  src={genre.image} 
                  alt={genre.name} 
                  className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-700"
                />
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/60 to-transparent" />
              </motion.div>

              {/* Content */}
              <div className="relative z-10">
                <div className="absolute top-[-100px] left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="font-mono text-[10px] text-cyan-400/60 uppercase tracking-widest">{genre.tag}</span>
                <h3 className="text-2xl font-black mt-2 mb-4 group-hover:text-white transition-colors uppercase italic tracking-tighter text-white">{genre.name}</h3>
                <p className="text-sm text-gray-300 mb-8 leading-relaxed font-medium line-clamp-2">{genre.desc}</p>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setPlaying(genre.id + '-full')}
                    className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${playing === genre.id + '-full' ? 'bg-white text-[#0a0f1d]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${playing === genre.id + '-full' ? 'bg-[#0a0f1d] animate-pulse' : 'bg-gray-600'}`} />
                    Full Mix
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    {['Vocals', 'Drums', 'Bass', 'Piano', 'Guitar', 'Other'].map(stem => (
                      <button
                        key={stem}
                        onClick={() => setPlaying(`${genre.id}-${stem.toLowerCase()}`)}
                        className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center transition-all duration-300 ${playing === `${genre.id}-${stem.toLowerCase()}` ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}
                      >
                        {stem}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`flex items-center gap-1 mt-6 transition-opacity duration-300 ${playing?.startsWith(genre.id) ? 'opacity-100' : 'opacity-20'}`}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex-1 h-1 bg-cyan-500/10 rounded-full overflow-hidden">
                      {playing?.startsWith(genre.id) && (
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GenreBenchmarks;
