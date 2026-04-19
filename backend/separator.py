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
        self.output_extension = ".mp3"
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
        output_format: str = "mp3",
        model_type: str = "auto",
        progress_callback=None,
    ):
        """
        num_stems controls the separation mode:
          2  – MDX vocals only  → vocals, instrumental
          4  – Demucs 4-stem   → vocals, drums, bass, other
          5  – MDX + Demucs 4  → vocals, drums, bass, guitar, other
          6  – MDX + Demucs 6s → vocals, drums, bass, guitar, piano, other  (default)
          7  – 6-stem + drumsep → replaces drums with kick/snare/hihat/overhead/room

        model_type options:
          "auto"     - Default smart chain (MDX + htdemucs)
          "htdemucs" - Hybrid Transformer Demucs (best quality)
          "mdx23c"   - Latest MDX23C model (fast)
          "roformer" - Roformer model (experimental)
          "demucs"   - Original Demucs v4
        """
        fmt = (output_format or "mp3").lower()
        self.separator.output_format = fmt
        self.output_extension = f".{fmt}"
        self.output_dir = output_dir
        self.separator.output_dir = str(output_dir)

        safe = _safe_name(original_filename)
        # Assign callback globally to the Separator class so it emits natively to UI
        if progress_callback:
            self.separator.progress_callback = progress_callback

        logger.info(f"Starting separation: mode={num_stems}, model={model_type}, file={audio_path.name}")

        if num_stems == 2:
            return await self._mode_2stem(audio_path, safe, model_type)
        elif num_stems == 4:
            return await self._mode_4stem(audio_path, safe, model_type)
        elif num_stems == 5:
            return await self._mode_5stem(audio_path, safe, model_type)
        elif num_stems == 7:
            # 6-stem first, then sophisticated drumsep
            stems = await self._mode_6stem(audio_path, safe, model_type)
            drum_stem = self.output_dir / f"{safe}_drums{self.output_extension}"
            if drum_stem.exists():
                drum_stems = await self.separate_drums(drum_stem)
                stems = [s for s in stems if not s.endswith(f"_drums{self.output_extension}")]
                stems.extend(drum_stems)
            return stems
        else:
            # Default: 6-stem
            return await self._mode_6stem(audio_path, safe, model_type)

    # ------------------------------------------------------------------
    # Model selection helper
    # ------------------------------------------------------------------

    def _select_model(self, model_type: str, task: str = "vocals") -> str:
        """
        Select the appropriate model file based on type and task.

        model_type: "auto", "htdemucs", "mdx23c", "roformer", "demucs"
        task: "vocals", "4stem", "6stem"
        """
        if model_type == "auto":
            # Default smart selection
            if task == "vocals":
                return "Kim_Vocal_2.onnx"  # MDX
            elif task == "4stem":
                return "htdemucs_ft.yaml"
            elif task == "6stem":
                return "htdemucs_6s.yaml"
            else:
                return "htdemucs_ft.yaml"

        elif model_type == "htdemucs":
            if task == "vocals" or task == "4stem":
                return "htdemucs_ft.yaml"
            else:
                return "htdemucs_6s.yaml"

        elif model_type == "mdx23c":
            # Use MDX23C models
            if task == "vocals":
                return "MDX23C-8KFFT-InstVoc_HQ.ckpt"
            else:
                return "MDX23C-8KFFT-InstVoc_HQ.ckpt"

        elif model_type == "roformer":
            # Roformer models
            return "model_bs_roformer_ep_317_sdr_12.9755.ckpt"

        elif model_type == "demucs":
            # Original Demucs v4
            if task == "6stem":
                return "htdemucs_6s.yaml"
            else:
                return "htdemucs.yaml"

        else:
            logger.warning(f"Unknown model_type: {model_type}, using auto")
            return self._select_model("auto", task)

    # ------------------------------------------------------------------
    # Mode implementations
    # ------------------------------------------------------------------

    async def _mdx_vocals(self, audio_path: Path, safe: str, model_type: str = "auto"):
        """Run MDX vocal separation. Returns (vocal_dest_name, inst_path)."""
        mdx_model = self._select_model(model_type, "vocals")
        logger.info(f"Loading MDX model: {mdx_model}")
        await asyncio.to_thread(self.separator.load_model, model_filename=mdx_model)

        logger.info(f"MDX separating {audio_path.name}")
        mdx_output = await asyncio.to_thread(self.separator.separate, str(audio_path))
        logger.info(f"MDX output: {mdx_output}")

        vocal_stem = next((f for f in mdx_output if "(vocals)" in f.lower() or "(vocal)" in f.lower()), None)
        inst_stem   = next((f for f in mdx_output if "(instrumental)" in f.lower() or "(instrument)" in f.lower()), None)

        if not vocal_stem or not inst_stem:
            raise RuntimeError(f"MDX did not produce expected stems. Got: {mdx_output}")

        gc.collect()

        # Move vocals
        vocal_dest = self.output_dir / f"{safe}_vocals{self.output_extension}"
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
                dest = self.output_dir / f"{safe}_{matched}{self.output_extension}"
                src = self.output_dir / f
                if src.exists():
                    _move_file(src, dest)
                    result.append(dest.name)
                    logger.info(f"{matched} → {dest.name}")
        return result

    async def _mode_2stem(self, audio_path, safe, model_type="auto"):
        """Vocals + Instrumental only."""
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe, model_type)
        inst_dest = self.output_dir / f"{safe}_instrumental{self.output_extension}"
        if inst_path.exists():
            _move_file(inst_path, inst_dest)
        return [vocal_name, inst_dest.name]

    async def _mode_4stem(self, audio_path, safe, model_type="auto"):
        """Full 4-stem Demucs directly on original (no MDX pre-step)."""
        model = self._select_model(model_type, "4stem")
        stems = await self._demucs_on(
            audio_path, safe,
            model=model,
            stem_map={"vocals": "vocals", "drums": "drums", "bass": "bass", "other": "other"},
        )
        return stems

    async def _mode_5stem(self, audio_path, safe, model_type="auto"):
        """MDX vocals + Demucs 4-stem on instrumental → 5 stems."""
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe, model_type)
        model = self._select_model(model_type, "4stem")
        instr_stems = await self._demucs_on(
            inst_path, safe,
            model=model,
            stem_map={"drums": "drums", "bass": "bass", "guitar": "guitar", "other": "other"},
        )
        return [vocal_name] + instr_stems

    async def _mode_6stem(self, audio_path, safe, model_type="auto"):
        """MDX vocals + Demucs 6-stem on instrumental → 6 stems."""
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe, model_type)
        model = self._select_model(model_type, "6stem")
        instr_stems = await self._demucs_on(
            inst_path, safe,
            model=model,
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
                if "kick" in lower:        dest_name = f"{safe}_kick{self.output_extension}"
                elif "snare" in lower:     dest_name = f"{safe}_snare{self.output_extension}"
                elif "hihat" in lower or "hi-hat" in lower or "hat" in lower:
                    dest_name = f"{safe}_hihat{self.output_extension}"
                elif "overhead" in lower:  dest_name = f"{safe}_overhead{self.output_extension}"
                elif "room" in lower:      dest_name = f"{safe}_room{self.output_extension}"
                else: dest_name = f"{safe}_percussion{self.output_extension}"

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
