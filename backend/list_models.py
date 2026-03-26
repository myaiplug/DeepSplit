from audio_separator.separator import Separator
import json, sys
s = Separator()
models = s.list_supported_model_files()
print("Model categories:", list(models.keys()))
for category, model_dict in models.items():
    print(f"\n=== {category} ===")
    for name in list(model_dict.keys())[:15]:
        print(f"  {name}")
