import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, Download, Music, Shield, Zap, Globe, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const isValidVideoId = (value) => /^[\w-]{11}$/.test(value || '');

const extractVideoId = (input) => {
  if (!input) return null;
  const value = input.trim();

  if (isValidVideoId(value)) return value;

  try {
    const hasScheme = value.startsWith('http://') || value.startsWith('https://');
    if (!hasScheme && !/^((www|m|music)\.)?(youtube\.com|youtu\.be)(\/|$)/i.test(value)) {
      return null;
    }

    const maybeUrl = hasScheme ? value : `https://${value}`;
    const parsed = new URL(maybeUrl);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0] || null;
      return isValidVideoId(id) ? id : null;
    }

    if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        return isValidVideoId(id) ? id : null;
      }

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (['shorts', 'embed', 'live'].includes(pathParts[0])) {
        const id = pathParts[1] || null;
        return isValidVideoId(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Unknown';
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const loadYouTubeIframeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (window.__ytIframeApiPromise) return window.__ytIframeApiPromise;

  window.__ytIframeApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    let settled = false;

    let poll;
    let timeout;
    const done = () => {
      if (settled) return;
      settled = true;
      if (poll) window.clearInterval(poll);
      if (timeout) window.clearTimeout(timeout);
      resolve(window.YT);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      if (poll) window.clearInterval(poll);
      if (timeout) window.clearTimeout(timeout);
      reject(error);
    };

    script.onerror = () => fail(new Error('Could not load YouTube player API.'));
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      done();
    };

    // Fallback for callback races: resolve as soon as the API object appears.
    poll = window.setInterval(() => {
      if (window.YT?.Player) {
        done();
      }
    }, 50);

    timeout = window.setTimeout(() => {
      if (window.YT?.Player) {
        done();
      } else {
        fail(new Error('Timed out loading YouTube player API.'));
      }
    }, 10000);

    document.head.appendChild(script);
  });

  return window.__ytIframeApiPromise;
};

const getYouTubeDuration = async (videoId) => {
  await loadYouTubeIframeApi();

  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    let settled = false;
    let player;

    const cleanup = () => {
      try {
        player?.destroy();
      } catch {
        // Ignore teardown errors from partially initialized/terminated iframe players.
      }
      container.remove();
    };

    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    const timeout = window.setTimeout(() => {
      done(resolve, null);
    }, 10000);

    try {
      player = new window.YT.Player(container, {
        width: '1',
        height: '1',
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            window.clearTimeout(timeout);
            const duration = Number(player.getDuration?.());
            done(resolve, Number.isFinite(duration) && duration > 0 ? duration : null);
          },
          onError: () => {
            window.clearTimeout(timeout);
            done(resolve, null);
          },
        },
      });
    } catch (error) {
      window.clearTimeout(timeout);
      done(reject, error);
    }
  });
};

