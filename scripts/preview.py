"""Export a short, silent, looping preview from a demo, for a README or a chat message. Standard library only.

The output extension picks the format: .webp (animated WebP, far smaller, renders in GitHub READMEs) or .gif.
"""
import argparse
import subprocess
from pathlib import Path

from compose import find_ffmpeg


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',default='.')
    parser.add_argument('--input',default=None,help='Video to excerpt. Default: exports/demo-1080p.mp4 in the project.')
    parser.add_argument('--out',default=None,help='Default: exports/preview.webp in the project. Use a .gif name for a GIF.')
    parser.add_argument('--start',type=float,default=0)
    parser.add_argument('--duration',type=float,default=12)
    parser.add_argument('--width',type=int,default=960)
    parser.add_argument('--fps',type=int,default=12)
    parser.add_argument('--quality',type=int,default=60,help='WebP quality, 1-100. Ignored for GIF.')
    parser.add_argument('--ffmpeg',default=None)
    args=parser.parse_args()
    root=Path(args.project).resolve()
    source=Path(args.input).resolve() if args.input else root/'exports'/'demo-1080p.mp4'
    out=Path(args.out).resolve() if args.out else root/'exports'/'preview.webp'
    if not source.is_file():
        raise SystemExit(f'Missing input video: {source}. Compose the demo first or pass --input.')
    if out.suffix.lower() not in ('.webp','.gif'):
        raise SystemExit('The output name must end in .webp or .gif.')
    if args.duration<=0 or args.width<160 or not 1<=args.fps<=30 or not 1<=args.quality<=100:
        raise SystemExit('Use a positive --duration, --width of at least 160, --fps between 1 and 30 and --quality between 1 and 100.')
    out.parent.mkdir(parents=True,exist_ok=True)
    command=[str(find_ffmpeg(args.ffmpeg)),'-hide_banner','-loglevel','error','-y','-ss',f'{args.start:.3f}','-t',f'{args.duration:.3f}','-i',str(source)]
    scale=f'fps={args.fps},scale={args.width}:-2:flags=lanczos'
    if out.suffix.lower()=='.webp':
        command+=['-vf',scale,'-c:v','libwebp_anim','-lossless','0','-q:v',str(args.quality),'-compression_level','5','-an']
    else:
        # One palette for the whole clip keeps captions sharp; rectangle diffing keeps static interfaces small.
        command+=['-filter_complex',scale+',split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle']
    subprocess.run(command+['-loop','0',str(out)],check=True)
    print(f'Exported {out} ({out.stat().st_size/1e6:.1f} MB). It has no sound: link the MP4 next to it.')


if __name__=='__main__':main()
