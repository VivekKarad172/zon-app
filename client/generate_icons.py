from PIL import Image
import os

logo_path = 'new_app_logo.png'
res_dir = os.path.join('android', 'app', 'src', 'main', 'res')

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

fg_sizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
}

if not os.path.exists(logo_path):
    print("new_app_logo.png not found!")
    exit(1)

logo_img = Image.open(logo_path).convert("RGBA")

# Create a function to place image on center of background
def create_icon(img, size, bg_color):
    # calculate new size maintaining aspect ratio
    aspect_ratio = img.width / img.height
    new_w = size
    new_h = size
    
    # We want some padding, so let's scale it to 80% of the box
    target_size = int(size * 0.8)
    if aspect_ratio > 1:
        new_w = target_size
        new_h = int(target_size / aspect_ratio)
    else:
        new_h = target_size
        new_w = int(target_size * aspect_ratio)
        
    resized_logo = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    background = Image.new('RGBA', (size, size), bg_color)
    offset = ((size - new_w) // 2, (size - new_h) // 2)
    background.paste(resized_logo, offset, resized_logo)
    return background

for folder, size in sizes.items():
    out_dir = os.path.join(res_dir, folder)
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    # Standard and Round icons (white bg)
    icon = create_icon(logo_img, size, (255, 255, 255, 255))
    icon.save(os.path.join(out_dir, 'ic_launcher.png'))
    icon.save(os.path.join(out_dir, 'ic_launcher_round.png'))
    print(f"Generated {folder} launcher icons")

for folder, size in fg_sizes.items():
    out_dir = os.path.join(res_dir, folder)
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    # Foreground icon (transparent bg)
    icon = create_icon(logo_img, size, (255, 255, 255, 0))
    icon.save(os.path.join(out_dir, 'ic_launcher_foreground.png'))
    print(f"Generated {folder} foreground icon")

print("Successfully generated all Android icons!")
