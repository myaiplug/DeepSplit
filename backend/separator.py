import asyncio
import logging
import shutil
import gc
import time
from pathlib import Path

from audio_separator.separator import Separator

logger = logging.getLogger(__name__)


def _safe_name(original_filename: str) -> str:
    return "".join(c for c in original_filename if c.isalnum() or c in (' ', '-', '_')).strip()


def _move_file(src: Path, dest: Path):
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
        self.output_extension = ".mp3"
        self.output_dir = None
        self.separator = None
        self._build_separator(force_cpu=not use_gpu)

    def _cuda_available(self) -> bool:
        try:
            import torch
            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def _build_separator(self, force_cpu: bool = False):
        self.separator = Separator(
            output_format="mp3",
            model_file_dir="/tmp/audio-separator-models/"
        )
        self.separator.normalization_threshold = 0.9
        use_cuda = self.use_gpu and not force_cpu and self._cuda_available()
        self.separator.torch_device = 'cuda' if use_cuda else 'cpu'
        logger.info("AudioSeparator runtime: %s", 'GPU' if use_cuda else 'CPU')

    def _should_retry_on_cpu(self, exc: Exception) -> bool:
        msg = str(exc).lower()
        markers = (
            'torch not compiled with cuda enabled',
            'cuda',
            'cudnn',
            'not enough memory',
            'out of memory',
            'onnxruntime',
            'executionprovider',
            'defaultcpuallocator',
        )
        return any(marker in msg for marker in markers)

    async def _load_and_separate(self, model_filename: str, audio_path: Path, stage_label: str):
        try:
            await asyncio.to_thread(self.separator.load_model, model_filename=model_filename)
            return await asyncio.to_thread(self.separator.separate, str(audio_path))
        except Exception as exc:
            if not self._should_retry_on_cpu(exc):
                raise
            logger.warning("%s failed, retrying on CPU: %s", stage_label, exc)
            gc.collect()
            self._build_separator(force_cpu=True)
            await asyncio.to_thread(self.separator.load_model, model_filename=model_filename)
            return await asyncio.to_thread(self.separator.separate, str(audio_path))

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
        fmt = (output_format or "mp3").lower()
        self.separator.output_format = fmt
        self.output_extension = f".{fmt}"
        self.output_dir = output_dir
        self.separator.output_dir = str(output_dir)

        safe = _safe_name(original_filename)
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
            stems = await self._mode_6stem(audio_path, safe, model_type)
            drum_stem = self.output_dir / f"{safe}_drums{self.output_extension}"
            if drum_stem.exists():
                drum_stems = await self.separate_drums(drum_stem)
                stems = [s for s in stems if not s.endswith(f"_drums{self.output_extension}")]
                stems.extend(drum_stems)
            return stems
        else:
            return await self._mode_6stem(audio_path, safe, model_type)

    def _select_model(self, model_type: str, task: str = "vocals") -> str:
        if model_type == "auto":
            if task == "vocals":
                return "Kim_Vocal_2.onnx"
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
            return "MDX23C-8KFFT-InstVoc_HQ.ckpt"
        elif model_type == "roformer":
            return "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
        elif model_type == "demucs":
            if task == "6stem":
                return "htdemucs_6s.yaml"
            else:
                return "htdemucs.yaml"
        else:
            logger.warning(f"Unknown model_type: {model_type}, using auto")
            return self._select_model("auto", task)

    async def _mdx_vocals(self, audio_path: Path, safe: str, model_type: str = "auto"):
        mdx_model = self._select_model(model_type, "vocals")
        logger.info(f"Loading MDX model: {mdx_model}")
        mdx_output = await self._load_and_separate(mdx_model, audio_path, f"MDX separation on {audio_path.name}")
        logger.info(f"MDX output: {mdx_output}")

        vocal_stem = next((f for f in mdx_output if "(vocals)" in f.lower() or "(vocal)" in f.lower()), None)
        inst_stem = next((f for f in mdx_output if "(instrumental)" in f.lower() or "(instrument)" in f.lower()), None)

        if not vocal_stem or not inst_stem:
            raise RuntimeError(f"MDX did not produce expected stems. Got: {mdx_output}")

        gc.collect()

        vocal_dest = self.output_dir / f"{safe}_vocals{self.output_extension}"
        _move_file(self.output_dir / vocal_stem, vocal_dest)
        logger.info(f"Vocals -> {vocal_dest.name}")

        return vocal_dest.name, self.output_dir / inst_stem

    async def _demucs_on(self, input_path: Path, safe: str, model: str, stem_map: dict):
        logger.info(f"Loading Demucs model: {model}")
        demucs_output = await self._load_and_separate(model, input_path, f"Demucs separation on {input_path.name}")
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
                    logger.info(f"{matched} -> {dest.name}")
        return result

    async def _mode_2stem(self, audio_path, safe, model_type="auto"):
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe, model_type)
        inst_dest = self.output_dir / f"{safe}_instrumental{self.output_extension}"
        if inst_path.exists():
            _move_file(inst_path, inst_dest)
        return [vocal_name, inst_dest.name]

    async def _mode_4stem(self, audio_path, safe, model_type="auto"):
        model = self._select_model(model_type, "4stem")
        stems = await self._demucs_on(
            audio_path, safe,
            model=model,
            stem_map={"vocals": "vocals", "drums": "drums", "bass": "bass", "other": "other"},
        )
        return stems

    async def _mode_5stem(self, audio_path, safe, model_type="auto"):
        vocal_name, inst_path = await self._mdx_vocals(audio_path, safe, model_type)
        model = self._select_model(model_type, "4stem")
        instr_stems = await self._demucs_on(
            inst_path, safe,
            model=model,
            stem_map={"drums": "drums", "bass": "bass", "guitar": "guitar", "other": "other"},
        )
        return [vocal_name] + instr_stems

    async def _mode_6stem(self, audio_path, safe, model_type="auto"):
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

    async def separate_drums(self, drum_stem_path: Path):
        logger.info(f"Starting advanced drum separation for {drum_stem_path}")
        output_files = []
        safe = _safe_name(drum_stem_path.stem.replace("_drums", ""))

        try:
            drum_model = 'MDX23C_DrumSep_full_compressed_022024.onnx'
            logger.info(f"Loading drum model: {drum_model}")
            drum_output = await self._load_and_separate(drum_model, drum_stem_path, f"Drum separation on {drum_stem_path.name}")
            logger.info(f"Drum output: {drum_output}")

            if not drum_output:
                raise RuntimeError("Drum model returned empty list. Processing failed.")

            gc.collect()

            for f in drum_output:
                lower = f.lower()
                dest_name = None
                if "kick" in lower:
                    dest_name = f"{safe}_kick{self.output_extension}"
                elif "snare" in lower:
                    dest_name = f"{safe}_snare{self.output_extension}"
                elif "hihat" in lower or "hi-hat" in lower or "hat" in lower:
                    dest_name = f"{safe}_hihat{self.output_extension}"
                elif "overhead" in lower:
                    dest_name = f"{safe}_overhead{self.output_extension}"
                elif "room" in lower:
                    dest_name = f"{safe}_room{self.output_extension}"
                else:
                    dest_name = f"{safe}_percussion{self.output_extension}"

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
