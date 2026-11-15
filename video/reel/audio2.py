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
    if st<27.6: put(mus,taiko(),st,0.34)
    if 2.2<=st<27.6: put(mus,taiko(),st+CL/4*1.5,0.2)
# ---- SFX: original sound effects from the user's clip, cut to match each shot
def rd2(p):
    w=wave.open(p); x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
    return x.reshape(-1,w.getnchannels()).T
so=rd2(f'{W}/sfx_orig.wav'); sfx=np.zeros((2,N)); n=min(N,so.shape[1]); sfx[:,:n]=so[:,:n]
sfx/=np.max(np.abs(sfx))+1e-9
# ---- voice
voice=np.zeros(N); a=rd(f'{W}/vA.wav'); b=rd(f'{W}/vB.wav')
voice[:len(a)]+=a; i=int(21.0*SR); voice[i:i+len(b)]+=b[:N-i]
voice/=np.max(np.abs(voice))+1e-9; voice*=0.89
# duck music under voice
win=int(0.05*SR); e=np.sqrt(np.convolve(voice**2,np.ones(win)/win,'same'))
dk=np.convolve((e>0.02).astype(float),np.ones(int(0.25*SR))/int(0.25*SR),'same')
duck=1-0.30*np.clip(dk,0,1)
mus*=duck; fin=np.ones(N); fo=int(1.5*SR); fin[-fo:]=np.linspace(1,0,fo)
mus/=np.max(np.abs(mus))+1e-9
mix=mus*0.80+sfx*0.55*(0.75+0.25*(1-np.clip(dk,0,1)))+np.vstack([voice,voice])*0.95
mix*=fin; mix/=max(1,np.max(np.abs(mix))/0.95)
wr(f'{W}/mix.wav',mix); print('ok')
