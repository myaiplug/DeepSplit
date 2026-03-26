import os
from pathlib import Path
from pedalboard import (
    Pedalboard, 
    Compressor, 
    HighpassFilter, 
    LowpassFilter, 
    Gain, 
    Reverb, 
    Chorus, 
    Distortion, 
    Limiter,
    NoiseGate,
    PeakFilter,
    Bitcrush
)
from pedalboard.io import AudioFile
import logging

logger = logging.getLogger(__name__)

# --- PRESET DEFINITIONS ---
# Each preset is a function that returns a list of Pedalboard plugins.
# This allows us to instantiate fresh plugins for each run.

def vocal_crystal_clear():
    return [
        HighpassFilter(cutoff_frequency_hz=80),
        NoiseGate(threshold_db=-40, ratio=4, release_ms=250),
        Compressor(threshold_db=-20, ratio=2.5, attack_ms=10, release_ms=100),
        Gain(gain_db=2)
    ]

def vocal_studio_presence():
    return [
        PeakFilter(cutoff_frequency_hz=3000, gain_db=3, q=1.0), # Presence boost
        PeakFilter(cutoff_frequency_hz=10000, gain_db=4, q=0.7), # Air
        Compressor(threshold_db=-18, ratio=3, attack_ms=5),
        Limiter(threshold_db=-1)
    ]

def vocal_lush_verb():
    return [
        HighpassFilter(cutoff_frequency_hz=150),
        Reverb(room_size=0.8, damping=0.2, wet_level=0.4, dry_level=0.7),
        Chorus(rate_hz=1.0, depth=0.25, centre_delay_ms=7),
        Gain(gain_db=-2) # Compensate for reverb addition
    ]

def vocal_dry_tight():
    return [
        NoiseGate(threshold_db=-25, ratio=8, release_ms=50), # Aggressive gate
        HighpassFilter(cutoff_frequency_hz=100),
        Compressor(threshold_db=-15, ratio=4, release_ms=50),
    ]

def vocal_broadcast():
    return [
        Compressor(threshold_db=-25, ratio=4, attack_ms=2, release_ms=100),
        Limiter(threshold_db=-0.5),
        Gain(gain_db=4)
    ]

# --- DRUMS ---

def drum_punchy_kick():
    return [
        PeakFilter(cutoff_frequency_hz=60, gain_db=6, q=2), # Low end boost
        PeakFilter(cutoff_frequency_hz=400, gain_db=-5, q=1), # Boxiness cut
        Compressor(threshold_db=-15, ratio=4, attack_ms=30, release_ms=100),
        Limiter(threshold_db=-0.5)
    ]

def drum_crisp_snare():
    return [
        Distortion(drive_db=5), # Saturation
        PeakFilter(cutoff_frequency_hz=200, gain_db=3), # Body
        PeakFilter(cutoff_frequency_hz=5000, gain_db=4), # Snap
        Reverb(room_size=0.3, wet_level=0.15),
    ]

def drum_room_killer():
    return [
        NoiseGate(threshold_db=-30, ratio=6, release_ms=80),
        HighpassFilter(cutoff_frequency_hz=30)
    ]

def drum_bus_glue():
    return [
        Compressor(threshold_db=-15, ratio=2, attack_ms=10, release_ms=50), # Glue settings
        Distortion(drive_db=2), # Tape warmth simulation
        Limiter(threshold_db=-0.5)
    ]

def drum_lofi_grit():
    return [
        Bitcrush(bit_depth=8),
        LowpassFilter(cutoff_frequency_hz=4000),
        Compressor(threshold_db=-20, ratio=8)
    ]

# --- BASS ---

def bass_sub_focus():
    return [
        LowpassFilter(cutoff_frequency_hz=250), # Isolate lows
        Compressor(threshold_db=-15, ratio=4, attack_ms=50),
        Limiter(threshold_db=-0.5)
    ]

def bass_fuzz_box():
    return [
        Distortion(drive_db=15),
        PeakFilter(cutoff_frequency_hz=800, gain_db=-6), # Scoop
        Compressor(threshold_db=-20, ratio=4)
    ]

def bass_even_dynamics():
    return [
        Compressor(threshold_db=-25, ratio=8, attack_ms=5, release_ms=100),
        Gain(gain_db=4),
        Limiter(threshold_db=-0.5)
    ]

