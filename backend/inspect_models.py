"""
Print the EXACT dict structure required by load_model so we can find the right key.
"""
from audio_separator.separator import Separator
import sys
s = Separator()
models = s.list_supported_model_files()
print("Keys in MDX category (name->filename):")
for friendly_name, info in models.get('MDX', {}).items():
    print(f"  Friendly name: {friendly_name!r}")
    print(f"    Info: {info}")
    print()
