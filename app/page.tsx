'use client';

import { useMemo, useRef, useState } from 'react';

type Scene = 'cover' | 'briefing' | 'light' | 'sound' | 'rubbing' | 'deduction' | 'ending';
type Tone = 'jade' | 'wood' | 'bronze';
type Suspect = 'musician' | 'maker' | 'merchant';

const toneNames: Record<Tone, string> = { jade: '清', wood: '暖', bronze: '沉' };
const clueData = {
  feather: { mark: '羽', title: '磨损的双羽纹', note: '右上方的羽尖有反复摩擦痕迹，不像自然锈蚀。' },
  wax: { mark: '火', title: '镜缘的朱色旧漆', note: '一小片朱漆卡在镜缘，可能来自收纳镜的木匣。' },
  crack: { mark: '裂', title: '二次打磨的裂口', note: '裂口被人耐心磨平，镜子损坏后仍长期使用。' },
  rhythm: { mark: '声', title: '四声曲牌暗号', note: '“清—暖—沉—清”与瓦舍后场常用的催场节奏相似。' },
  inscription: { mark: '石', title: '“湖州石家”作坊铭', note: '铭文说明铸造来处，却不能直接证明使用者身份。' },
};

const targets = [
  { id: 'feather', x: 73, y: 34 },
  { id: 'wax', x: 28, y: 68 },
  { id: 'crack', x: 52, y: 78 },
] as const;

const suspects: Array<{ id: Suspect; name: string; role: string; claim: string; mark: string }> = [
  { id: 'musician', name: '沈七娘', role: '瓦舍笛伎', claim: '“镜子是我的。羽纹是登台前摸出来的。”', mark: '羽' },
  { id: 'maker', name: '石安', role: '湖州镜匠', claim: '“镜背有我家字号，它自然属于石家。”', mark: '石' },
  { id: 'merchant', name: '卢生', role: '汴洛行商', claim: '“朱漆是我的货匣留下的，我带它走过很远。”', mark: '路' },
];

