from audio_separator.separator import Separator
s = Separator()
models = s.list_supported_model_files()
print("=== Demucs details ===")
for friendly_name, info in models.get('Demucs', {}).items():
    print(f"  Friendly: {friendly_name!r}")
    print(f"  Info: {info}")
    print()
