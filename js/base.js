'use strict';
// Base: tela, utilidades, teclado e som
// =====================================================================
//  MICÉLIO — A Cidade em Loop  ·  metroidvania 2D em pixel art
// =====================================================================
const W=480,H=270,T=16;
const cv=document.getElementById('c'),sx=cv.getContext('2d');
const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const buf=mkCanvas(W,H),g=buf.getContext('2d');
let S=1,OX=0,OY=0;
function resize(){const d=window.devicePixelRatio||1;cv.width=Math.max(320,innerWidth*d|0);cv.height=Math.max(180,innerHeight*d|0);
  S=Math.min(cv.width/W,cv.height/H);if(S>=2)S=Math.floor(S*2)/2;OX=(cv.width-W*S)/2|0;OY=(cv.height-H*S)/2|0}
addEventListener('resize',resize);resize();

// ---------- util
const rnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const sign=v=>v<0?-1:1;
function hash(x,y){let n=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const SOL=c=>c==='#'||c==='B'||c==='S';
function px(c,x,y,w,h){g.fillStyle=c;g.fillRect(x,y,w,h)}

// ---------- input
const keys={},pressed={};
function kname(e){return e.key.length===1?e.key.toLowerCase():e.key}
addEventListener('keydown',e=>{const k=kname(e);if(!keys[k])pressed[k]=true;keys[k]=true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(e.key))e.preventDefault();audioInit()});
addEventListener('keyup',e=>{keys[kname(e)]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
cv.addEventListener('mousedown',e=>{if(!keys.mouse)pressed.mouse=true;keys.mouse=true;audioInit();try{window.focus();cv.focus()}catch(_){ }e.preventDefault()});
addEventListener('mouseup',()=>{keys.mouse=false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
const down=(...ks)=>ks.some(k=>keys[k]);
const hit=(...ks)=>ks.some(k=>pressed[k]);

// ---------- audio (bipes sintetizados)
let ac=null,muted=false;
function audioInit(){if(ac)return;try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(_){ac=null}}
function sfx(f,d,type,vol,slide){if(!ac||muted)return;try{const t=ac.currentTime,o=ac.createOscillator(),ga=ac.createGain();
  o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
  ga.gain.setValueAtTime(vol||.04,t);ga.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(ga);ga.connect(ac.destination);o.start(t);o.stop(t+d)}catch(_){}}
const SND={
  jump:()=>sfx(320,.08,'square',.03,200),shot:()=>sfx(520,.06,'square',.035,-400),
  shotgun:()=>sfx(180,.18,'sawtooth',.06,-140),swing:()=>sfx(700,.05,'triangle',.04,-500),
  hit:()=>sfx(140,.06,'square',.04,-60),hurt:()=>sfx(220,.25,'sawtooth',.06,-170),
  pick:()=>{sfx(660,.08,'square',.04);setTimeout(()=>sfx(990,.12,'square',.04),70)},
  lvl:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>sfx(f,.12,'square',.04),i*80)),
  die:()=>sfx(300,.9,'sawtooth',.07,-270),boom:()=>sfx(90,.35,'sawtooth',.08,-55),
  door:()=>sfx(110,.15,'triangle',.06,-40),heal:()=>sfx(440,.2,'sine',.06,440)};