def bass_note_definition():
    return [
        PeakFilter(cutoff_frequency_hz=800, gain_db=5), # Attack freq
        PeakFilter(cutoff_frequency_hz=200, gain_db=-4, q=2), # Cut mud
        Distortion(drive_db=3)
    ]

def bass_rumble_eater():
    return [
        HighpassFilter(cutoff_frequency_hz=35),
        PeakFilter(cutoff_frequency_hz=50, gain_db=-10, q=5) # Hum notch
    ]

# --- OTHER ---

def other_stereo_widen():
    return [
        Chorus(rate_hz=0.5, depth=0.3, feedback=0.0, mix=0.5), # Psuedo-widening
        PeakFilter(cutoff_frequency_hz=8000, gain_db=3, q=0.5) # High sheen
    ]

def other_warm_tape():
    return [
        Distortion(drive_db=6),
        LowpassFilter(cutoff_frequency_hz=14000),
        Compressor(threshold_db=-15, ratio=2, attack_ms=50)
    ]

def other_clean_rhythm():
    return [
        Compressor(threshold_db=-18, ratio=3),
        PeakFilter(cutoff_frequency_hz=300, gain_db=-4)
    ]

def other_shimmer():
    return [
        Reverb(room_size=0.9, damping=0.1, wet_level=0.6, dry_level=0.6),
        Chorus(rate_hz=2.0, depth=0.5)
    ]

def other_background():
    return [
        Reverb(room_size=0.5, wet_level=0.3),
        PeakFilter(cutoff_frequency_hz=3000, gain_db=-3), # Push back presence
        Gain(gain_db=-3)
    ]


PRESET_MAP = {
    # Vocals
    "vocal_crystal_clear": vocal_crystal_clear,
    "vocal_studio_presence": vocal_studio_presence,
    "vocal_lush_verb": vocal_lush_verb,
    "vocal_dry_tight": vocal_dry_tight,
    "vocal_broadcast": vocal_broadcast,
    
    # Drums
    "drum_punchy_kick": drum_punchy_kick,
    "drum_crisp_snare": drum_crisp_snare,
    "drum_room_killer": drum_room_killer,
    "drum_bus_glue": drum_bus_glue,
    "drum_lofi_grit": drum_lofi_grit,

    # Kick (Reuse drum presets or make specific)
    "kick_punchy": drum_punchy_kick,
    "kick_sub": bass_sub_focus,

    # Snare
    "snare_crisp": drum_crisp_snare,
    "snare_crack": lambda: [PeakFilter(2000, 6), Compressor(-15, 4)],

    # Bass
    "bass_sub_focus": bass_sub_focus,
    "bass_fuzz_box": bass_fuzz_box,
    "bass_even_dynamics": bass_even_dynamics,
    "bass_note_definition": bass_note_definition,
    "bass_rumble_eater": bass_rumble_eater,
    
    # Other/Guitar/Piano
    "other_stereo_widen": other_stereo_widen,
    "other_warm_tape": other_warm_tape,
    "other_clean_rhythm": other_clean_rhythm,
    "other_shimmer": other_shimmer,
    "other_background": other_background,
    "guitar_clean": other_clean_rhythm,
    "piano_shimmer": other_shimmer
}


