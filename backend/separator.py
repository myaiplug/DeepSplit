import asyncio
import logging
import shutil
import gc
import time
from pathlib import Path

from audio_separator.separator import Separator

logger = logging.getLogger(__name__)

def _safe_name(original_filename: str) -> str:
    """Sanitize filename to alphanumeric + space/dash/underscore."""
    return "".join(c for c in original_filename if c.isalnum() or c in (' ', '-', '_')).strip()

def _move_file(src: Path, dest: Path):
    """Windows-safe move: copy2 + retry-delete to avoid PermissionError from open handles."""
    shutil.copy2(str(src), str(dest))
    for _ in range(6):
        try:
            src.unlink()
            return
        except PermissionError:
            time.sleep(0.3)

class AudioSeparator:
    def __init__(self, use_gpu: bool = True):
        self.use_gpu = use_gpu
        # Global initialization, model loading runs upon first inference
        self.separator = Separator(
            output_format="mp3",
            model_file_dir="/tmp/audio-separator-models/"
        )
        import torch
        if use_gpu and torch.cuda.is_available():
            self.separator.torch_device = 'cuda'
        else:
            self.separator.torch_device = 'cpu'
        self.separator.normalization_threshold = 0.9

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def separate_stems(
        self,
        audio_path: Path,
        output_dir: Path,
        original_filename: str,
        num_stems: int = 6,
        progress_callback=None,
    ):
        """
        num_stems controls the separation mode:
          2  – MDX vocals only  → vocals, instrumental
          4  – Demucs 4-stem   → vocals, drums, bass, other
          5  – MDX + Demucs 4  → vocals, drums, bass, guitar, other
          6  – MDX + Demucs 6s → vocals, drums, bass, guitar, piano, other  (default)
          7  – 6-stem + drumsep → replaces drums with kick/snare/hihat/overhead/room
        """
        self.output_dir = output_dir
        self.separator.output_dir = str(output_dir)
        
        safe = _safe_name(original_filename)
        # Assign callback globally to the Separator class so it emits natively to UI
        if progress_callback:
            self.separator.progress_callback = progress_callback
            
        logger.info(f"Starting separation: mode={num_stems}, file={audio_path.name}")

        if num_stems == 2:
            return await self._mode_2stem(audio_path, safe)
        elif num_stems == 4:
            return await self._mode_4stem(audio_path, safe)
        elif num_stems == 5:
            return await self._mode_5stem(audio_path, safe)
        elif num_stems == 7:
            # 6-stem first, then sophisticated drumsep
            stems = await self._mode_6stem(audio_path, safe)
            drum_stem = self.output_dir / f"{safe}_drums.mp3"
            if drum_stem.exists():
                drum_stems = await self.separate_drums(drum_stem)
                stems = [s for s in stems if not s.endswith("_drums.mp3")]
                stems.extend(drum_stems)
            return stems
        else:
            # Default: 6-stem
            return await self._mode_6stem(audio_path, safe)

    # ------------------------------------------------------------------
    # Mode implementations
    # ------------------------------------------------------------------

    async def _mdx_vocals(self, audio_path: Path, safe: str):
        """Run MDX vocal separation. Returns (vocal_dest_name, inst_path)."""
        mdx_model = 'Kim_Vocal_2.onnx'
        logger.info(f"Loading MDX model: {mdx_model}")
        await asyncio.to_thread(self.separator.load_model, model_filename=mdx_model)

        logger.info(f"MDX separating {audio_path.name}")
        mdx_output = await asyncio.to_thread(self.separator.separate, str(audio_path))
        logger.info(f"MDX output: {mdx_output}")

        vocal_stem = next((f for f in mdx_output if "(vocals)" in f.lower()), None)
        inst_stem   = next((f for f in mdx_output if "(instrumental)" in f.lower()), None)

        if not vocal_stem or not inst_stem:
            raise RuntimeError(f"MDX did not produce expected stems. Got: {mdx_output}")

        gc.collect()

        # Move vocals
        vocal_dest = self.output_dir / f"{safe}_vocals.mp3"
        _move_file(self.output_dir / vocal_stem, vocal_dest)
        logger.info(f"Vocals → {vocal_dest.name}")

        return vocal_dest.name, self.output_dir / inst_stem

    async def _demucs_on(self, input_path: Path, safe: str, model: str, stem_map: dict):
        """
        Run Demucs model on input_path, rename outputs according to stem_map.
        stem_map: { substring_to_detect: dest_suffix }  e.g. {"drums": "drums", "bass": "bass"}
        Returns list of dest stem filenames.
        """
        logger.info(f"Loading Demucs model: {model}")
        await asyncio.to_thread(self.separator.load_model, model_filename=model)

        logger.info(f"Demucs separating {input_path.name}")
        demucs_output = await asyncio.to_thread(self.separator.separate, str(input_path))
        logger.info(f"Demucs output: {demucs_output}")

        gc.collect()

        result = []
        for f in demucs_output:
            lower = f.lower()
            matched = next((suffix for key, suffix in stem_map.items() if key in lower), None)
            if matched:
                dest = self.output_dir / f"{safe}_{matched}.mp3"
                src = self.output_dir / f
                if src.exists():
                    _move_file(src, dest)
                    result.append(dest.name)
                    logger.info(f"{matched} → {dest.name}")
        return result

    async def _mode_2stem(self, audio_path, safe):
        """Vocals + Instrumental only."""
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe)
        inst_dest = self.output_dir / f"{safe}_instrumental.mp3"
        if inst_path.exists():
            _move_file(inst_path, inst_dest)
        return [vocal_name, inst_dest.name]

    async def _mode_4stem(self, audio_path, safe):
        """Full 4-stem Demucs directly on original (no MDX pre-step)."""
        stems = await self._demucs_on(
            audio_path, safe,
            model='htdemucs.yaml',
            stem_map={"vocals": "vocals", "drums": "drums", "bass": "bass", "other": "other"},
        )
        return stems

    async def _mode_5stem(self, audio_path, safe):
        """MDX vocals + Demucs 4-stem on instrumental → 5 stems."""
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe)
        instr_stems = await self._demucs_on(
            inst_path, safe,
            model='htdemucs_ft.yaml',
            stem_map={"drums": "drums", "bass": "bass", "guitar": "guitar", "other": "other"},
        )
        return [vocal_name] + instr_stems

    async def _mode_6stem(self, audio_path, safe):
        """MDX vocals + Demucs 6-stem on instrumental → 6 stems."""
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe)
        instr_stems = await self._demucs_on(
            inst_path, safe,
            model='htdemucs_6s.yaml',
            stem_map={
                "drums": "drums", "bass": "bass",
                "guitar": "guitar", "piano": "piano", "other": "other",
            },
        )
        return [vocal_name] + instr_stems

    # ------------------------------------------------------------------
    # Drum separation (sub-stem)
    # ------------------------------------------------------------------

    async def separate_drums(self, drum_stem_path: Path):
        """
        Separates a drum track into Kick, Snare, HiHat, Overhead, Room using MDX.
        Returns list of output stem filenames.
        """
        logger.info(f"Starting advanced drum separation for {drum_stem_path}")
        output_files = []
        safe = _safe_name(drum_stem_path.stem.replace("_drums", ""))

        try:
            drum_model = 'MDX23C_DrumSep_full_compressed_022024.onnx'
            logger.info(f"Loading drum model: {drum_model}")
            await asyncio.to_thread(self.separator.load_model, model_filename=drum_model)
            drum_output = await asyncio.to_thread(self.separator.separate, str(drum_stem_path))
            logger.info(f"Drum output: {drum_output}")
            
            if not drum_output:
                raise RuntimeError("Drum model returned empty list. Processing failed.")

            gc.collect()

            # Map generated outputs to frontend components
            for f in drum_output:
                lower = f.lower()
                dest_name = None
                if "kick" in lower:        dest_name = f"{safe}_kick.mp3"
                elif "snare" in lower:     dest_name = f"{safe}_snare.mp3"
                elif "hihat" in lower or "hi-hat" in lower or "hat" in lower:
                    dest_name = f"{safe}_hihat.mp3"
                elif "overhead" in lower:  dest_name = f"{safe}_overhead.mp3"
                elif "room" in lower:      dest_name = f"{safe}_room.mp3"
                else: dest_name = f"{safe}_percussion.mp3"

                if dest_name:
                    src = self.output_dir / f
                    dest = self.output_dir / dest_name
                    if src.exists():
                        _move_file(src, dest)
                        output_files.append(dest_name)
                        
            if not output_files:
                raise RuntimeError(f"Could not parse drum output correctly from models output: {drum_output}")

        except Exception as e:
            logger.error(f"Drum separation failed: {e}")
            raise RuntimeError(f"Failed to generate drum stems successfully: {e}")

        return output_files
