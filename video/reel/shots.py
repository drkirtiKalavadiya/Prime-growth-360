import subprocess, json, sys, os
from concurrent.futures import ThreadPoolExecutor
SRC=[f for f in os.listdir('/root/.claude/uploads/b37935ab-01e7-563a-af4e-a8bb3182aa8d') if f.endswith('.mp4')][0]
SRC='/root/.claude/uploads/b37935ab-01e7-563a-af4e-a8bb3182aa8d/'+SRC
W=os.path.dirname(os.path.abspath(__file__))
# dst_start, dst_end, src_start, src_end, shake
SHOTS=[
 (0.00, 2.20, 0.00, 2.08, 1),   # wide pit - 99%
 (2.20, 4.75, 6.83, 7.84, 0),   # level closeup - perfection chakkar
 (4.75, 5.70, 3.70, 4.18, 1),   # briefcase tools
 (5.70, 6.60, 4.24, 4.93, 0),   # rulers/tape
 (6.60, 9.10, 9.12,10.76, 0),   # perfectionist measuring wide
 (9.10,11.55,12.07,12.93, 0),   # level closeup 2 - waiting
 (11.55,12.60, 2.15, 2.52, 1),  # rope gather - unperfection
 (12.60,14.40, 2.57, 3.64, 0),  # rope tying
 (14.40,16.00, 5.20, 6.76, 0),  # wide climbing start
 (16.00,17.50, 7.90, 8.76, 1),  # climbing
 (17.50,18.40, 8.81, 9.08, 1),  # foot on rung (fail?)
 (18.40,20.80,10.82,12.01, 1),  # winner on top - learn
 (20.80,22.40,12.99,15.03, 0),  # perfectionist looking up - shu kehvu
 (22.40,30.00,10.82,12.01, 0),  # CTA background (winner, heavy slow-mo, dimmed in overlay)
]
FPS=30
def render(i):
    ds,de,ss,se,shake=SHOTS[i]
    D=de-ds; sd=se-ss; f=D/sd
    nfr=round(de*FPS)-round(ds*FPS)
    interp = f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if f>1.35 else f"fps={FPS}"
    # snap zoom + slow push; T = seconds in shot
    z=f"(1.0+0.10*exp(-T*9)+0.05*T/{D:.3f})"
    sh = f"+28*sin(T*70)*exp(-T*7)" if shake else ""
    shy = f"+18*cos(T*55)*exp(-T*7)" if shake else ""
    vf=(f"trim={ss}:{se},setpts=(PTS-STARTPTS)*{f:.5f},{interp},tpad=stop_mode=clone:stop=90,"
        f"scale=w='trunc(1080*{z.replace('T','t')}/2)*2':h=-2:eval=frame:flags=lanczos,"
        f"crop=1080:1920:x='(iw-1080)/2{sh.replace('T','t')}':y='(ih-1920)/2{shy.replace('T','t')}',"
        f"unsharp=5:5:0.6,setsar=1,format=yuv420p")
    out=f"{W}/shots/s{i:02d}.mp4"
    subprocess.run(['ffmpeg','-v','error','-y','-i',SRC,'-an','-vf',vf,'-frames:v',str(nfr),
                    '-c:v','libx264','-crf','14','-preset','fast','-r',str(FPS),out],check=True)
    return out
with ThreadPoolExecutor(4) as ex: outs=list(ex.map(render,range(len(SHOTS))))
open(f"{W}/shots/list.txt","w").write("".join(f"file '{o}'\n" for o in outs))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{W}/shots/list.txt','-c','copy',f'{W}/bg.mp4'],check=True)
json.dump(SHOTS,open(f"{W}/shots.json","w"))