class FXEngine:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir

    def get_presets_for_stem(self, stem_name: str):
        # Return listing of compatible presets based on stem name string
        stem = stem_name.lower()
        presets = []
        
        # Helper to format display names
        def fmt(key): 
            return " ".join([w.capitalize() for w in key.split('_')[1:]])

        if "vocal" in stem:
            keys = [k for k in PRESET_MAP.keys() if k.startswith("vocal_")]
            presets = [{"id": k, "name": fmt(k)} for k in keys]
        elif "drum" in stem or "kick" in stem or "snare" in stem or "hat" in stem or "perc" in stem:
             keys = [k for k in PRESET_MAP.keys() if k.startswith("drum_") or k.startswith("kick_") or k.startswith("snare_")]
             # Deduplicate
             keys = list(set(keys))
             presets = [{"id": k, "name": fmt(k)} for k in keys]
        elif "bass" in stem:
            keys = [k for k in PRESET_MAP.keys() if k.startswith("bass_")]
            presets = [{"id": k, "name": fmt(k)} for k in keys]
        else:
            keys = [k for k in PRESET_MAP.keys() if k.startswith("other_") or k.startswith("guitar_") or k.startswith("piano_")]
            presets = [{"id": k, "name": fmt(k)} for k in keys]
            
        return presets

    def process_fx(self, input_path: str, output_path: str, preset_id: str, passes: int = 1, mix: float = 1.0, preview: bool = False, progress_callback=None):
        """
        Applies the selected preset to the audio file.
        Supports multi-pass processing.
        """
        if preset_id not in PRESET_MAP:
            raise ValueError(f"Unknown preset: {preset_id}")
            
        logger.info(f"Applying FX {preset_id} to {input_path} ({passes} passes, mix={mix}, preview={preview})")
        
        # Load Audio
        with AudioFile(input_path) as f:
            audio = f.read(f.frames)
            samplerate = f.samplerate
            
        if preview:
            max_frames = int(5.0 * samplerate)
            if audio.shape[1] > max_frames:
                audio = audio[:, :max_frames]

        current_audio = audio
        
        # Multi-pass loop
        for i in range(passes):
            logger.info(f"Pass {i+1}/{passes}...")
            
            # Instantiate fresh board
            board = Pedalboard(PRESET_MAP[preset_id]())
            
            # Process
            current_audio = board(current_audio, samplerate)
            
            # Update Progress (Pass completion)
            if progress_callback:
                p = (i + 1) / passes * 100
                progress_callback(p)
                
        # Dry/Wet mix
        if mix < 1.0:
            current_audio = (current_audio * mix) + (audio * (1.0 - mix))

        # Save output
        with AudioFile(output_path, 'w', samplerate, current_audio.shape[0]) as f:
            f.write(current_audio)

        return output_path



    def mix_tracks(self, tracks: list, output_path: str):
        """
        Mixes multiple tracks into a single audio file.
        tracks: List of dicts { 'path': str, 'start_time': float (sec), 'volume': float (0-1), 'muted': bool }
        """
        from pydub import AudioSegment
        import math
        
        logger.info(f"Starting mixdown of {len(tracks)} tracks...")
        
        if not tracks:
            raise ValueError("No tracks to mix")

        # 1. Calculate total duration
        # We need to load them to know duration, or assume frontend sent duration?
        # Let's load them one by one.
        
        mixed = None
        
        for track in tracks:
            if track.get('muted'):
                continue
                
            path = track['path']
            # Handle frontend blob URLs potentially? 
            # NOTE: Frontend must upload custom files before mixdown if they are blobs.
            # unique ID logic for paths should be handled in caller.
            
            if not Path(path).exists():
                logger.warning(f"Track file not found: {path}, skipping")
                continue
                
            # Load
            seg = AudioSegment.from_file(path)
            
            # Apply Volume
            # Volume 0-1. Pydub uses dB. 
            # Simple approx: gain_db = 20 * log10(vol)
            # Vol 1.0 = 0dB. Vol 0.5 = -6dB.
            vol = track.get('volume', 1.0)
            if vol <= 0.001:
                continue # Silent
                
            if vol != 1.0:
                gain_db = 20 * math.log10(vol)
                seg = seg.apply_gain(gain_db)
            
            # Calculate position in ms
            start_ms = int(track.get('start_time', 0) * 1000)
            
            # Expand base mix if needed
            end_ms = start_ms + len(seg)
            
            if mixed is None:
                # Create silent base of at least this length
                mixed = AudioSegment.silent(duration=end_ms)
                mixed = mixed.overlay(seg, position=start_ms)
            else:
                if end_ms > len(mixed):
                    # Pad mixed
                    silence = AudioSegment.silent(duration=end_ms - len(mixed))
                    mixed = mixed + silence
                
                mixed = mixed.overlay(seg, position=start_ms)
                
        if mixed is None:
             # Just return 1 sec silence
             mixed = AudioSegment.silent(duration=1000)
             
        # Export
        mixed.export(output_path, format="mp3", bitrate="320k")
        logger.info(f"Mixdown complete: {output_path}")
        return output_path