export default function Home() {
  const [scene, setScene] = useState<Scene>('cover');
  const [bagOpen, setBagOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [light, setLight] = useState({ x: 50, y: 50 });
  const [toneInput, setToneInput] = useState<Tone[]>([]);
  const [soundState, setSoundState] = useState<'idle'|'playing'|'wrong'|'solved'>('idle');
  const [soundAttempts, setSoundAttempts] = useState(0);
  const [activeTone, setActiveTone] = useState<Tone | null>(null);
  const [rubbed, setRubbed] = useState<number[]>([]);
  const [rubbing, setRubbing] = useState(false);
  const [suspect, setSuspect] = useState<Suspect | null>(null);
  const [reason, setReason] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const targetSequence: Tone[] = ['jade', 'wood', 'bronze', 'jade'];

  const evidence = useMemo(() => {
    const list = found.map(id => clueData[id as keyof typeof clueData]);
    if (soundState === 'solved') list.push(clueData.rhythm);
    if (rubbed.length >= 9) list.push(clueData.inscription);
    return list;
  }, [found, soundState, rubbed]);

  const score = Math.max(0, Math.min(100, 35 + found.length * 10 + (soundState === 'solved' ? 18 : 0) + Math.min(12, rubbed.length) + (suspect === 'musician' ? 18 : 4) - Math.max(0, soundAttempts - 1) * 3));
  const ending = suspect === 'musician'
    ? { title: '镜归七娘', rank: score >= 90 ? '特级照骨官' : '汴京寻物人', text: '你没被“石家”二字带走。作坊铭只能说明镜子在哪里制作，双羽的摩损和催场节奏才指向它长期陪伴的人。' }
    : suspect === 'maker'
      ? { title: '铭文的误导', rank: '作坊追迹者', text: '你找对了镜子的出生地，却把制造者当成了使用者。镜子会经过商贩、赠送和转卖，铭文不等于物权证明。' }
      : { title: '旅痕与主人', rank: '行迹采集者', text: '你捕捉到镜子的流转痕迹，但货匣只证明它被运送过。真正的长期使用痕迹，藏在人手总会碰到的羽纹上。' };

  const playNote = (tone: Tone, when = 0) => {
    window.setTimeout(() => {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.frequency.value = { jade: 784, wood: 392, bronze: 196 }[tone]; oscillator.type = tone === 'bronze' ? 'sine' : 'triangle';
      gain.gain.setValueAtTime(.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.2, ctx.currentTime + .02); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .55);
      oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .58);
      setActiveTone(tone); window.setTimeout(() => setActiveTone(null), 420);
    }, when);
  };

  const playSequence = () => {
    if (soundState === 'playing') return;
    setToneInput([]); setSoundState('playing');
    targetSequence.forEach((tone, i) => playNote(tone, i * 650));
    window.setTimeout(() => setSoundState('idle'), targetSequence.length * 650 + 150);
  };

  const tapTone = (tone: Tone) => {
    if (soundState === 'playing' || soundState === 'solved') return;
    playNote(tone); const next = [...toneInput, tone]; setToneInput(next);
    if (next.length === targetSequence.length) {
      setSoundAttempts(a => a + 1);
      const correct = next.every((t, i) => t === targetSequence[i]);
      if (correct) setSoundState('solved');
      else { setSoundState('wrong'); window.setTimeout(() => { setToneInput([]); setSoundState('idle'); }, 900); }
    }
  };

  const moveLight = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect(); if (!rect) return;
    const x = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(4, Math.min(94, ((clientY - rect.top) / rect.height) * 100)); setLight({ x, y });
    targets.forEach(t => { if (Math.hypot(x - t.x, y - t.y) < 10) setFound(old => old.includes(t.id) ? old : [...old, t.id]); });
  };

  const revealTile = (index: number) => { if (rubbing) setRubbed(old => old.includes(index) ? old : [...old, index]); };
  const restart = () => { setScene('cover'); setFound([]); setToneInput([]); setSoundState('idle'); setSoundAttempts(0); setRubbed([]); setSuspect(null); setReason(''); };

  return <main className={`shell game-shell scene-${scene}`}>
    <div className="grain" aria-hidden="true" />
    <header className="topbar game-topbar">
      <button className="brand" onClick={restart}><span className="seal">鉴</span><span>照骨镜<small>汴京失物案</small></span></button>
      <div className="case-progress"><span className={scene !== 'cover' ? 'active':''}>入档</span><i/><span className={['light','sound','rubbing','deduction','ending'].includes(scene) ? 'active':''}>验物</span><i/><span className={['deduction','ending'].includes(scene) ? 'active':''}>结案</span></div>
      <div className="header-actions"><button onClick={() => setBagOpen(true)} className="evidence-button">证物袋 <b>{evidence.length}</b></button><button className="source-link" onClick={() => setSourcesOpen(true)}>史实与出处</button></div>
    </header>

    {scene === 'cover' && <section className="hero case-cover scene-panel">
      <div className="case-stamp">1122<br/><small>宣和四年</small></div>
      <p className="eyebrow">开封府失物档 · 第 007 号</p>
      <h1>一面镜子<br/><em>三个都说是它的人</em></h1>
      <p className="intro">汴京州桥下捡到一面破镜。镜匠、行商与瓦舍乐工同时前来认领。<br/>你只有一盏灯的时间，找出它真正记得的人。</p>
      <div className="case-object"><div className="halo"/><div className="mirror static-mirror"><span className="mirror-ring ring-one"/><span className="mirror-ring ring-two"/><span className="mirror-heart">玄</span><span className="hidden-mark">羽</span></div><div className="evidence-tags"><span>裂口</span><span>朱漆</span><span>暗纹</span></div></div>
      <button className="primary" onClick={() => setScene('briefing')}><span>接下这宗奇案</span><b>→</b></button>
      <div className="game-stats"><span>约 3 分钟</span><span>3 种操作</span><span>多结局</span><span>可重玩</span></div>
    </section>}

    {scene === 'briefing' && <section className="briefing scene-panel">
      <div className="brief-card"><p className="eyebrow">开封府快报</p><h2>镜主人失踪的第七日</h2><p>拾镜人说，镜子被布包着放在州桥河阶下。布早已被水冲走，镜背却留下三处可疑痕迹。</p><blockquote>“别问镜子照见过谁，问它被谁摸过千万遍。”</blockquote><div className="brief-rules"><div><b>01</b><span>移灯找到 3 处痕迹</span></div><div><b>02</b><span>记住镜体的 4 声回响</span></div><div><b>03</b><span>拓出被锈蚀遮住的铭文</span></div></div><button className="primary" onClick={() => setScene('light')}><span>提灯入库</span><b>→</b></button></div>
    </section>}

    {scene === 'light' && <section className="quest scene-panel">
      <div className="quest-copy"><p className="eyebrow">01 · 光检</p><h2>别让灯火<br/>只照在正面</h2><p>拖动灯光检查整面镜背。三处异样的材质会在光下显形，找到后自动装入证物袋。</p><div className="mini-goal"><b>当前目标</b><span>{found.length}/3 处痕迹</span></div><div className="found-list">{targets.map(t => <span key={t.id} className={found.includes(t.id) ? 'found':''}>{found.includes(t.id) ? clueData[t.id].title : '未知痕迹'}</span>)}</div></div>
      <div className="play-card light-card" ref={stageRef} onPointerMove={e=>moveLight(e.clientX,e.clientY)} onPointerDown={e=>moveLight(e.clientX,e.clientY)}>
        <div className="large-mirror investigation-mirror"><span className="petals">卌</span>{targets.map(t=><span key={t.id} className={`clue-point ${t.id} ${found.includes(t.id)?'revealed':''}`} style={{left:`${t.x}%`,top:`${t.y}%`}}>{clueData[t.id].mark}</span>)}</div>
        <div className="cursor-light" style={{left:`${light.x}%`,top:`${light.y}%`}}><i/></div><div className="oil-meter"><span>灯油</span><i><b style={{width:`${100-found.length*18}%`}}/></i><small>{found.length === 3 ? '证物齐全' : '慢一点，贴近镜缘'}</small></div>
      </div><button className="primary next" disabled={found.length<3} onClick={()=>setScene('sound')}><span>{found.length<3?`还差 ${3-found.length} 处痕迹`:'转入听音台'}</span><b>→</b></button>
    </section>}

    {scene === 'sound' && <section className="quest scene-panel">
      <div className="quest-copy"><p className="eyebrow">02 · 听证</p><h2>镜子被敲了<br/>四下</h2><p>先点击“听回响”，再用三种器物复现顺序。戴上耳机会更容易分辨高低。</p><div className="mini-goal"><b>侦听记录</b><span>尝试 {soundAttempts} 次</span></div><div className="sound-slots">{targetSequence.map((_,i)=><span key={i} className={toneInput[i] ? toneInput[i] : ''}>{toneInput[i] ? toneNames[toneInput[i]] : i+1}</span>)}</div></div>
      <div className={`play-card memory-card ${soundState}`}><div className="echo-core"><i className={activeTone ?? ''}/><span>{soundState==='playing'?'正在回放…':soundState==='wrong'?'顺序不对':soundState==='solved'?'四声重合':'等待听音'}</span></div><button className="listen-button" onClick={playSequence} disabled={soundState==='playing'||soundState==='solved'}>◎ {soundAttempts ? '再听一次' : '听回响'}</button><div className="tone-grid memory-tones">{(['jade','wood','bronze'] as Tone[]).map(t=><button key={t} onClick={()=>tapTone(t)} disabled={soundState==='playing'||soundState==='solved'}><span className={`tone-object ${t}`}>{t==='jade'?'◇':t==='wood'?'丶':'●'}</span><b>{{jade:'玉磬',wood:'木鼓',bronze:'铜钲'}[t]}</b><small>{toneNames[t]}</small></button>)}</div><p className="memory-hint">{soundState==='wrong'?'线索断了，再听一次':soundState==='solved'?'新证物：四声曲牌暗号':'注意第一声与最后一声'}</p></div>
      <button className="primary next" disabled={soundState!=='solved'} onClick={()=>setScene('rubbing')}><span>{soundState==='solved'?'带着节奏去拓印':'复现正确顺序'}</span><b>→</b></button>
    </section>}

    {scene === 'rubbing' && <section className="quest scene-panel">
      <div className="quest-copy"><p className="eyebrow">03 · 拓铭</p><h2>一个字号<br/>不等于一个主人</h2><p>按住纸面并来回擦拭，至少拓出 9 块才能读完铭文。漏掉的地方可能正是关键。</p><div className="mini-goal"><b>拓印完成度</b><span>{rubbed.length}/12 区</span></div><div className="rub-legend"><span>作坊？</span><span>时间？</span><span>主人？</span></div></div>
      <div className="play-card grid-rubbing-card"><div className="rubbing-sheet" onPointerDown={()=>setRubbing(true)} onPointerUp={()=>setRubbing(false)} onPointerLeave={()=>setRubbing(false)}>{Array.from({length:12},(_,i)=><button aria-label={`拓印第 ${i+1} 区`} key={i} className={rubbed.includes(i)?'rubbed':''} onPointerDown={()=>{setRubbing(true);setRubbed(old=>old.includes(i)?old:[...old,i])}} onPointerEnter={()=>revealTile(i)}><span>{['湖','州','石','家','青','铜','照','子','客','来','如','意'][i]}</span></button>)}</div><div className="rub-progress"><i><b style={{width:`${rubbed.length/12*100}%`}}/></i><span>{rubbed.length>=9?'铭文可读：湖州石家青铜照子':'按住拓纸，划过空白区域'}</span></div></div>
      <button className="primary next" disabled={rubbed.length<9} onClick={()=>setScene('deduction')}><span>{rubbed.length<9?`还需拓出 ${9-rubbed.length} 区`:'召集三人对质'}</span><b>→</b></button>
    </section>}

    {scene === 'deduction' && <section className="deduction scene-panel"><div className="deduction-head"><p className="eyebrow">最终推理</p><h2>作坊铭、运输痕和使用痕<br/><em>哪一种最能证明“属于”？</em></h2><p>选一位镜主人，再指出你最信任的证物。一旦落印，本案将记入你的鉴物档。</p></div><div className="suspect-grid">{suspects.map(s=><button key={s.id} className={suspect===s.id?'selected':''} onClick={()=>setSuspect(s.id)}><span className="suspect-mark">{s.mark}</span><small>{s.role}</small><h3>{s.name}</h3><blockquote>{s.claim}</blockquote><i>{suspect===s.id?'已锁定':'点击询问'}</i></button>)}</div><div className="reason-panel"><span>我最信任的证物</span><div>{evidence.map(e=><button key={e.title} className={reason===e.title?'selected':''} onClick={()=>setReason(e.title)}>{e.mark} · {e.title}</button>)}</div></div><button className="primary verdict" disabled={!suspect||!reason} onClick={()=>setScene('ending')}><span>落下结案印</span><b>鉴</b></button></section>}

    {scene === 'ending' && <section className={`ending scene-panel ${suspect==='musician'?'true-ending':''}`}><div className="ending-card"><div className="score-ring" style={{'--score':`${score*3.6}deg`} as React.CSSProperties}><span>{score}</span><small>鉴物分</small></div><p className="eyebrow">汴京失物案 · 已结</p><h2>{ending.title}</h2><div className="ending-seal">{suspect==='musician'?'归':suspect==='maker'?'误':'迹'}</div><p>{ending.text}</p><blockquote>你的鉴物称号：<b>{ending.rank}</b></blockquote><div className="ending-evidence"><span>你选择了 {suspects.find(s=>s.id===suspect)?.name}</span><span>关键证物：{reason}</span><span>听音尝试：{soundAttempts} 次</span></div></div><div className="ending-actions"><button className="primary" onClick={restart}><span>换一种推理重开</span><b>↻</b></button><button className="ghost" onClick={()=>setBagOpen(true)}>复盘全部证物</button></div><p className="disclaimer">“玄羽镜”、人物与失物案为虚构；铜镜作坊铭、纹饰与拓片知识参考博物馆公开资料。</p></section>}

    {bagOpen && <div className="modal-backdrop" onClick={()=>setBagOpen(false)}><aside className="sources evidence-drawer" role="dialog" aria-modal="true" aria-label="证物袋" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setBagOpen(false)}>×</button><p className="eyebrow">开封府 · 第 007 号证物袋</p><h2>{evidence.length ? `已收集 ${evidence.length}/5` : '还没有证物'}</h2><div className="evidence-list">{evidence.map((e,i)=><article key={e.title}><span>{e.mark}</span><div><small>证物 0{i+1}</small><h3>{e.title}</h3><p>{e.note}</p></div></article>)}</div>{!evidence.length&&<p>提灯检查镜背后，线索会自动装入这里。</p>}</aside></div>}

    {sourcesOpen && <div className="modal-backdrop" onClick={()=>setSourcesOpen(false)}><aside className="sources" role="dialog" aria-modal="true" aria-label="史实与出处" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSourcesOpen(false)}>×</button><p className="eyebrow">史实边界</p><h2>这不是一面真实馆藏镜</h2><p>宋代铜镜的形制、镜钮、纹饰、作坊铭记以及拓片研究方法有公开馆藏资料可考。“玄羽镜”、沈七娘等人物、宣和四年失物案及所有对话均为虚构。</p><h3>核心参考</h3><ol><li><a href="https://www.shanghaimuseum.net/mu/frontend/pg/m/article/id/I00000752" target="_blank" rel="noreferrer">上海博物馆：馆藏铜镜展览资料</a></li><li><a href="https://www.dpm.org.cn/journal_detail/111271.html" target="_blank" rel="noreferrer">故宫博物院：《故宫藏镜》</a></li><li><a href="https://www.chnmuseum.cn/zp/zpml/csp/202203/t20220322_254454.shtml" target="_blank" rel="noreferrer">中国国家博物馆：双凤流云纹铜镜</a></li><li><a href="https://www.dpm.org.cn/show/226094.html" target="_blank" rel="noreferrer">故宫博物院：犀照群伦—故宫藏历代铜镜展</a></li></ol><p className="source-note">作品中“四声曲牌暗号”为游戏机制，不是历史考证结论。</p></aside></div>}
  </main>;
}