const YoutubeSplitter = () => {
  const [url, setUrl] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [step, setStep] = useState('input'); // input, loading, ready, failed
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const resetPreview = () => {
    setPreview(null);
    setError(null);
    setStatusText('');
    setStep('input');
  };

  const handleSplit = async () => {
    const trimmed = url.trim();
    const videoId = extractVideoId(trimmed);

    if (!trimmed) {
      setStep('failed');
      setError('Please paste a YouTube URL.');
      return;
    }

    if (!videoId) {
      setStep('failed');
      setError('Please enter a valid YouTube video URL.');
      return;
    }

    setIsLoadingMeta(true);
    setStep('loading');
    setError(null);
    setStatusText('Fetching YouTube metadata...');

    try {
      const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const metadataUrl = `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`;

      const metadataRes = await fetch(metadataUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!metadataRes.ok) {
        throw new Error(`Metadata service returned ${metadataRes.status}.`);
      }

      const metadata = await metadataRes.json();
      if (metadata?.error) {
        throw new Error(metadata.error);
      }

      setStatusText('Fetching duration from YouTube player...');
      const durationSeconds = await getYouTubeDuration(videoId).catch(() => null);

      setPreview({
        videoId,
        url: canonicalUrl,
        title: metadata?.title || 'YouTube Video',
        author: metadata?.author_name || 'Unknown channel',
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: formatDuration(durationSeconds),
      });

      setStatusText('Preview ready. Continue to installer or open the app.');
      setStep('ready');
    } catch (err) {
      const message = err?.message || 'Could not fetch YouTube metadata.';
      const isNetworkError = err instanceof TypeError || /failed to fetch/i.test(message || '');

      setStep('failed');
      setError(
        isNetworkError
          ? 'Could not reach the metadata service. This may be due to blocked requests, network issues, or service downtime. Try disabling browser extensions or checking your connection.'
          : `Could not fetch video info: ${message}`
      );
      setStatusText('Metadata fetch failed.');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const baseUrl = import.meta.env.BASE_URL || '/';
  const installerHref = preview
    ? `${baseUrl}?url=${encodeURIComponent(preview.url)}#download`
    : `${baseUrl}#download`;

  const appHref = preview
    ? `deepsplit://youtube?url=${encodeURIComponent(preview.url)}`
    : 'deepsplit://youtube';

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#f3f4f6] selection:bg-cyan-500/30 font-sans">
      <Navbar />

      <main className="pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px] -z-10" />

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Youtube size={14} /> YouTube to Stems Funnel
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-white">
              Paste YouTube URL<br />
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent italic">Preview. Then Split.</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
              We fetch title, thumbnail, and duration first. Then you can jump directly to the StemSplit installer/app.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-1 px-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/5 shadow-2xl backdrop-blur-xl mb-12"
          >
            <div className="bg-[#0a0f1d]/80 rounded-[2.4rem] p-8 md:p-12 space-y-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Paste YouTube URL (Video)..."
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (step === 'failed' || step === 'ready') {
                        resetPreview();
                      }
                    }}
                    className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl px-6 py-5 text-lg font-medium focus:outline-none focus:border-cyan-400/50 transition-all text-white placeholder-gray-600"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-cyan-400 transition-colors">
                    <Youtube size={24} />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSplit}
                disabled={!url || isLoadingMeta}
                className="w-full py-6 bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] rounded-2xl font-black text-xl shadow-[0_0_50px_rgba(34,211,238,0.3)] hover:shadow-[0_0_80px_rgba(34,211,238,0.5)] hover:scale-[1.02] transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none"
              >
                <Zap size={24} />
                {isLoadingMeta ? 'Fetching Preview…' : 'Fetch Video Preview'}
              </button>

              <AnimatePresence>
                {step === 'loading' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-300 text-sm font-bold"
                  >
                    {statusText || 'Fetching metadata...'}
                  </motion.div>
                )}
              </AnimatePresence>

              {step === 'failed' && error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold"
                >
                  Error: {error}
                </motion.div>
              )}

              {step === 'ready' && preview && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden"
                >
                  <img
                    src={preview.thumbnailUrl}
                    alt={preview.title}
                    className="w-full aspect-video object-cover"
                    loading="lazy"
                  />
                  <div className="p-6 space-y-4">
                    <h3 className="text-2xl font-black tracking-tight text-white">{preview.title}</h3>
                    <div className="flex flex-wrap gap-3 text-xs font-black uppercase tracking-widest">
                      <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        Duration: {preview.duration}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        Channel: {preview.author}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={installerHref}
                        className="flex-1 py-4 px-6 bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600 text-[#0a0f1d] rounded-2xl font-black text-center transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Download size={20} />
                        Continue to Installer
                      </a>
                      <a
                        href={appHref}
                        className="flex-1 py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-center transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={20} />
                        Open StemSplit App
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Shield size={20} />, title: 'No Localhost Dependency', desc: 'Metadata preview uses public endpoints compatible with GitHub Pages.' },
              { icon: <Zap size={20} />, title: 'Fast Preview', desc: 'Fetch title + thumbnail via noembed and duration via YouTube iframe API.' },
              { icon: <Globe size={20} />, title: 'Installer Handoff', desc: 'Pass users directly to install/open flow after preview is confirmed.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center text-center">
                <div className="text-cyan-400 mb-4">{f.icon}</div>
                <h4 className="font-black uppercase italic tracking-tight text-white mb-2 text-sm">{f.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default YoutubeSplitter;
