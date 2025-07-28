#!/usr/bin/env python3
"""
Generate PWA icons from the existing favicon.png
Requires Pillow: pip install Pillow
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow is required but not installed.")
    print("Install it with: pip install Pillow")
    sys.exit(1)

def generate_pwa_icons():
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    source_icon = project_root / "public" / "favicon.png"
    output_dir = project_root / "public"
    
    # Check if source icon exists
    if not source_icon.exists():
        print(f"Source icon not found: {source_icon}")
        sys.exit(1)
    
    # Open the source image
    with Image.open(source_icon) as img:
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Generate icons in various sizes
        sizes = [48, 72, 96, 144, 192, 512]
        
        print("Generating PWA icons...")
        
        for size in sizes:
            output_file = output_dir / f"icon-{size}.png"
            print(f"Creating {output_file.name}...")
            
            # Resize using LANCZOS filter for best quality
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(output_file, "PNG")
        
        # Create a maskable icon (with padding for Android)
        # Maskable icons need safe area of 80% (40% radius from center)
        print("Creating maskable icon...")
        
        # First resize to fit within the safe area (80% of 512px = 410px)
        maskable_size = 410
        resized = img.resize((maskable_size, maskable_size), Image.Resampling.LANCZOS)
        
        # Create a new 512x512 image with transparent background
        maskable = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
        
        # Paste the resized image in the center
        offset = (512 - maskable_size) // 2
        maskable.paste(resized, (offset, offset))
        
        maskable_output = output_dir / "icon-maskable.png"
        maskable.save(maskable_output, "PNG")
    
    print("✅ PWA icons generated successfully!")
    print("\nGenerated icons:")
    for icon_file in sorted(output_dir.glob("icon-*.png")):
        print(f"  {icon_file}")

if __name__ == "__main__":
    generate_pwa_icons()