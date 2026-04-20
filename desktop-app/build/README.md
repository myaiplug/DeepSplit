# Build Resources

This directory contains resources needed for building desktop installers.

## Icon Files

The following icon files need to be generated from `icon.svg`:

### For Windows (.ico)
```bash
# Install ImageMagick if not already installed
# Then convert SVG to multi-resolution ICO
magick convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

Or use an online tool like:
- https://convertio.co/svg-ico/
- https://cloudconvert.com/svg-to-ico

Upload `icon.svg` and download as `icon.ico` with multiple resolutions (16, 32, 48, 64, 128, 256).

### For macOS (.icns)
```bash
# Create iconset directory
mkdir icon.iconset

# Generate multiple resolutions (requires ImageMagick or similar)
magick convert icon.svg -resize 16x16 icon.iconset/icon_16x16.png
magick convert icon.svg -resize 32x32 icon.iconset/icon_16x16@2x.png
magick convert icon.svg -resize 32x32 icon.iconset/icon_32x32.png
magick convert icon.svg -resize 64x64 icon.iconset/icon_32x32@2x.png
magick convert icon.svg -resize 128x128 icon.iconset/icon_128x128.png
magick convert icon.svg -resize 256x256 icon.iconset/icon_128x128@2x.png
magick convert icon.svg -resize 256x256 icon.iconset/icon_256x256.png
magick convert icon.svg -resize 512x512 icon.iconset/icon_256x256@2x.png
magick convert icon.svg -resize 512x512 icon.iconset/icon_512x512.png
magick convert icon.svg -resize 1024x1024 icon.iconset/icon_512x512@2x.png

# Convert to icns (macOS only)
iconutil -c icns icon.iconset
```

Or use an online tool:
- https://cloudconvert.com/svg-to-icns
- https://anyconv.com/svg-to-icns-converter/

### For Linux
```bash
# Create icons directory
mkdir -p icons
cd icons

# Generate standard sizes
magick convert ../icon.svg -resize 16x16 16x16.png
magick convert ../icon.svg -resize 32x32 32x32.png
magick convert ../icon.svg -resize 48x48 48x48.png
magick convert ../icon.svg -resize 64x64 64x64.png
magick convert ../icon.svg -resize 128x128 128x128.png
magick convert ../icon.svg -resize 256x256 256x256.png
magick convert ../icon.svg -resize 512x512 512x512.png
```

## Files in this directory

- `icon.svg` - Source icon file (can be customized)
- `icon.ico` - Windows icon (needs to be generated)
- `icon.icns` - macOS icon (needs to be generated)
- `icons/` - Linux icon directory (needs to be generated)
- `installer.nsh` - Windows NSIS installer customization script
- `entitlements.mac.plist` - macOS code signing entitlements

## Automated Icon Generation in CI

To generate icons automatically in GitHub Actions, add this step before building:

```yaml
- name: Generate icons
  run: |
    sudo apt-get update
    sudo apt-get install -y imagemagick
    cd desktop-app/build
    # Generate .ico for Windows
    convert icon.svg -define icon:auto-resize=256,128,64,48,32,16 icon.ico
    # Additional steps for .icns if building on macOS
```
