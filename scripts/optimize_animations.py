import os
from PIL import Image, ImageSequence

def optimize_animations():
    dirs = ['apps/web/public/animations', 'public/animation']
    for anim_dir in dirs:
        if not os.path.exists(anim_dir):
            continue
        print(f"\nProcessing directory: {anim_dir}")
        for fn in os.listdir(anim_dir):
            if fn.endswith('.tmp.gif'):
                try:
                    os.remove(os.path.join(anim_dir, fn))
                except Exception:
                    pass
        for fn in sorted(os.listdir(anim_dir)):
            if not fn.endswith('.gif') or fn.endswith('.tmp.gif'):
                continue
            p = os.path.join(anim_dir, fn)
            orig_sz = os.path.getsize(p)

            try:
                with Image.open(p) as im:
                    dur = im.info.get('duration', 100)
                    loop = im.info.get('loop', 0)
                    frames = [f.copy() for f in ImageSequence.Iterator(im)]
                rgba_frames = [f.convert('RGBA') for f in frames]

                # 1. Overwrite with optimized GIF
                temp_gif = p + '.tmp.gif'
                frames[0].save(
                    temp_gif,
                    format='GIF',
                    save_all=True,
                    append_images=frames[1:],
                    optimize=True,
                    loop=loop,
                    duration=dur,
                    disposal=2
                )
                new_gif_sz = os.path.getsize(temp_gif)

                if new_gif_sz < orig_sz:
                    os.replace(temp_gif, p)
                    print(f"  [GIF]  {fn:22s}: {orig_sz:>7d}B -> {new_gif_sz:>7d}B ({100*(1 - new_gif_sz/orig_sz):.1f}% reduction)")
                else:
                    if os.path.exists(temp_gif):
                        os.remove(temp_gif)
                    print(f"  [GIF]  {fn:22s}: {orig_sz:>7d}B (already optimal)")

                # 2. Also generate animated WebP version
                webp_fn = os.path.splitext(fn)[0] + '.webp'
                webp_path = os.path.join(anim_dir, webp_fn)
                rgba_frames[0].save(
                    webp_path,
                    format='WEBP',
                    save_all=True,
                    append_images=rgba_frames[1:],
                    duration=dur,
                    loop=loop,
                    quality=80,
                    method=4
                )
                webp_sz = os.path.getsize(webp_path)
                print(f"  [WEBP] {webp_fn:22s}: {webp_sz:>7d}B ({100*(1 - webp_sz/orig_sz):.1f}% smaller than orig GIF)")

            except Exception as e:
                print(f"  [ERROR] Failed on {fn}: {e}")

if __name__ == '__main__':
    optimize_animations()
