import os
from PIL import Image

def generate_logo_assets():
    src_path = 'public/img/logo.png'
    if not os.path.exists(src_path):
        print(f"Error: {src_path} does not exist.")
        return

    im = Image.open(src_path).convert('RGBA')

    # Bounding box crop
    bbox = im.getbbox()
    cropped = im.crop(bbox)
    w, h = cropped.size

    # Create square canvas with ~8% balanced padding
    max_dim = max(w, h)
    padding = int(max_dim * 0.08)
    canvas_size = max_dim + 2 * padding
    square = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = ((canvas_size - w) // 2, (canvas_size - h) // 2)
    square.paste(cropped, offset, cropped)

    # Output directories
    public_logo_dir = 'public/logo'
    web_public_dir = 'apps/web/public'
    web_logo_dir = os.path.join(web_public_dir, 'logo')
    web_icons_dir = os.path.join(web_public_dir, 'icons')

    for d in [public_logo_dir, web_logo_dir, web_icons_dir]:
        os.makedirs(d, exist_ok=True)

    # 1. High-res logo files
    square_512 = square.resize((512, 512), Image.Resampling.LANCZOS)
    square_512.save(os.path.join(public_logo_dir, 'logo.png'), 'PNG', optimize=True)
    square_512.save(os.path.join(web_logo_dir, 'logo.png'), 'PNG', optimize=True)
    square_512.save(os.path.join(web_public_dir, 'logo.png'), 'PNG', optimize=True)

    # Also preserve the original cropped rectangular logo for wide uses
    cropped.save(os.path.join(web_logo_dir, 'logo-wide.png'), 'PNG', optimize=True)
    cropped.save(os.path.join(public_logo_dir, 'logo-wide.png'), 'PNG', optimize=True)

    # 2. PWA icon sizes
    sizes = [72, 96, 128, 192, 384, 512]
    for sz in sizes:
        icon_resized = square.resize((sz, sz), Image.Resampling.LANCZOS)
        icon_path = os.path.join(web_icons_dir, f'icon-{sz}x{sz}.png')
        icon_resized.save(icon_path, 'PNG', optimize=True)
        print(f"Generated {icon_path} ({sz}x{sz})")

    # 3. Apple Touch Icon (180x180 & 192x192)
    apple_180 = square.resize((180, 180), Image.Resampling.LANCZOS)
    apple_180.save(os.path.join(web_public_dir, 'apple-touch-icon.png'), 'PNG', optimize=True)
    print("Generated apple-touch-icon.png")

    # 4. Favicons
    fav_32 = square.resize((32, 32), Image.Resampling.LANCZOS)
    fav_32.save(os.path.join(web_public_dir, 'favicon.png'), 'PNG', optimize=True)
    fav_16 = square.resize((16, 16), Image.Resampling.LANCZOS)
    
    # Favicon.ico with multiple sizes (16, 32, 48)
    fav_48 = square.resize((48, 48), Image.Resampling.LANCZOS)
    fav_48.save(
        os.path.join(web_public_dir, 'favicon.ico'),
        format='ICO',
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[fav_16, fav_32]
    )
    print("Generated favicon.ico and favicon.png")

    print("All logo and icon assets successfully generated.")

if __name__ == '__main__':
    generate_logo_assets()
