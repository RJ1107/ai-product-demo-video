"""Compose real browser footage, measured narration and sentence captions. Standard library only."""
import argparse
import json
import math
import shutil
import subprocess
import wave
from pathlib import Path


def run(args, cwd=None):
    subprocess.run(args, cwd=cwd, check=True)


def stamp(seconds, ass=False):
    if ass:
        ticks=round(seconds*100)
        return f'{ticks//360000}:{ticks//6000%60:02}:{ticks//100%60:02}.{ticks%100:02}'
    ticks=round(seconds*1000)
    return f'{ticks//3600000:02}:{ticks//60000%60:02}:{ticks//1000%60:02},{ticks%1000:03}'


def escape_ass(text):
    return str(text).replace('\\','\\\\').replace('{',r'\{').replace('}',r'\}').replace('\n',r'\N')


ASS_HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,32,&H00FFFFFF,&H00FFFFFF,&H001B1824,&H001B1824,0,0,0,0,100,100,0,0,3,2,0,2,115,115,45,1
Style: Title,Arial,25,&H00FFFFFF,&H00FFFFFF,&H001B1824,&H001B1824,0,0,0,0,100,100,0,0,3,2,0,7,38,38,28,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project',default='.')
    parser.add_argument('--ffmpeg',default=None)
    parser.add_argument('--silent-preview',action='store_true')
    args=parser.parse_args()
    root=Path(args.project).resolve();build=root/'build';out=root/'exports';out.mkdir(exist_ok=True)
    ffmpeg=args.ffmpeg or shutil.which('ffmpeg')
    if not ffmpeg:
        raise SystemExit('FFmpeg is required. Install a build with H.264, AAC and the subtitles filter, or pass --ffmpeg PATH.')
    plan=json.loads((root/'plan.json').read_text(encoding='utf-8'))
    recording=json.loads((build/'recording.json').read_text(encoding='utf-8'))
    if not recording.get('complete'):
        raise SystemExit('Recording is incomplete. Fix the scenario and record again.')
    if recording.get('pageErrors'):
        raise SystemExit('Browser errors were recorded. Resolve them or document and clear the reviewed errors before composing.')
    raw=Path(recording['raw']);raw=raw if raw.is_absolute() else root/raw
    speech={'clips':[]} if args.silent_preview else json.loads((build/'speech.json').read_text(encoding='utf-8'))
    total=0;captions=[];report=[];parts=[]
    for number,scene in enumerate(plan['scenes']):
        take=next((s for s in recording['scenes'] if s['id']==scene['id']),None)
        if not take:raise SystemExit(f'Missing recorded scene: {scene["id"]}')
        pcm=bytearray(b'\0'*int(.4*48000)*2);local_captions=[]
        if not args.silent_preview:
            for index,text in enumerate(scene.get('sentences',[])):
                clip=next((c for c in speech['clips'] if c['sceneId']==scene['id'] and c['index']==index),None)
                if not clip or clip['text']!=text:raise SystemExit(f'Narration changed for {scene["id"]}; regenerate or re-import audio.')
                audio=root/clip['file'];wav=build/f'audio-{number}-{index}.wav'
                run([str(ffmpeg),'-hide_banner','-loglevel','error','-y','-i',str(audio),'-ar','48000','-ac','1','-c:a','pcm_s16le',str(wav)])
                with wave.open(str(wav),'rb') as reader:
                    frames=reader.readframes(reader.getnframes());duration=len(frames)/2/48000
                start=len(pcm)/2/48000;local_captions.append((start,start+duration,text));pcm.extend(frames);pcm.extend(b'\0'*int(.25*48000)*2)
        else:
            text=' '.join(scene.get('sentences',[]))
            if text:local_captions=[(.4,max(1,float(take['duration'])-.3),text)]
        duration=max(float(take['duration']),float(scene.get('minSeconds',4)),len(pcm)/2/48000+.3)
        duration=math.ceil(duration*30)/30
        pcm.extend(b'\0'*max(0,int(duration*48000)*2-len(pcm)))
        audio=build/f'scene-{number}.wav'
        with wave.open(str(audio),'wb') as writer:writer.setnchannels(1);writer.setsampwidth(2);writer.setframerate(48000);writer.writeframes(pcm)
        title=scene.get('title',scene['id'])+(' · SILENT PREVIEW' if args.silent_preview else '')
        events=[f'Dialogue: 0,0:00:00.00,{stamp(duration,True)},Title,,0,0,0,,{escape_ass(title)}']
        for start,end,text in local_captions:
            events.append(f'Dialogue: 1,{stamp(start,True)},{stamp(end,True)},Caption,,0,0,0,,{escape_ass(text)}')
            captions.append((total+start,total+end,text))
        ass=build/f'scene-{number}.ass';ass.write_text(ASS_HEADER+'\n'.join(events)+'\n',encoding='utf-8')
        part=build/f'scene-{number}.mp4'
        # A small lead-in protects against browser recorder initialization jitter.
        start=max(0,float(take['start'])-.15)
        video_filter=f"scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x171823,setsar=1,tpad=stop_mode=clone:stop_duration={duration:.3f},subtitles=scene-{number}.ass"
        run([str(ffmpeg),'-hide_banner','-loglevel','error','-y','-ss',f'{start:.4f}','-t',str(take['duration']),'-i',str(raw),'-i',str(audio),'-vf',video_filter,'-t',f'{duration:.4f}','-r','30','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',str(part)],cwd=build)
        parts.append(part);report.append({'id':scene['id'],'outputStart':total,'duration':duration,'captionCount':len(local_captions)});total+=duration
    concat=build/'concat.txt';concat.write_text(''.join(f"file 'scene-{i}.mp4'\n" for i in range(len(parts))),encoding='utf-8')
    final=out/('preview-silent-1080p.mp4' if args.silent_preview else 'demo-1080p.mp4')
    run([str(ffmpeg),'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(final)])
    srt='\n\n'.join(f'{i+1}\n{stamp(start)} --> {stamp(end)}\n{text}' for i,(start,end,text) in enumerate(captions))+'\n'
    (out/'captions.en.srt').write_text(srt,encoding='utf-8')
    (out/'narration.en.txt').write_text(' '.join(text for _,_,text in captions)+'\n',encoding='utf-8')
    (out/'recording-report.json').write_text(json.dumps({'output':final.name,'resolution':[1920,1080],'duration':total,'narration':speech.get('source','silent preview'),'disclosures':plan.get('disclosures',[]),'scenes':report,'reviewRequired':'Watch output, check product claims and verify media streams before delivery.'},indent=2)+'\n',encoding='utf-8')
    print(f'Exported {final} ({total:.2f}s). Review before delivery.')


if __name__=='__main__':main()
