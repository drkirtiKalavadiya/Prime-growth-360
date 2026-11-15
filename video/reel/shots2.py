import subprocess, json, os
from concurrent.futures import ThreadPoolExecutor
SRC='/root/.claude/uploads/b37935ab-01e7-563a-af4e-a8bb3182aa8d/'+[f for f in os.listdir('/root/.claude/uploads/b37935ab-01e7-563a-af4e-a8bb3182aa8d') if f.startswith('8339e31d')][0]
W=os.path.dirname(os.path.abspath(__file__)); FPS=30; SR=44100
# (dst_start, dst_end, src_start, src_end, shake)
SHOTS=[
 (0.00,0.70, 0.30,1.00,1),(0.70,1.40, 4.98,5.68,0),(1.40,2.20, 1.20,2.08,0),        # hook 99%
 (2.20,3.00, 6.80,7.60,1),(3.00,3.70, 4.22,4.92,0),(3.70,4.75,12.05,12.95,0),       # perfection chakkar
 (4.75,5.45, 3.68,4.20,1),(5.45,6.20, 4.22,4.95,0),(6.20,7.00, 9.12,9.92,0),
 (7.00,7.80, 6.95,7.75,0),(7.80,8.60, 9.95,10.75,0),(8.60,9.40, 4.98,5.78,0),
 (9.40,10.30,12.05,12.95,0),(10.30,11.55,12.98,14.23,0),                            # waiting
 (11.55,12.10,2.13,2.53,1),(12.10,12.75,2.56,3.20,0),(12.75,13.40,3.02,3.66,0),
 (13.40,14.00,6.00,6.60,0),(14.00,14.60,7.88,8.48,1),(14.60,15.20,8.20,8.78,0),
 (15.20,15.65,8.80,9.09,0),(15.65,16.40,6.05,6.78,1),(16.40,17.50,7.88,8.78,0),     # unperfection action
 (17.50,18.10,8.80,9.09,1),(18.10,19.40,10.80,12.03,0),(19.40,20.10,7.95,8.65,0),(20.10,20.80,11.30,12.00,1), # lesson
 (20.80,21.60,13.00,13.80,0),(21.60,22.40,14.20,15.00,0),                           # question
 (22.40,23.20,10.80,11.60,1),(23.20,24.00,7.90,8.70,0),(24.00,24.80,2.60,3.40,0),
 (24.80,25.60,5.50,6.30,0),(25.60,26.40,6.82,7.62,0),(26.40,27.60,10.82,12.02,1),   # CTA
 (27.60,30.00,0.00,2.08,0)]                                                         # end card (hidden)
def render(i):
    ds,de,ss,se,shake=SHOTS[i]; D=de-ds; f=D/(se-ss)
    nfr=round(de*FPS)-round(ds*FPS)
    interp=f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:vsbmc=1" if f>1.15 else f"fps={FPS}"
    z=f"(1.0+0.12*exp(-t*12)+0.06*t/{D:.3f})"
    sh="+30*sin(t*70)*exp(-t*8)" if shake else ""; shy="+20*cos(t*55)*exp(-t*8)" if shake else ""
    vf=(f"trim={ss}:{se},setpts=(PTS-STARTPTS)*{f:.5f},{interp},tpad=stop_mode=clone:stop=90,"
        f"scale=w='trunc(1080*{z}/2)*2':h=-2:eval=frame:flags=lanczos,"
        f"crop=1080:1920:x='(iw-1080)/2{sh}':y='(ih-1920)/2{shy}',unsharp=5:5:0.6,setsar=1,format=yuv420p")
    subprocess.run(['ffmpeg','-v','error','-y','-i',SRC,'-an','-vf',vf,'-frames:v',str(nfr),'-c:v','libx264','-crf','14','-preset','fast','-r',str(FPS),f"{W}/shots2/s{i:02d}.mp4"],check=True)
    # matching original SFX for this shot (time-stretched to fit), short fades against clicks
    ad=nfr/FPS
    af=f"atrim={ss}:{se},asetpts=PTS-STARTPTS,atempo={max(0.5,min(2.0,1/f)):.5f},apad,atrim=0:{ad:.5f},afade=t=in:d=0.012,afade=t=out:st={ad-0.02:.4f}:d=0.02"
    subprocess.run(['ffmpeg','-v','error','-y','-i',SRC,'-vn','-af',af,'-ar',str(SR),'-ac','2',f"{W}/shots2/a{i:02d}.wav"],check=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(render,range(len(SHOTS))))
for k,ext in (('s','mp4'),('a','wav')):
    open(f"{W}/shots2/{k}.txt","w").write("".join(f"file '{W}/shots2/{k}{i:02d}.{ext}'\n" for i in range(len(SHOTS))))
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{W}/shots2/s.txt','-c','copy',f'{W}/bg2.mp4'],check=True)
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',f'{W}/shots2/a.txt',f'{W}/sfx_orig.wav'],check=True)
json.dump(SHOTS,open(f"{W}/shots2.json","w")); print('cuts',[s[0] for s in SHOTS[1:]])
