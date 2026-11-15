import numpy as np, wave, os
SR=44100; DUR=30.0; N=int(SR*DUR); W=os.path.dirname(os.path.abspath(__file__))
rng=np.random.default_rng(7)
def rd(p):
    w=wave.open(p); a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768; return a
def wr(p,x):
    x=np.clip(x,-1,1); w=wave.open(p,'w'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x*32767).astype(np.int16).T.copy().tobytes()); w.close()
def lp(x,fc):  # FFT brickwall-ish lowpass with soft rolloff
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(f/fc)**4); return np.fft.irfft(X,len(x))
def hp(x,fc):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(fc/np.maximum(f,1))**4); return np.fft.irfft(X,len(x))
t=np.arange(N)/SR
def env(a,d,n):
    e=np.ones(n); na=int(a*SR); e[:na]=np.linspace(0,1,na) if na else 1; return e*np.exp(-np.arange(n)/SR/d)
def put(buf,x,at,g=1.0):
    i=int(at*SR); n=min(len(x),N-i)
    if n>0: buf[:,i:i+n]+=g*(x[:,:n] if x.ndim==2 else np.vstack([x[:n],x[:n]]))
mtof=lambda m:440*2**((m-69)/12)
mus=np.zeros((2,N))
# chords (A minor cinematic): Am F C G ; 3.75s each
prog=[[57,60,64],[53,57,60],[48,55,64],[55,59,62]]
CL=3.75
for k in range(int(DUR/CL)+1):
    ch=prog[k%4]; st=k*CL; n=int((CL+1.0)*SR); tt=np.arange(n)/SR
    e=np.minimum(1,tt/0.8)*np.minimum(1,np.maximum(0,(CL+1.0-tt))/1.0)
    for m in ch+[ch[0]-12]:
        for det in (-0.12,0.0,0.12):
            fr=mtof(m+det)*(1+0.003*np.sin(2*np.pi*5*tt))
            ph=2*np.cumsum(fr)/SR*np.pi
            s=(np.sin(ph)+0.5*np.sin(2*ph)+0.25*np.sin(3*ph))*e*0.018
            pan=0.5+0.3*det/0.12
            put(mus,np.vstack([s*(1-pan),s*pan]),st)
mus=np.vstack([lp(mus[0],2200),lp(mus[1],2200)])
# piano arpeggio eighths at 128bpm-ish (0.234s) ; louder after 11.5
step=CL/16
for k in range(int(DUR/step)):
    st=k*step; ch=prog[int(st//CL)%4]; m=(ch+[ch[0]+12])[k%4]+12
    n=int(1.2*SR); tt=np.arange(n)/SR; f=mtof(m)
    s=(np.sin(2*np.pi*f*tt)+0.4*np.sin(4*np.pi*f*tt)+0.15*np.sin(6*np.pi*f*tt))*np.exp(-tt*4)*np.minimum(1,tt/0.003)
    g=0.035 if st<11.5 else 0.05
    if st>=27.6: g=0.03
    put(mus,s,st,g)
# taiko: low drum with pitch drop
def taiko(g=1):
    n=int(0.9*SR); tt=np.arange(n)/SR; f=55+90*np.exp(-tt*25)
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*6)+0.3*rng.standard_normal(n)*np.exp(-tt*40)
    return lp(s,1500)*g
for k in range(int(DUR/(CL/2))):
    st=k*CL/2
    if 11.5<=st<27.6 or st<2.2: put(mus,taiko(),st,0.32)
    if 11.5<=st<27.6: put(mus,taiko(),st+CL/4*1.5,0.18)
# ---- SFX
sfx=np.zeros((2,N))
def whoosh(d=0.6):
    n=int(d*SR); tt=np.arange(n)/SR; x=rng.standard_normal(n)
    e=np.sin(np.pi*tt/d)**2; x=hp(lp(x,3000),300)*e
    pan=np.linspace(0.1,0.9,n); return np.vstack([x*(1-pan),x*pan])*0.35
def impact():
    n=int(1.6*SR); tt=np.arange(n)/SR; f=45+120*np.exp(-tt*18)
    s=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*3.2)+0.5*lp(rng.standard_normal(n),2500)*np.exp(-tt*14)
    return s*0.6
