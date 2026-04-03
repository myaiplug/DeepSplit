import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Blog = () => {
  useEffect(() => {
    document.title = 'How to Split Stems from YouTube for Free (AI Method) | StemSplit';
    const desc = 'Free game: learn how to split stems from YouTube with an AI stem splitter, compare StemSplit against other tools, and get pro tips for clean mixes.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#e5e7eb] selection:bg-cyan-500/30">
      <Navbar />
      <main className="pt-28 pb-20 px-4">
        <article className="max-w-5xl mx-auto space-y-10">
          <header className="bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-amber-500/10 border border-white/5 rounded-3xl p-8 md:p-12 shadow-[0_20px_100px_rgba(34,211,238,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400 mb-3">Free Game · SEO Friendly</p>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              How to Split Stems from YouTube for Free (AI Method)
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              No gatekeeping. Here is the exact, step-by-step way I split vocals, drums, bass, and other parts from any YouTube link using our{' '}
              <a className="text-cyan-300 underline decoration-dotted" href="/youtube">AI stem splitter</a>. It is offline-first, runs locally, and packs enough pre/post processing to feel like a mini mastering suite.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/youtube"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] font-black shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:shadow-[0_0_60px_rgba(34,211,238,0.45)] transition-all"
              >
                Open the YouTube Splitter
              </a>
              <span className="px-4 py-3 rounded-xl border border-white/10 text-xs uppercase font-black tracking-[0.2em] text-gray-400">
                Works with WAV output · 4 stems · No logins
              </span>
            </div>
          </header>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-white tracking-tight">Free game: why even split stems from YouTube?</h2>
            <p className="leading-relaxed text-gray-300">
              YouTube is the biggest free sample library on earth. When you can split stems from YouTube cleanly, you get instant acapellas for edits,
              isolate drum breaks for sampling, rebuild arrangements for practice, or study mix decisions without buying a multitrack. Most people stop
              at low-effort tools that leave artifacts. The real unlock is pairing a good source with a disciplined chain: high-quality download,
              ffmpeg conversion to WAV, then Demucs + MDX for surgical separation. That is exactly what this workflow does.
            </p>
            <p className="leading-relaxed text-gray-300">
              This article is written for artists who want zero fluff: the links, the settings, the pitfalls, and how this AI stem splitter stacks
              up against paid competitors. Take it, tweak it, and ship your ideas faster.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">TL;DR setup (copy/paste ready)</h2>
            <ul className="space-y-3 list-disc list-inside text-gray-300 leading-relaxed">
              <li>Grab a clean YouTube URL (official upload &gt; reupload; 1080p or better keeps the audio bitrate solid).</li>
              <li>Head to <a className="text-cyan-300 underline decoration-dotted" href="/youtube">/youtube</a>, paste the link, and hit <span className="font-semibold text-white">Split</span>.</li>
              <li>The modal pops instantly: it downloads with <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">yt-dlp</code>, converts to WAV via <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">ffmpeg</code>, then Demucs carves vocals / drums / bass / other.</li>
              <li>Waveforms load in HD. Mute/solo each stem, then download individual tracks or the bundled <span className="font-semibold text-white">stems.zip</span>.</li>
              <li>Everything runs locally. No limits, no watermarks, no account walls.</li>
            </ul>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Full walkthrough: split stems from YouTube for free</h2>

            <div className="space-y-3">
              <h3 className="text-xl font-black text-white tracking-tight">1) Start with the cleanest source you can</h3>
              <p className="leading-relaxed text-gray-300">
                Quality in equals quality out. Search for the official upload or the highest-resolution version on the artist channel. Avoid lyric
                videos with crushed audio. If the best you can find is a 128kbps upload, it will still work, but cymbals and sibilance are where bad
                encodes hurt separation the most.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-black text-white tracking-tight">2) Paste the link, hit Split</h3>
              <p className="leading-relaxed text-gray-300">
                On the YouTube splitter page, drop the URL in the field and press the big call-to-action. Behind the scenes we call{' '}
                <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">POST /api/youtube-split</code>. That endpoint:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>uses <strong>yt-dlp</strong> to pull the best audio stream,</li>
                <li>forces a lossless <strong>ffmpeg</strong> conversion to WAV (no sneaky transcodes),</li>
                <li>runs a 4-stem Demucs pass plus MDX vocal lift, giving vocals / drums / bass / other,</li>
                <li>packs a <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">stems.zip</code> for quick export.</li>
              </ul>
              <p className="leading-relaxed text-gray-300">
                You do not have to babysit any of this—the modal shows “Splitting stems…” while the job runs in one shot.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-black text-white tracking-tight">3) Watch the modal do work</h3>
              <p className="leading-relaxed text-gray-300">
                The modal opens immediately so you know it is cooking. When the render finishes, you get HD waveforms via Wavesurfer.js. The controls
                are DAW-like: play/pause, mute, solo, per-stem download, and a one-click bundle. No page reloads, no guessing if the job finished.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-black text-white tracking-tight">4) Preview, mute/solo, download</h3>
              <p className="leading-relaxed text-gray-300">
                Solo the vocals to rehearse harmonies, or mute the drums to check phase on bass/other. When you like it, grab individual WAVs or the
                zip. Because everything is already normalized, you can drag the stems straight into Ableton, FL, or Reaper without fighting headroom.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">What makes this AI stem splitter different?</h2>
            <p className="leading-relaxed text-gray-300">
              Honest review time. I tested this flow against the usual suspects so you don’t have to. Here is where it shines and where others still
              hold ground:
            </p>
            <ul className="space-y-3 list-disc list-inside text-gray-300 leading-relaxed">
              <li><strong>StemSplit (this tool):</strong> Local, offline, infinite splits. No watermark, 4-stem Demucs + MDX, instant waveforms, built-in FX chain. Best balance of speed and quality when you control the source.</li>
              <li><strong>LALAL / Moises / PhonicMind:</strong> Great UX, but you pay per minute and still wait on their queue. Artifacts are similar once you force WAV output, but you lose the “instant offline” vibe.</li>
              <li><strong>Spleeter (DIY):</strong> Free and classic, but models are dated. Cymbals smear, vocals bleed, and you still need to script downloads yourself.</li>
              <li><strong>Random browser splitters:</strong> Fast, but heavy compression and mystery models. Good for rough drafts, not for releases.</li>
            </ul>
            <p className="leading-relaxed text-gray-300">
              Verdict: if you want control, privacy, and repeatable quality, running this locally wins. If you just need a quick reference and don’t
              care about artifacts, cloud tools are fine. Pick the lane that matches your deadline.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">The pre/post chain could be its own app</h2>
            <p className="leading-relaxed text-gray-300">
              After separation, we optionally run a light finishing chain that would justify its own plugin: gentle EQ to calm harshness, multiband glue
              to even out dynamics, stereo polish to keep center elements honest, and a smart limiter that respects true peak. You can toggle or swap
              presets per stem in the UI, meaning your acapella can leave the browser already performance-ready. That is free sauce most splitters
              charge for.
            </p>
            <p className="leading-relaxed text-gray-300">
              The fun part: because everything is local, you can iterate forever. Render five vocal versions with different mix balances, audition them
              in the modal, and keep the one that sits best with your beat.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Offline-first, local, infinite</h2>
            <p className="leading-relaxed text-gray-300">
              StemSplit is the first “online” experience that actually runs offline once you load it: the backend is yours, models sit locally, and the
              modal simply talks to your machine. No file leaves your box, so you can split unreleased songs safely. Because we avoid per-minute billing,
              you can batch entire playlists overnight and wake up to a folder full of stems. GPU detected? Great—CUDA kicks in automatically. CPU only?
              It still works, just slower.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Troubleshooting & pro tips</h2>
            <ul className="space-y-3 list-disc list-inside text-gray-300 leading-relaxed">
              <li>Bad URL? Make sure it starts with <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">https://</code> and is not a private video. Shorts work too.</li>
              <li>Artifacts in cymbals? Try a higher-quality source or re-run; Demucs struggles most on 128kbps uploads.</li>
              <li>Vocals too airy? Drop the post FX mix or re-EQ the vocal stem—no need to rerun the split.</li>
              <li>Want tighter drums? Solo drums in the modal, print them, and layer with your own kick/snare for punch.</li>
              <li>Need DJ edits? Mute vocals, download instrumental, set your grids, and perform. The stems are phase-aligned.</li>
              <li>Automation tip: since the endpoint is plain JSON, you can script batch jobs against <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs">/api/youtube-split</code>.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Ideas once you have clean stems</h2>
            <ul className="space-y-3 list-disc list-inside text-gray-300 leading-relaxed">
              <li>Practice live mixing by muting stems and rebuilding the balance from scratch.</li>
              <li>Create mashups: line up tempos, swap vocals between tracks, and print a quick demo.</li>
              <li>Study arrangements: solo “other” to hear pads, atmospheres, and risers you usually miss.</li>
              <li>Sample responsibly: chop a drum break from the drums stem so you avoid vocals bleeding in.</li>
              <li>Teach: show students how EQ, compression, and stereo width change when you start from isolated stems.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Wrap-up</h2>
            <p className="leading-relaxed text-gray-300">
              That is the whole playbook for how to split stems from YouTube for free with an AI stem splitter that respects quality and privacy. It is
              faster than most cloud tools, honest about what the models can and cannot do, and stacked with post-processing so your downloads are usable
              immediately. Bookmark this guide, send it to a friend who still screen-records audio, and keep experimenting.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/youtube"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-[#0a0f1d] font-black shadow-[0_0_30px_rgba(34,211,238,0.35)] hover:shadow-[0_0_60px_rgba(34,211,238,0.45)] transition-all"
              >
                Split a YouTube Link Now
              </a>
              <span className="text-xs uppercase tracking-[0.2em] font-black text-gray-500">
                Offline · WAV output · Vocals / Drums / Bass / Other
              </span>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
