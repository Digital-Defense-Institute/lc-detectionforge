#!/bin/bash

# Generate PWA icons from the existing favicon.png
# Requires ImageMagick (brew install imagemagick)

SOURCE_ICON="public/favicon.png"
OUTPUT_DIR="public"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed."
    echo "Install it with: brew install imagemagick"
    exit 1
fi

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Source icon not found: $SOURCE_ICON"
    exit 1
fi

# Generate icons in various sizes
SIZES=(48 72 96 144 192 512)

echo "Generating PWA icons..."

for SIZE in "${SIZES[@]}"; do
    OUTPUT_FILE="$OUTPUT_DIR/icon-$SIZE.png"
    echo "Creating $OUTPUT_FILE..."
    convert "$SOURCE_ICON" -resize "${SIZE}x${SIZE}" "$OUTPUT_FILE"
done

# Create a maskable icon (with padding for Android)
# Maskable icons need 20% padding on all sides
echo "Creating maskable icon..."
convert "$SOURCE_ICON" \
    -resize 410x410 \
    -gravity center \
    -background transparent \
    -extent 512x512 \
    "$OUTPUT_DIR/icon-maskable.png"

echo "✅ PWA icons generated successfully!"
echo ""
echo "Generated icons:"
ls -la "$OUTPUT_DIR"/icon-*.png | awk '{print "  " $9}'