def braam():
    n=int(2.4*SR); tt=np.arange(n)/SR; s=np.zeros(n)
    for m,g in((33,1),(40,.7),(45,.6),(28,.8)):
        f=mtof(m); s+=g*np.sign(np.sin(2*np.pi*f*tt))*0.3+g*np.sin(2*np.pi*f*1.005*tt)*.4
    s=lp(s,900)*np.minimum(1,tt/0.04)*np.exp(-tt*1.3); return s*0.4
def riser(d=1.4):
    n=int(d*SR); tt=np.arange(n)/SR; x=rng.standard_normal(n)
    x=hp(x,800)*(tt/d)**2*0.25; f=200+1400*(tt/d)**2
    x+=np.sin(2*np.pi*np.cumsum(f)/SR)*(tt/d)**2*0.08; return x
def ding():
    n=int(1.5*SR); tt=np.arange(n)/SR
    return sum(np.sin(2*np.pi*f*tt)*g for f,g in((1318,1),(1975,.5),(2637,.25)))*np.exp(-tt*3)*0.18
def tick():
    n=int(0.05*SR); return hp(rng.standard_normal(n),2000)*np.exp(-np.arange(n)/SR*90)*0.25
CUTS=[2.2,4.75,5.7,6.6,9.1,11.55,12.6,14.4,16.0,17.5,18.4,20.8,22.4,27.6]
put(sfx,braam(),0.0); put(sfx,impact(),0.05,0.7)
special={2.2:'impact',11.55:'impact',22.4:'impact',27.6:'ding',18.4:'impact'}
for c in CUTS:
    k=special.get(c,'whoosh')
    if k=='whoosh': put(sfx,whoosh(),c-0.3)
    elif k=='impact': put(sfx,whoosh(0.5),c-0.35,0.7); put(sfx,impact(),c,0.75)
    else: put(sfx,ding(),c)
put(sfx,riser(1.5),11.55-1.5); put(sfx,riser(1.4),22.4-1.4)
put(sfx,impact(),15.65,0.9)          # બાકાજીકી stamp
for k in range(14): put(sfx,tick(),7.0+k*0.31,0.8)   # clock ticks while waiting
put(sfx,ding(),21.5,0.8); put(sfx,ding(),26.4,0.9)  # comment bubble, enrol
# guarantee an SFX hit at least every 3 s
hits=sorted(CUTS+[0,15.65,21.5,26.4])
for g in np.arange(0,30,3.0):
    if min(abs(g-h) for h in hits)>0.8: put(sfx,whoosh(0.5),g-0.25,0.8); hits.append(g)
# ---- voice
voice=np.zeros(N); a=rd(f'{W}/vA.wav'); b=rd(f'{W}/vB.wav')
voice[:len(a)]+=a; i=int(21.0*SR); voice[i:i+len(b)]+=b[:N-i]
voice/=np.max(np.abs(voice))+1e-9; voice*=0.89
# duck music under voice
win=int(0.05*SR); e=np.sqrt(np.convolve(voice**2,np.ones(win)/win,'same'))
dk=np.convolve((e>0.02).astype(float),np.ones(int(0.25*SR))/int(0.25*SR),'same')
duck=1-0.55*np.clip(dk,0,1)
mus*=duck; fin=np.ones(N); fo=int(1.5*SR); fin[-fo:]=np.linspace(1,0,fo)
mix=mus*0.85+sfx*0.55+np.vstack([voice,voice])
mix*=fin; mix/=max(1,np.max(np.abs(mix))/0.95)
wr(f'{W}/mix.wav',mix); print('hits',sorted(round(h,2) for h in hits))
