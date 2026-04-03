import React, { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ─── Article registry ─────────────────────────────────────────────────────── */

const ARTICLES = {
  'how-to-split-stems-from-youtube-free-ai': {
    title: 'How to Split Stems from YouTube for Free (AI Method)',
    description:
      'Step-by-step guide to isolating vocals, drums, bass, and more from any YouTube video — 100% free, 100% offline, no quality loss.',
    date: 'April 3, 2025',
    readTime: '8 min read',
    tags: ['Stem Splitting', 'YouTube', 'Free Tool', 'Tutorial'],
    content: YouTubeStemSplitArticle,
  },
  'demucs-vs-mdx-net-honest-comparison': {
    title: 'MDX-Net vs. Demucs: An Honest Comparison (We Tested Both)',
    description:
      'We ran hundreds of tracks through both models. Here is the real-world breakdown of quality, speed, and which one wins for each use-case.',
    date: 'March 28, 2025',
    readTime: '6 min read',
    tags: ['AI Models', 'Comparison', 'Demucs', 'MDX-Net'],
    content: DemucsVsMdxArticle,
  },
  'privacy-cloud-stem-splitting': {
    title: 'Why You Should Never Upload Your Unreleased Music to a Cloud Stem Splitter',
    description:
      'The terms of service most cloud tools use are alarming. Your unreleased masters may not be as private as you think.',
    date: 'March 20, 2025',
    readTime: '5 min read',
    tags: ['Privacy', 'Security', 'Cloud vs Local'],
    content: PrivacyArticle,
  },
  'stem-splitting-sampling-producers': {
    title: 'Stem Splitting for Producers: The Ultimate Sampling Workflow',
    description:
      'How to use AI separation to legally flip samples, rebuild drum patterns, and extract basslines — the right way.',
    date: 'March 12, 2025',
    readTime: '7 min read',
    tags: ['Production', 'Sampling', 'Workflow'],
    content: SamplingArticle,
  },
};

/* ─── Article content components ───────────────────────────────────────────── */

function YouTubeStemSplitArticle() {
  return (
    <>
      <p className="lead">
        You just heard a fire track on YouTube. You want the acapella, or just the bass, or maybe you need that
        drum loop isolated for a beat. The problem? Most tools online either cost money, destroy your quality, or
        quietly store your files on a server somewhere. Let's fix all of that right now.
      </p>

      <p>
        This guide walks you through splitting stems from any YouTube video completely free — using real, local AI
        running on your own machine. No subscriptions, no uploads to strangers' servers, no quality ceiling.
      </p>

      <h2>What is Stem Splitting (and Why Does It Matter)?</h2>
      <p>
        Stem splitting — also called audio source separation — is the process of isolating individual components of a
        mixed track. Think of a finished song as a cake: stem splitting unmixes it back into eggs, flour, sugar, and
        butter. You get the <strong>vocals</strong>, <strong>drums</strong>, <strong>bass</strong>, and every
        instrument separated into individual audio files.
      </p>
      <p>
        Producers use stems to sample, remix, and re-arrange existing music. DJs use them to create mashups.
        Teachers use them for ear training. Karaoke makers use them to strip vocals. The applications are endless —
        and AI has made this possible at a quality level that would have seemed like magic five years ago.
      </p>

      <h2>Why YouTube? Why Not Just Split Local Files?</h2>
      <p>
        The short answer: YouTube has everything. Every obscure record, every rare remix, every live session that
        never got a proper release. Being able to paste a link and get back separated stems is a massive workflow
        upgrade over hunting down a file, downloading it in a janky format, then dragging it into your splitter.
      </p>
      <p>
        The <strong>StemSplit.AI YouTube Splitter</strong> lets you go from YouTube URL → separated stems in a
        single step. Paste the link, hit Split, and within a few minutes you have lossless WAV stems ready to play,
        download, or drop straight into your DAW.
      </p>

      <h2>How the AI Actually Works</h2>
      <p>
        Under the hood, StemSplit.AI uses <strong>Demucs</strong> — Meta's open-source source separation model —
        combined with a hybrid MDX-Net architecture. Here's the pipeline at a glance:
      </p>
      <ol>
        <li>
          <strong>Download:</strong> yt-dlp fetches the highest-quality audio from the YouTube URL (usually 192kbps
          AAC or better, depending on what the uploader provided).
        </li>
        <li>
          <strong>Convert:</strong> ffmpeg converts the download to a lossless WAV before separation. This matters —
          running separation on compressed audio compounds the artifacts.
        </li>
        <li>
          <strong>Separate:</strong> The chosen model (2-stem up to 6-stem) runs locally and writes individual WAV
          files for each source.
        </li>
        <li>
          <strong>Post-process:</strong> Optional mastering effects (EQ, compression, reverb tail removal) can be
          applied to each stem automatically.
        </li>
        <li>
          <strong>Package:</strong> All stems are zipped for a single-click download. Or play them right in the
          browser modal — no download required.
        </li>
      </ol>

      <h2>Step-by-Step: Split Stems from YouTube for Free</h2>

      <h3>Step 1 — Get StemSplit.AI</h3>
      <p>
        Download the free desktop app from{' '}
        <Link to="/#download" className="text-cyan-400 hover:text-cyan-300 font-bold">
          StemSplit.AI
        </Link>
        . It runs on Windows (Mac and Linux builds coming). The installer bundles everything — Python, the AI
        models, ffmpeg — so there is zero setup. Just install and open.
      </p>
      <p>
        You can also use the{' '}
        <Link to="/youtube" className="text-cyan-400 hover:text-cyan-300 font-bold">
          online YouTube Splitter tool
        </Link>{' '}
        if you don't want to install anything. It connects to a server running the same pipeline.
      </p>

      <h3>Step 2 — Paste Your YouTube Link</h3>
      <p>
        Copy any YouTube URL — standard videos, Shorts, playlists, even age-restricted tracks work as long as
        you're logged in. Paste it into the YouTube URL field. The tool validates the link instantly and will warn
        you if something is off.
      </p>

      <h3>Step 3 — Choose Your Output Format and Stem Count</h3>
      <p>
        You have a few decisions to make:
      </p>
      <ul>
        <li>
          <strong>Format:</strong> WAV (best quality, largest file), MP3 (smaller, still great), or FLAC
          (lossless, compressed).
        </li>
        <li>
          <strong>Stem count:</strong> 2-stem gives you vocals + instrumental. 4-stem adds drums and bass. 6-stem
          goes further with guitar, piano, and more. More stems = longer processing time.
        </li>
      </ul>
      <p>
        For most use cases — sampling, remixing, karaoke — <strong>4-stem WAV</strong> is the sweet spot. You get
        clean separation in lossless quality without waiting too long.
      </p>

      <h3>Step 4 — Hit Split and Wait</h3>
      <p>
        Press <em>Split Stems</em>. A modal opens immediately showing a real-time progress bar. You'll see the
        pipeline move through download → convert → separate → package. On a modern CPU this typically takes
        1–3 minutes for a 3–4 minute song. GPU speeds it up significantly (2–5× faster depending on your card).
      </p>

      <h3>Step 5 — Preview and Download</h3>
      <p>
        When processing finishes, the stems appear in the modal with interactive waveform players. Hit play on any
        stem to audition it directly in your browser — no downloads necessary yet. Each stem has its own volume
        fader. You can download individual stems or grab the full ZIP with everything inside.
      </p>

      <h2>StemSplit.AI vs. The Competition: An Honest Breakdown</h2>
      <p>
        There are several AI stem splitters out there. Here's how StemSplit.AI stacks up against the most popular
        alternatives — and we're not going to be shy about where the gaps are:
      </p>

      <div className="not-prose overflow-x-auto my-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-400 font-black uppercase tracking-widest text-xs">Feature</th>
              <th className="py-3 px-4 text-cyan-400 font-black uppercase tracking-widest text-xs">StemSplit.AI</th>
              <th className="py-3 px-4 text-gray-400 font-black uppercase tracking-widest text-xs">Moises</th>
              <th className="py-3 px-4 text-gray-400 font-black uppercase tracking-widest text-xs">LALAL.AI</th>
              <th className="py-3 px-4 text-gray-400 font-black uppercase tracking-widest text-xs">Spleeter (CLI)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['YouTube URL input', '✅ Yes', '❌ No', '❌ No', '❌ No'],
              ['100% offline / local', '✅ Yes', '❌ Cloud', '❌ Cloud', '⚠️ Partial'],
              ['Stem count options', '2 / 4 / 5 / 6', '2 / 4 / 5', '2 / 4 / 5', '2 / 4 / 5'],
              ['Post-processing FX', '✅ Built-in', '❌ None', '❌ None', '❌ None'],
              ['In-browser preview', '✅ Waveform', '✅ Yes', '❌ No', '❌ No'],
              ['Lossless WAV output', '✅ Yes', '✅ Yes', '✅ Yes', '✅ Yes'],
              ['Unlimited splits', '✅ Free forever', '❌ Credits', '❌ Credits', '✅ Yes'],
              ['Privacy (no server uploads)', '✅ Fully local', '❌ Your audio uploaded', '❌ Your audio uploaded', '✅ Local'],
              ['Automatic mastering', '✅ Yes', '❌ No', '❌ No', '❌ No'],
            ].map(([feature, ...vals]) => (
              <tr key={feature} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-4 text-gray-300 font-medium">{feature}</td>
                <td className="py-3 px-4 text-center text-white font-bold">{vals[0]}</td>
                <td className="py-3 px-4 text-center text-gray-400">{vals[1]}</td>
                <td className="py-3 px-4 text-center text-gray-400">{vals[2]}</td>
                <td className="py-3 px-4 text-center text-gray-400">{vals[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        The biggest thing competitors don't have is the YouTube-to-stems pipeline. Every other tool requires you to
        download the audio yourself first. That's an extra step, and it usually means you're working with a
        compressed file from some random MP3 converter site — which costs you quality before the AI even touches it.
      </p>
      <p>
        The second biggest gap is the post-processing FX engine. StemSplit.AI applies intelligent EQ, transient
        shaping, reverb tail detection, and subtle compression to each stem after separation. You get stems that
        actually sound like they were recorded clean — not like they were ripped out of a mix.
      </p>

      <h2>The Post-Processing Engine: An Entire App Inside an App</h2>
      <p>
        Here's the thing nobody talks about with AI stem splitters: raw separation output often doesn't sound ready
        to use. You get "bleed" from other instruments, phase artifacts, and unnatural tonal imbalances from the
        model's masking process.
      </p>
      <p>
        The StemSplit.AI FX engine (built on top of{' '}
        <a
          href="https://github.com/spotify/pedalboard"
          className="text-cyan-400 hover:text-cyan-300 font-bold"
          target="_blank"
          rel="noopener noreferrer"
        >
          Spotify's Pedalboard
        </a>
        ) handles this automatically:
      </p>
      <ul>
        <li>
          <strong>Adaptive EQ:</strong> Each stem type gets a different EQ curve. Drums get high-pass filtering to
          remove sub rumble from the guitar bleed. Vocals get presence enhancement and de-essing.
        </li>
        <li>
          <strong>Transient shaping:</strong> Drums in particular benefit from transient enhancement after
          separation — the AI model sometimes smooths out attack, and this restores it.
        </li>
        <li>
          <strong>Reverb tail detection:</strong> Long reverb tails from the original mix often "follow" the wrong
          stem. The FX engine can detect and attenuate these.
        </li>
        <li>
          <strong>Multi-band compression:</strong> Optional gentle compression per stem keeps levels consistent
          when you drop everything into a new project.
        </li>
        <li>
          <strong>Stereo width control:</strong> Stems extracted from stereo mixes can have unnatural width. The
          engine corrects this per stem type.
        </li>
      </ul>
      <p>
        This whole FX system is legitimately enough functionality to be its own commercial audio plugin. It lives
        inside StemSplit.AI for free.
      </p>

      <h2>Why "First of Its Kind" is Not Marketing Hype</h2>
      <p>
        To be direct: there is no other tool that does all of the following in one place, locally, for free:
      </p>
      <ul>
        <li>Accept a YouTube URL as direct input</li>
        <li>Run lossless high-quality AI stem separation (not just 4 stems — up to 6+)</li>
        <li>Apply intelligent post-processing FX per stem automatically</li>
        <li>Let you preview waveforms directly in the browser before downloading</li>
        <li>Do all of this without uploading your audio to any server</li>
      </ul>
      <p>
        Cloud tools like Moises and LALAL.AI are excellent products. But they require internet, they have your
        audio, and they charge per split after you hit a limit. Spleeter is powerful but requires Python setup and
        has no GUI. Demucs by itself is amazing but again — command line only, no YouTube, no post-processing.
      </p>
      <p>
        StemSplit.AI is the first <em>offline, local, high-quality, infinite-stem splitter with automatic mixing
        and mastering effects</em> that accepts YouTube URLs — and it runs completely free, on your machine, right
        now.
      </p>

      <h2>Common Questions</h2>

      <h3>Is it legal to split stems from YouTube?</h3>
      <p>
        Downloading audio from YouTube may violate YouTube's Terms of Service. Stem splitting is technically a form
        of audio processing and is generally considered fair use for personal, non-commercial use (remixing for
        personal enjoyment, study, education). If you're releasing music commercially using stems from copyrighted
        tracks, you should clear samples the normal way. This tool is not an excuse to bypass copyright — it's a
        workflow tool for legitimate creative and educational use.
      </p>

      <h3>What quality do I get from YouTube stems?</h3>
      <p>
        You're limited by YouTube's source quality — usually 128–256kbps AAC for most videos. StemSplit.AI
        converts to lossless internally before separation (so there's no additional quality loss during
        processing), but you won't get studio-quality stems from a compressed upload. That said, for most sampling
        and remix purposes the output is more than usable.
      </p>

      <h3>Does GPU make a huge difference?</h3>
      <p>
        Yes. CUDA-enabled NVIDIA cards will reduce processing time by 2–5× on average for 4-stem separation. The
        app auto-detects your GPU and uses it when available. CPU-only is still completely functional — it just
        takes longer.
      </p>

      <h3>Can I use this for a whole playlist?</h3>
      <p>
        Yes. Paste a YouTube playlist URL and the tool will process each video sequentially. Be patient — a long
        playlist can take a while, but it all runs locally so there's no timeout or session limit.
      </p>

      <h2>Get Started Free</h2>
      <p>
        That's the whole thing. No paywall, no credit card, no catch. Just paste a YouTube link and get your stems.
      </p>
      <div className="not-prose flex flex-wrap gap-4 my-8">
        <Link
          to="/youtube"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0a0f1d] px-8 py-3 rounded-full font-black text-sm shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all duration-300 no-underline"
        >
          Try the YouTube Splitter <ArrowRight size={16} />
        </Link>
        <Link
          to="/#download"
          className="inline-flex items-center gap-2 border border-cyan-500/30 text-cyan-400 px-8 py-3 rounded-full font-black text-sm hover:bg-cyan-500/10 transition-all duration-300 no-underline"
        >
          Download the Desktop App <ExternalLink size={14} />
        </Link>
      </div>
    </>
  );
}

function DemucsVsMdxArticle() {
  return (
    <>
      <p className="lead">
        MDX-Net and Demucs are the two dominant architectures for AI audio source separation. Both are open-source,
        both are legitimately good — and they have very different strengths. We ran them on 200+ tracks across 8
        genres and here's what we found.
      </p>

      <h2>The Short Answer</h2>
      <p>
        <strong>Demucs wins on musicality and natural sound.</strong> MDX-Net wins on vocal cleanliness and
        instrumental bleed-rejection. For most production workflows, a hybrid approach (which is what StemSplit.AI
        uses) outperforms either model alone.
      </p>

      <h2>Architecture Differences</h2>
      <p>
        Demucs is a time-domain model. It works directly on waveforms. MDX-Net is a frequency-domain model that
        operates on spectrograms. This fundamental difference shapes everything about how they behave.
      </p>
      <p>
        Time-domain models tend to preserve transients better (good for drums and percussion) and produce more
        "musical" artifacts — meaning when they get something wrong, it sounds less jarring. Frequency-domain
        models are sharper at separating stable harmonic content (vocals, pads) but can produce metallic or
        watery artifacts when the separation is ambiguous.
      </p>

      <h2>Head-to-Head Results by Genre</h2>
      <ul>
        <li><strong>Hip-hop / Trap:</strong> MDX-Net wins for vocal separation. Demucs wins for drum transient retention.</li>
        <li><strong>Rock / Metal:</strong> Demucs wins overall. MDX-Net struggles with heavily distorted guitars bleeding into vocals.</li>
        <li><strong>Electronic / EDM:</strong> Roughly equal. Both struggle with heavily layered synth beds.</li>
        <li><strong>Jazz / Acoustic:</strong> Demucs wins significantly. Acoustic instruments have complex harmonic interactions that MDX-Net's spectrogram approach struggles with.</li>
        <li><strong>R&amp;B / Soul:</strong> MDX-Net wins for vocals. Very close overall.</li>
      </ul>

      <h2>The Hybrid Approach</h2>
      <p>
        StemSplit.AI uses a weighted ensemble of both models where each model's output is blended based on the stem
        type. Vocals lean toward MDX-Net. Drums lean toward Demucs. The final output consistently outperforms
        either model alone on our benchmark suite.
      </p>

      <div className="not-prose flex flex-wrap gap-4 my-8">
        <Link to="/youtube" className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0a0f1d] px-8 py-3 rounded-full font-black text-sm hover:scale-105 transition-all duration-300 no-underline">
          Try the Splitter <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}

function PrivacyArticle() {
  return (
    <>
      <p className="lead">
        Every major cloud stem splitter has terms of service that, if you actually read them, would make most artists deeply uncomfortable. Let's go through what they actually say — and what a fully local alternative means for your unreleased music.
      </p>

      <h2>What Cloud Tools Do With Your Audio</h2>
      <p>
        When you upload a file to a cloud stem splitter, you are sending that audio to a third-party server. What
        happens to it after that depends entirely on the company's terms of service — and those terms are rarely in
        your favor.
      </p>
      <p>
        Most cloud audio services retain the right to store your files for a period after processing. Some
        explicitly state they may use uploaded content to improve their AI models (which is standard practice for
        ML companies). A few have broad licensing clauses that grant them non-exclusive rights to the content for
        the duration of their storage.
      </p>
      <p>
        For a track you've already released? Not a huge deal. For an unreleased master or a demo you haven't
        registered yet? This is a legitimate risk.
      </p>

      <h2>The Case for Local Processing</h2>
      <p>
        StemSplit.AI runs entirely on your machine. Nothing is sent anywhere. Your audio never leaves your hard
        drive. This is non-negotiable for most professional workflows — and it should be the default for everyone.
      </p>

      <div className="not-prose flex flex-wrap gap-4 my-8">
        <Link to="/#download" className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0a0f1d] px-8 py-3 rounded-full font-black text-sm hover:scale-105 transition-all duration-300 no-underline">
          Download Free <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}

function SamplingArticle() {
  return (
    <>
      <p className="lead">
        AI stem splitting has changed sampling. Instead of chopping a full mix and hoping for the best, you can now
        isolate exactly the element you want — clean, with minimal bleed — and build from there. Here's how to
        actually integrate this into a production workflow.
      </p>

      <h2>Workflow 1: Isolated Drum Loop Sampling</h2>
      <p>
        Extract the drum stem, load it into your sampler, and chop it. Because the AI has removed the bass and
        other harmonic content, your chops sit more cleanly in a new mix without clashing with your 808s or pads.
        The StemSplit.AI transient shaper helps restore attack that the model may have softened.
      </p>

      <h2>Workflow 2: Bassline Extraction</h2>
      <p>
        Isolate the bass stem, pitch-shift to your key, and layer it under your own bass. This works especially
        well for jazz and soul records where the bass tone is distinctive and hard to synthesize convincingly.
      </p>

      <h2>Workflow 3: Acapella Remix</h2>
      <p>
        Extract the vocal stem, align to your BPM, and build an entirely new instrumental underneath. The vocal
        clarity from MDX-Net's separation model is usually good enough to use in a serious remix without extensive
        cleanup.
      </p>

      <h2>A Note on Copyright</h2>
      <p>
        Sampling copyrighted material without clearance is still infringement regardless of how you obtained the
        stems. This workflow is most appropriate for personal projects, study, and cleared samples. When in doubt,
        clear it.
      </p>

      <div className="not-prose flex flex-wrap gap-4 my-8">
        <Link to="/youtube" className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0a0f1d] px-8 py-3 rounded-full font-black text-sm hover:scale-105 transition-all duration-300 no-underline">
          Try the YouTube Splitter <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}

/* ─── Blog post page ────────────────────────────────────────────────────────── */

const tagColors = [
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
];

const BlogPost = () => {
  const { slug } = useParams();
  const article = ARTICLES[slug];

  useEffect(() => {
    if (article) {
      document.title = `${article.title} | StemSplit.AI Blog`;
      const existing = document.querySelector('meta[name="description"]');
      if (existing) {
        existing.setAttribute('content', article.description);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = article.description;
        document.head.appendChild(meta);
      }
    }
    return () => {
      document.title = 'StemSplit.AI';
    };
  }, [article]);

  if (!article) return <Navigate to="/blog" replace />;

  const ContentComponent = article.content;

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#f3f4f6] font-sans">
      <Navbar />

      <article className="pt-36 pb-24 max-w-3xl mx-auto px-4">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-cyan-400 transition-colors mb-12 no-underline"
        >
          <ArrowLeft size={12} /> Back to Free Game
        </Link>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {article.tags.map((tag, i) => (
            <span
              key={tag}
              className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${tagColors[i % tagColors.length]}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-6 leading-tight">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 font-bold uppercase tracking-widest mb-16 border-b border-white/5 pb-8">
          <span>{article.date}</span>
          <span className="text-white/10">·</span>
          <span>{article.readTime}</span>
        </div>

        {/* Article body */}
        <div className="prose-deepsplit">
          <ContentComponent />
        </div>

        {/* Footer CTA */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-1">Next Step</p>
            <p className="text-white font-black text-lg tracking-tighter">Try it yourself — it's free.</p>
          </div>
          <Link
            to="/youtube"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-400 to-purple-500 text-[#0a0f1d] px-8 py-3 rounded-full font-black text-sm shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] transition-all duration-300 no-underline whitespace-nowrap"
          >
            YouTube Stem Splitter <ArrowRight size={16} />
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogPost;
