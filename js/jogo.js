'use strict';
// Jogo: estado, regras, IA e desenho
// ---------- estado
let P,F,room,enemies=[],bullets=[],eshots=[],items=[],parts=[],texts=[],toasts=[],boss=null;
let state='title',stT=0,tick=0,shake=0,fade=0,banner=0,CX=0,CY=0;
const cam={x:0,y:0};
const SAVE_KEY='micelio_save_v2';
const PERSIST=['hp','maxHp','lvl','xp','heals','weapons','order','cur','dj','key','arts','anchor','sex'];
function resetTransient(){Object.assign(P,{crouch:false,rl:0,rlMax:1,ammo:{},x:0,y:0,w:10,h:22,vx:0,vy:0,face:1,inv:0,cd:0,atk:0,knock:0,coy:0,jb:0,aj:0,drop:0,walk:0,onGround:false,hitWall:false})}
function newGame(){P={sex:'m',hp:100,maxHp:100,lvl:1,xp:0,heals:2,weapons:{faca:{lvl:1,xp:0}},order:['faca'],cur:'faca',dj:false,key:false,arts:{},anchor:{room:'rua1',i:0}};
  resetTransient();F={chests:{},walls:{},arts:{},seen:{},anchors:{'rua1:0':1},colosso:false,boss:false,loop:1,kills:0}}
function save(){try{const o={};PERSIST.forEach(k=>o[k]=P[k]);localStorage.setItem(SAVE_KEY,JSON.stringify({P:o,F}))}catch(_){}}
function loadGame(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(!s||!s.P||!s.F)return false;newGame();
  PERSIST.forEach(k=>{if(s.P[k]!==undefined)P[k]=s.P[k]});Object.assign(F,s.F);if(!ROOMS[P.anchor.room])P.anchor={room:'rua1',i:0};F.seen=F.seen||{};F.anchors=F.anchors||{};F.arts=F.arts||{};F.anchors[P.anchor.room+':'+P.anchor.i]=1;if(P.sex!=='f')P.sex='m';if(!(P.hp>0))P.hp=P.maxHp;return true}catch(_){return false}}
function hasSave(){try{return!!localStorage.getItem(SAVE_KEY)}catch(_){return false}}
function toast(s,c){toasts.push({s,c:c||'#f2e9c0',t:210});if(toasts.length>4)toasts.shift()}

function mkEnemy(t,x,foot,m){const d=ET[t];m=m||1;const hp=Math.round(d.hp*m);
  return{t,x,y:foot-d.h-.01,w:d.w,h:d.h,vx:0,vy:0,hp,maxHp:hp,dmg:Math.round(d.dmg*m),xp:Math.round(d.xp*m),sp:d.sp,
    face:Math.random()<.5?-1:1,cd:rnd(30,90)|0,st:'walk',tm:0,flash:0,kb:0,onGround:false,hitWall:false,anim:rnd(100)|0}}
function enterRoom(id,x,y){P.crouch=false;P.h=22;P.rl=0;room=ROOMS[id];F.seen[id]=1;enemies=[];bullets=[];eshots=[];items=[];parts=[];texts=[];boss=null;room.bHp=30;
  for(const b of room.bs)room.g[b[1]][b[0]]=F.walls[id]?' ':b[2];
  for(const s of room.spawns){if(s.t==='colosso'&&F.colosso)continue;enemies.push(mkEnemy(s.t,s.x*T,(s.y+1)*T,room.mult))}
  if(room.boss&&!F.boss)boss={x:room.boss.x*T-40,y:14*T-112,w:80,h:112,hp:4200,maxHp:4200,t:0,cd:100,pat:0,active:false,roots:[],flash:0,dying:0};
  renderRoom(room);P.x=x;P.y=y;P.vx=P.vy=0;fade=1;banner=170;
  cam.x=clamp(P.x+5-W/2,0,room.w*T-W);cam.y=clamp(P.y+11-H/2,0,room.h*T-H)}
function respawn(){resetTransient();const a=P.anchor,rm=ROOMS[a.room],an=rm.anchors[a.i]||rm.anchors[0];enterRoom(a.room,an.x*T+3,(an.y+1)*T-22.01)}

// ---------- colisão
function boxSolid(x,y,w,h){const x0=Math.floor(x/T),x1=Math.floor((x+w-.001)/T),y0=Math.floor(y/T),y1=Math.floor((y+h-.001)/T);
  for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){const c=room.at(i,j);if(SOL(c))return true}return false}
function solidAt(x,y){const c=room.at(Math.floor(x/T),Math.floor(y/T));return SOL(c)?c:null}
function moveEnt(e){
  e.x+=e.vx;
  if(boxSolid(e.x,e.y,e.w,e.h)){if(e.vx>0)e.x=Math.floor((e.x+e.w)/T)*T-e.w-.01;else e.x=Math.floor(e.x/T)*T+T+.01;e.vx=0;e.hitWall=true}
  const ob=e.y+e.h;e.y+=e.vy;e.onGround=false;
  if(boxSolid(e.x,e.y,e.w,e.h)){if(e.vy>0){e.y=Math.floor((e.y+e.h)/T)*T-e.h-.01;e.onGround=true}else e.y=Math.floor(e.y/T)*T+T+.01;e.vy=0}
  else if(e.vy>=0&&!(e.drop>0)){const ty=Math.floor((e.y+e.h)/T);
    if(ob<=ty*T+.02){const x0=Math.floor(e.x/T),x1=Math.floor((e.x+e.w-.001)/T);
      for(let i=x0;i<=x1;i++)if(room.at(i,ty)==='='){e.y=ty*T-e.h-.01;e.vy=0;e.onGround=true;break}}}
}
function breakWall(d){room.bHp-=d;SND.hit();if(room.bHp<=0){F.walls[room.id]=true;for(const b of room.bs){room.g[b[1]][b[0]]=' ';if(b[2]==='B')burst(b[0]*T+8,b[1]*T+8,10,'#8a7a6a')}
  renderRoom(room);shake=8;SND.boom();toast('Uma passagem secreta se abre!','#e0b040');save()}}
function boxHitsB(hb){const x0=Math.floor(hb.x/T),x1=Math.floor((hb.x+hb.w)/T),y0=Math.floor(hb.y/T),y1=Math.floor((hb.y+hb.h)/T);
  for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++)if(i>=0&&i<room.w&&j>=0&&j<room.h&&room.g[j][i]==='B')return true;return false}

// ---------- efeitos
function burst(x,y,n,c,sp){for(let i=0;i<n;i++)parts.push({x,y,vx:rnd(-1,1)*(sp||2),vy:rnd(-2.5,.5)*(sp?sp/2:1),life:rnd(15,35)|0,c,g:.12})}
function dtext(x,y,s,c){texts.push({x,y,s:String(s),c:c||'#fff',life:40})}

// ---------- progressão
function gainXp(n,id){
  if(hasA('amuleto'))n=Math.round(n*1.25);P.xp+=n;while(P.xp>=need(P.lvl)){P.xp-=need(P.lvl);P.lvl++;P.maxHp+=8;P.hp=Math.min(P.maxHp,P.hp+8);toast('NÍVEL '+P.lvl+' — vida máxima +8','#8fe08f');SND.lvl()}
  const w=P.weapons[id];if(!w)return;w.xp+=n;
  while(w.xp>=wneed(w.lvl)){w.xp-=wneed(w.lvl);w.lvl++;toast(WEAPONS[id].n+' subiu para Nv '+w.lvl,RAR[WEAPONS[id].rar]);SND.lvl()}}
function rollChest(l){const r=Math.random();
  if(l.w||r<.55){const pool=POOLS[l.t];let c=pool.filter(q=>!P.weapons[q[0]]);
    if(!c.length){if(l.w)c=pool;else return{heal:1+(Math.random()<.4?1:0)}}
    let tot=0;for(const q of c)tot+=q[1];let k=Math.random()*tot;for(const q of c){k-=q[1];if(k<=0)return{w:q[0]}}return{w:c[0][0]}}
  if(r<.85)return{heal:1+(Math.random()<.4?1:0)};return{art:'coracao'}}
function giveArt(id){if(id!=='coracao'&&P.arts[id])id='coracao';P.arts[id]=(P.arts[id]||0)+1;
  if(id==='coracao'){P.maxHp+=20;P.hp+=20}if(id==='botas')P.dj=true;toast('ARTEFATO: '+ARTS[id].n+' — '+ARTS[id].d,'#e0b040')}
function startReload(){const w=WEAPONS[P.cur];P.rlMax=P.rl=rlOf(w);sfx(240,.08,'triangle',.04,-80)}
function giveLoot(l){
  if(l.t)l=rollChest(l);
  if(l.w){const W_=WEAPONS[l.w];if(P.weapons[l.w]){gainXp(0,l.w);P.weapons[l.w].xp+=40;gainXp(0,l.w);toast(W_.n+' duplicada: +40 XP na arma',RAR[W_.rar])}
    else{P.weapons[l.w]={lvl:1,xp:0};P.order.push(l.w);P.cur=l.w;P.rl=0;toast('NOVA ARMA: '+W_.n,RAR[W_.rar])}}
  if(l.heal){P.heals+=l.heal;toast('+'+l.heal+' kit médico','#8fe08f')}
  if(l.art)giveArt(l.art);
  if(l.key){P.key=true;toast('Cartão de acesso do hospital obtido','#e0b040')}
  SND.pick();save()}

// ---------- combate
function hurtPlayer(d,dir){if(P.inv>0||state!=='play')return;P.hp-=d;P.inv=55;P.knock=12;P.vx=dir*2.4;P.vy=-3.2;shake=6;
  dtext(P.x+5,P.y-4,'-'+d,'#ff6a5a');burst(P.x+5,P.y+10,6,'#b3312c');SND.hurt();
  if(P.hp<=0){P.hp=0;state='dead';stT=0;SND.die();burst(P.x+5,P.y+10,30,'#b3312c',4)}}
function dealDmg(e,base,id,dir){const w=WEAPONS[id],crit=w.crit&&Math.random()<w.crit;
  const d=Math.max(1,Math.round(base*(crit?2:1)*rnd(.9,1.1)));e.hp-=d;e.flash=6;
  if(e.t!=='colosso'){e.kb=6;e.vx=dir*1.6}
  dtext(e.x+e.w/2,e.y-6,d,crit?'#ffd84a':'#fff');burst(e.x+e.w/2,e.y+e.h/2,3,e.t==='esporo'?'#c8e06a':'#8a1f2a');SND.hit();
  if(e.hp<=0)killEnemy(e,id);return d}
function killEnemy(e,id){const d=ET[e.t];F.kills++;gainXp(e.xp,id);burst(e.x+e.w/2,e.y+e.h/2,e.t==='colosso'?40:10,'#8a1f2a',e.t==='colosso'?4:2);
  if(e.t==='colosso'){F.colosso=true;shake=16;SND.boom();toast('O COLOSSO CAIU','#ff6a5a');giveLoot({w:'foice',key:1});return}
  if(Math.random()<d.heal)items.push({x:e.x,y:e.y,w:8,h:8,vy:-2.5,kind:'heal',t:0});
  for(const dr of d.drops)if(Math.random()<dr[1]){items.push({x:e.x,y:e.y,w:8,h:8,vy:-3,kind:'weapon',id:dr[0],t:0});break}}
function dmgBoss(base,id){const b=boss;if(!b||!b.active||b.dying)return 0;const d=Math.max(1,Math.round(base*rnd(.9,1.1)));b.hp-=d;b.flash=4;
  dtext(b.x+rnd(10,60),b.y+rnd(30,70),d,'#fff');SND.hit();
  if(b.hp<=0){b.hp=0;b.dying=1;enemies=[];eshots=[];b.roots=[];gainXp(500,id);toast('O FUNGO PRIMORDIAL AGONIZA...','#c8e06a')}return d}

// ---------- jogador
function onOneWay(){const ty=Math.floor((P.y+P.h+2)/T),x0=Math.floor(P.x/T),x1=Math.floor((P.x+P.w-.001)/T);let ow=false;
  for(let i=x0;i<=x1;i++){const c=room.at(i,ty);if(SOL(c))return false;if(c==='=')ow=true}return ow}
function goDoor(d){if(d.lock&&!P[d.lock]){toast('Trancado. É preciso um cartão de acesso.','#ff6a5a');SND.hit();return}
  const tr=ROOMS[d.to],td=tr.doors.find(q=>q.id===d.toId);SND.door();enterRoom(d.to,td.x*T+3,(td.y+1)*T-22.01);save()}
function nearThing(){const pc={x:P.x+5,y:P.y+P.h-11};
  for(let i=0;i<room.chests.length;i++){const c=room.chests[i];if(!F.chests[room.id+':'+i]&&!SOL(room.g[c.y][c.x])&&Math.abs(c.x*T+8-pc.x)<16&&Math.abs((c.y+1)*T-6-pc.y)<20)return{chest:c,i}}
  for(const d of room.doors)if(overlap(P,{x:d.x*T,y:(d.y-1)*T,w:T,h:2*T}))return{door:d};
  if(Object.keys(F.anchors).length>1)for(let i=0;i<room.anchors.length;i++){const a=room.anchors[i];if(Math.abs(a.x*T+8-pc.x)<12&&Math.abs((a.y+1)*T-(P.y+P.h))<24)return{anchor:i}}
  return null}
function updPlayer(){
  const ax=(down('d','ArrowRight')?1:0)-(down('a','ArrowLeft')?1:0);
  const wantC=down('s','ArrowDown')&&P.onGround&&P.knock<=0;
  if(wantC&&!P.crouch){P.crouch=true;P.h=13;P.y+=9}
  else if(!wantC&&P.crouch&&!boxSolid(P.x,P.y-9,P.w,22)){P.crouch=false;P.h=22;P.y-=9}
  if(P.knock>0){P.knock--;P.vx*=.9}else{P.vx=ax*(P.crouch?.8:2);if(ax)P.face=ax}
  if(ax&&P.onGround)P.walk++;
  P.vy=Math.min(P.vy+.3,7);
  if(P.onGround){P.coy=6;P.aj=1}else if(P.coy>0)P.coy--;
  if(hit(' ','w','ArrowUp','z'))P.jb=7;else if(P.jb>0)P.jb--;
  if(P.jb>0){
    if(down('s','ArrowDown')&&P.onGround&&onOneWay()){P.drop=10;P.jb=0;P.coy=0}
    else if(P.coy>0){P.vy=-5.8;P.jb=0;P.coy=0;SND.jump()}
    else if(P.dj&&P.aj>0){P.vy=-5.4;P.aj--;P.jb=0;SND.jump();for(let i=0;i<6;i++)parts.push({x:P.x+rnd(10),y:P.y+P.h,vx:rnd(-.6,.6),vy:rnd(.2,1),life:14,c:'#5a9ae0',g:0})}
  }
  if(!down(' ','w','ArrowUp','z')&&P.vy<-3.2)P.vy=-3.2;
  if(P.drop>0)P.drop--;
  P.hitWall=false;moveEnt(P);
  // saídas laterais
  const pcx=P.x+P.w/2;
  if(pcx<0&&room.left){const y=P.y-(P.crouch?9:0);enterRoom(room.left,ROOMS[room.left].w*T-14,y);return}
  if(pcx>room.w*T&&room.right){const y=P.y-(P.crouch?9:0);enterRoom(room.right,4,y);return}
  // espinhos
  {const x0=Math.floor(P.x/T),x1=Math.floor((P.x+P.w-.001)/T),y0=Math.floor(P.y/T),y1=Math.floor((P.y+P.h-.001)/T);
    out:for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++)if(room.at(i,j)==='^'){hurtPlayer(Math.round(10*room.mult),-P.face);if(state==='play')P.vy=-4.6;break out}}
  if(state!=='play')return;
  if(P.inv>0)P.inv--;if(P.cd>0)P.cd--;if(P.atk>0)P.atk--;
  // ataque, pente e recarga
  if(P.rl>0&&--P.rl<=0){P.ammo[P.cur]=magOf(P.cur);sfx(500,.06,'square',.04,300)}
  {const id=P.cur,w=WEAPONS[id];
    if(w.t==='gun'){if(P.ammo[id]===undefined)P.ammo[id]=magOf(id);if(hit('r')&&P.rl<=0&&P.ammo[id]<magOf(id))startReload()}
    if(down('j','x','mouse')&&P.cd<=0&&P.rl<=0){const dm=wdmg(id);
      if(w.t==='gun'){
        if(P.ammo[id]<=0)startReload();
        else{P.cd=cdOf(w);P.atk=Math.min(10,P.cd);const n=w.pellets||1;
          for(let k=0;k<n;k++){const a=(Math.random()-.5)*2*(w.spread||0);
            bullets.push({x:P.face>0?P.x+P.w+w.len:P.x-w.len,y:P.y+(P.crouch?5:10),vx:P.face*w.spd*Math.cos(a),vy:w.spd*Math.sin(a),dmg:dm,life:w.life||70,pierce:w.pierce||0,id,hitL:[]})}
          if(n>1||id==='magnum')SND.shotgun();else SND.shot();
          if(--P.ammo[id]<=0)startReload()}}
      else{P.cd=w.cd;P.atk=Math.min(10,w.cd);
        const hb={x:P.face>0?P.x+P.w-2:P.x+2-w.range,y:P.y-(w.wide?12:2),w:w.range,h:P.h+(w.wide?14:4)};
        if(w.wide){if(P.face>0)hb.x-=8;hb.w+=8}
        let tot=0;for(const e of enemies)if(e.hp>0&&overlap(hb,e))tot+=dealDmg(e,dm,id,P.face);
        if(boss&&overlap(hb,{x:boss.x+12,y:boss.y,w:56,h:boss.h}))tot+=dmgBoss(dm,id);
        if(boxHitsB(hb))breakWall(dm);
        if(tot&&w.leech)P.hp=Math.min(P.maxHp,P.hp+Math.max(1,Math.round(tot*w.leech)));
        SND.swing()}}}
  // cura
  if(hit('h','c')){if(P.heals>0&&P.hp<P.maxHp){P.heals--;const a=Math.ceil(P.maxHp*(hasA('soro')?.6:.45));P.hp=Math.min(P.maxHp,P.hp+a);dtext(P.x+5,P.y-6,'+'+a,'#8fe08f');burst(P.x+5,P.y+8,10,'#8fe08f');SND.heal();save()}
    else if(P.heals<=0)toast('Sem kits médicos.','#ff6a5a')}
  // troca de arma
  if(hit('q','Tab')){P.cur=P.order[(P.order.indexOf(P.cur)+1)%P.order.length];P.cd=Math.max(P.cd,8);P.rl=0}
  for(let i=0;i<P.order.length&&i<9;i++)if(hit(String(i+1))){if(P.cur!==P.order[i])P.rl=0;P.cur=P.order[i]}
  // interação
  if(hit('e','Enter')){const n=nearThing();
    if(n&&n.chest){F.chests[room.id+':'+n.i]=1;burst(n.chest.x*T+8,(n.chest.y+1)*T-8,10,'#e0b040');giveLoot(n.chest.loot)}
    else if(n&&n.door){goDoor(n.door);return}
    else if(n&&n.anchor!==undefined){openTravel();return}}
  // âncoras
  room.anchors.forEach((a,i)=>{if(Math.abs(a.x*T+8-(P.x+5))<12&&Math.abs((a.y+1)*T-(P.y+P.h))<24&&(P.anchor.room!==room.id||P.anchor.i!==i)){
    P.anchor={room:room.id,i};F.anchors[room.id+':'+i]=1;toast('Âncora temporal fixada — você volta para cá','#6ad0d0');SND.pick();save()}});
  // artefatos espalhados pela cidade
  room.arts.forEach((a,i)=>{const k=room.id+':'+i;if(!F.arts[k]&&!SOL(room.g[a.y][a.x])&&Math.abs(a.x*T+8-(P.x+5))<10&&Math.abs((a.y+1)*T-(P.y+P.h))<20){
    F.arts[k]=1;burst(a.x*T+8,a.y*T+4,14,'#e0b040');giveArt(a.id);SND.pick();save()}});
  // itens
  for(const it of items){it.t++;it.vy=Math.min(it.vy+.25,6);it.y+=it.vy;if(solidAt(it.x+4,it.y+8)){it.y=Math.floor((it.y+8)/T)*T-8;it.vy=0}
    if(it.t>15&&overlap(it,P)){it.dead=true;if(it.kind==='heal')giveLoot({heal:1});else giveLoot({w:it.id})}}
  items=items.filter(i=>!i.dead);
}

// ---------- IA
function patrol(e){if(!e.onGround)return;const tx=Math.floor((e.face>0?e.x+e.w+2:e.x-2)/T),ty=Math.floor((e.y+e.h+3)/T),c=room.at(tx,ty);
  if(e.hitWall||(!SOL(c)&&c!=='='))e.face*=-1}
function updEnemy(e){
  e.anim++;if(e.flash>0)e.flash--;if(e.cd>0)e.cd--;
  const pcx=P.x+P.w/2,ecx=e.x+e.w/2,dx=pcx-ecx,dy=(P.y+P.h)-(e.y+e.h),dist=Math.abs(dx),ady=Math.abs(dy),fly=e.t==='esporo';
  if(e.kb>0){e.kb--;e.vx*=.85}
  else switch(e.t){
    case'zumbi':{const ag=dist<150&&ady<40;if(ag)e.face=sign(dx);else patrol(e);e.vx=e.face*e.sp*(ag?1.3:.6);break}
    case'cao':case'rastejador':case'cacador':{
      const c={cao:[190,50,56,-3.4,2.3,75],rastejador:[220,56,100,-4.8,3.4,80],cacador:[240,72,140,-6.2,3.3,100]}[e.t];
      const ag=dist<c[0]&&ady<c[1];
      if(e.onGround){if(ag){e.face=sign(dx);e.vx=e.face*e.sp;if(dist<c[2]&&dist>20&&e.cd<=0){e.vy=c[3];e.vx=e.face*c[4];e.cd=c[5]}}
        else{patrol(e);e.vx=e.face*.5}}
      break}
    case'cuspidor':{const ag=dist<230&&ady<72;
      if(ag){e.face=sign(dx);e.vx=dist<70?-e.face*e.sp:dist>150?e.face*e.sp:0;
        if(e.cd<=0){eshots.push({x:ecx,y:e.y+5,vx:e.face*clamp(dist/43,1,5),vy:-2.6,g:.12,dmg:e.dmg,life:160,c:'#c8e06a'});e.cd=110;sfx(260,.1,'triangle',.03,-120)}}
      else{patrol(e);e.vx=e.face*.25}break}
    case'colosso':{
      if(e.st==='walk'){if(dist>300){e.vx=0;break}e.face=sign(dx);e.vx=e.face*e.sp;e.tm++;
        if(dist<46&&e.cd<=0){e.st='wind';e.tm=0}else if(e.tm>200&&dist>70){e.st='cwind';e.tm=0}}
      else if(e.st==='wind'){e.vx=0;if(++e.tm>32){const hb={x:e.face>0?e.x+e.w:e.x-46,y:e.y+8,w:46,h:32};if(overlap(hb,P))hurtPlayer(e.dmg,e.face);
          for(const s of[-1,1])eshots.push({x:ecx+s*16,y:e.y+e.h-5,vx:s*3,vy:0,g:0,dmg:Math.round(e.dmg*.6),life:45,c:'#b8b0b8'});shake=10;SND.boom();e.st='rec';e.tm=0}}
      else if(e.st==='rec'){e.vx=0;if(++e.tm>36){e.st='walk';e.tm=0;e.cd=40}}
      else if(e.st==='cwind'){e.vx=0;e.face=sign(dx);if(++e.tm>42){e.st='charge';e.tm=0}}
      else if(e.st==='charge'){e.vx=e.face*4.2;if(e.hitWall){e.st='stun';e.tm=0;shake=10;SND.boom()}else if(++e.tm>75){e.st='rec';e.tm=0}}
      else if(e.st==='stun'){e.vx=0;if(++e.tm>85){e.st='walk';e.tm=0}}
      break}
    case'esporo':{e.face=sign(dx);e.vx+=(sign(dx)*e.sp-e.vx)*.05;e.vy=clamp((P.y+6-e.y)*.03,-1,1)+Math.sin(e.anim*.15)*.4;break}
  }
  if(!fly)e.vy=Math.min(e.vy+.3,7);
  const wasWall=e.hitWall;e.hitWall=false;moveEnt(e);
  if(e.t==='colosso'&&e.st==='charge'&&wasWall)e.hitWall=true;
  if(e.x<2){e.x=2;e.face=1;e.hitWall=true}if(e.x>room.w*T-e.w-2){e.x=room.w*T-e.w-2;e.face=-1;e.hitWall=true}
  if(e.hp>0&&overlap(e,P)){hurtPlayer(e.dmg,sign(dx));if(fly){e.hp=0;burst(ecx,e.y+4,10,'#c8e06a')}}
}
function updBoss(){const b=boss;b.t++;if(b.flash>0)b.flash--;
  if(b.dying>0){b.dying++;if(b.dying%6===0){burst(b.x+rnd(80),b.y+rnd(110),12,['#c8e06a','#9a3560','#cdbfa8'][b.dying%3],4);shake=6;if(b.dying%18===0)SND.boom()}
    if(b.dying>210){boss=null;F.boss=true;save();state='end';stT=0}return}
  if(!b.active){if(P.x>82*T){b.active=true;toast('O FUNGO PRIMORDIAL DESPERTA','#c8e06a');shake=20;SND.boom()}return}
  if(P.x<80*T){P.x=80*T;P.vx=0}
  const ph2=b.hp<b.maxHp/2;
  if(--b.cd<=0){const k=b.pat++%3;
    if(k===0){const n=ph2?8:5;for(let i=0;i<n;i++){const x0=b.x+20+rnd(40),y0=b.y+20,vy=-(2.5+rnd(2.5)),tt=(-vy+Math.sqrt(vy*vy+.2*(14*T-y0)))/.1,tx=P.x+rnd(-70,70);
        eshots.push({x:x0,y:y0,vx:(tx-x0)/tt,vy,g:.1,dmg:14,life:300,c:'#d8a0e8'})}sfx(200,.3,'sawtooth',.05,300)}
    else if(k===1){const n=ph2?5:3;for(let i=0;i<n;i++)b.roots.push({x:P.x+5+(i-(n-1)/2)*44+rnd(-6,6),t:0})}
    else{const n=ph2?5:3;for(let i=0;i<n;i++)enemies.push(mkEnemy('esporo',b.x-10+rnd(50),b.y+40+rnd(40),1.5));
      if(ph2&&enemies.filter(e=>e.t!=='esporo').length<2)enemies.push(mkEnemy('cacador',83*T,14*T,room.mult))}
    b.cd=ph2?70:110}
  for(const r of b.roots){r.t++;if(r.t===45){shake=5;sfx(120,.15,'sawtooth',.05,-60)}
    if(r.t>=45&&r.t<70&&overlap(P,{x:r.x-7,y:14*T-44,w:14,h:44}))hurtPlayer(20,sign(P.x+5-r.x))}
  b.roots=b.roots.filter(r=>r.t<75);
  if(overlap(P,{x:b.x+16,y:b.y+10,w:60,h:b.h}))hurtPlayer(16,-1);
}

// ---------- update geral
function startPlay(){respawn();state='play';toasts=[];toast('Loop '+F.loop+' — 6:00 da manhã, outra vez.','#6ad0d0')}
function update(){
  tick++;if(shake>0)shake--;if(fade>0)fade=Math.max(0,fade-.06);if(banner>0)banner--;
  for(const t of toasts)t.t--;toasts=toasts.filter(t=>t.t>0);
  if(hit('m')){muted=!muted;toast(muted?'Som desligado':'Som ligado')}
  if(state==='title'){if(hit('n')){newGame();state='charsel'}else if(hit('Enter',' ','mouse')){if(loadGame())startPlay();else{newGame();state='charsel'}}return}
  if(state==='charsel'){if(hit('a','ArrowLeft','d','ArrowRight')){P.sex=P.sex==='m'?'f':'m';SND.pick()}if(hit('Enter',' ','e'))startPlay();return}
  if(state==='pause'){if(hit('a','ArrowLeft','d','ArrowRight','Tab'))pauseTab=1-pauseTab;if(hit('p','Escape','Enter'))state='play';return}
  if(state==='travel'){updTravel();return}
  if(state==='end'){stT++;if(stT>120&&hit('Enter'))state='play';return}
  updFx();
  if(state==='dead'){if(++stT>170){F.loop++;P.hp=P.maxHp;respawn();state='play';toast('Loop '+F.loop+' — 6:00 da manhã, outra vez.','#6ad0d0');save()}return}
  if(hit('p','Escape')){state='pause';return}
  updPlayer();if(state!=='play')return;
  for(const e of enemies)if(e.hp>0)updEnemy(e);
  enemies=enemies.filter(e=>e.hp>0);
  if(boss)updBoss();
  // projéteis do jogador
  for(const b of bullets){for(let s=0;s<2&&!b.dead;s++){b.x+=b.vx/2;b.y+=b.vy/2;
      const c=solidAt(b.x,b.y);if(c){b.dead=true;burst(b.x,b.y,2,'#ffe27a',1);if(c==='B')breakWall(b.dmg);break}
      for(const e of enemies)if(e.hp>0&&b.x>e.x-2&&b.x<e.x+e.w+2&&b.y>e.y-2&&b.y<e.y+e.h+2&&!b.hitL.includes(e)){dealDmg(e,b.dmg,b.id,sign(b.vx));if(b.pierce-->0)b.hitL.push(e);else{b.dead=true;break}}
      if(!b.dead&&boss&&boss.active&&!boss.dying&&b.x>boss.x+14&&b.x<boss.x+boss.w&&b.y>boss.y&&b.y<boss.y+boss.h){dmgBoss(b.dmg,b.id);b.dead=true}}
    if(--b.life<=0)b.dead=true}
  bullets=bullets.filter(b=>!b.dead);
  // projéteis inimigos
  for(const s of eshots){s.x+=s.vx;s.vy+=s.g;s.y+=s.vy;if(--s.life<=0||solidAt(s.x,s.y)){s.dead=true;burst(s.x,s.y,3,s.c,1);continue}
    if(s.x>P.x-3&&s.x<P.x+P.w+3&&s.y>P.y-3&&s.y<P.y+P.h+3&&P.inv<=0){hurtPlayer(s.dmg,sign(s.vx));s.dead=true}}
  eshots=eshots.filter(s=>!s.dead);
  // câmera
  const tx=clamp(P.x+5-W/2+P.face*24,0,room.w*T-W),ty=clamp(P.y+P.h-11-H/2-8,0,room.h*T-H);
  cam.x+=(tx-cam.x)*.12;cam.y+=(ty-cam.y)*.15;
}
function updFx(){for(const p of parts){p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.life--}parts=parts.filter(p=>p.life>0);if(parts.length>400)parts.splice(0,parts.length-400);
  for(const t of texts){t.y-=.5;t.life--}texts=texts.filter(t=>t.life>0)}

// =====================================================================
//  RENDER
// =====================================================================
const TH={
  rua:{a:'#2b2833',b:'#1f1c26',top:'#494456',out:true},
  praca:{a:'#302c38',b:'#24212b',top:'#544e66',out:true},
  casa:{a:'#3b2b24',b:'#2a1d18',top:'#5e4436',bg:'#1b1416'},
  predio:{a:'#33363d',b:'#25272d',top:'#4e525c',bg:'#15171c'},
  esgoto:{a:'#24332e',b:'#18241f',top:'#3d564c',bg:'#0d1412'},
  hospital:{a:'#3d4b49',b:'#2c3837',top:'#627874',bg:'#172020'},
  porao:{a:'#2e2233',b:'#201626',top:'#523a5a',bg:'#110b14'}};
const skyC=mkCanvas(W,H),skyl=mkCanvas(960,140),vig=mkCanvas(W,H);
(function(){const x=skyC.getContext('2d'),gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0a0815');gr.addColorStop(.6,'#1f1430');gr.addColorStop(1,'#3d1e3c');x.fillStyle=gr;x.fillRect(0,0,W,H);
  for(let i=0;i<70;i++){x.fillStyle='rgba(255,255,255,'+(.15+hash(i,5)*.5)+')';x.fillRect(hash(i,1)*W|0,hash(i,2)*160|0,1,1)}
  for(let dy=-22;dy<=22;dy++){const hw=Math.round(Math.sqrt(484-dy*dy));x.fillStyle='rgba(201,214,142,.12)';x.fillRect(366-hw-4,50+dy,hw*2+8,1);x.fillStyle='#c9d68e';x.fillRect(370-hw,50+dy,hw*2,1)}
  x.fillStyle='#a9b870';[[360,40,6,4],[376,56,8,5],[358,60,4,3],[380,38,3,3]].forEach(r=>x.fillRect(r[0],r[1],r[2],r[3]));
  const y=skyl.getContext('2d');let bx=0,i=0;while(bx<960){const bw=20+hash(i,11)*40|0,bh=40+hash(i,12)*90|0;y.fillStyle='#120e1c';y.fillRect(bx,140-bh,bw,bh);
    if(hash(i,13)>.8){y.fillRect(bx+(bw>>1)-1,140-bh-12,2,12)}
    for(let k=0;k<4;k++)if(hash(i,k+20)>.55){y.fillStyle='#4a4426';y.fillRect(bx+3+hash(i,k+30)*(bw-8)|0,140-bh+6+hash(i,k+40)*(bh-14)|0,2,3);y.fillStyle='#120e1c'}
    bx+=bw+1;i++}
  const v=vig.getContext('2d'),rg=v.createRadialGradient(W/2,H/2,90,W/2,H/2,300);rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(1,'rgba(0,0,0,.62)');v.fillStyle=rg;v.fillRect(0,0,W,H)})();

function renderRoom(r){
  const c=r.cv||(r.cv=mkCanvas(r.w*T,r.h*T)),x=c.getContext('2d'),th=TH[r.theme];
  const f=(col,a,b,w,h)=>{x.fillStyle=col;x.fillRect(a,b,w,h)};
  x.clearRect(0,0,c.width,c.height);
  if(th.bg){f(th.bg,0,0,c.width,c.height);
    for(let ty=0;ty<r.h;ty++)for(let tx=0;tx<r.w;tx++){const X=tx*T,Y=ty*T,hh=hash(tx*7+3,ty*13+1),below=r.at(tx,ty+1),fl=below==='#';
      if(r.theme==='casa'){f('rgba(255,255,255,.025)',X+3,Y,2,T);f('rgba(255,255,255,.025)',X+11,Y,2,T);
        if(fl&&hh>.82){f('#2e2018',X+2,Y-12,12,10);f('#0c0a0e',X+4,Y-10,8,6)}}
      else if(r.theme==='predio'){f('rgba(255,255,255,.02)',X,Y+15,T,1);
        if(fl&&tx%6===2){f('#0c0d11',X+2,Y-26,12,18);f(hh>.7?'#6a6030':'#1b2230',X+3,Y-25,10,16);f('#0c0d11',X+7,Y-25,1,16)}
        if(fl&&tx%6===5){f('#241c18',X+2,Y-8,12,24);f('#30251f',X+4,Y-6,8,20);f('#b89a40',X+11,Y+5,1,2)}}
      else if(r.theme==='hospital'){if(fl){f('#22302e',X,Y+4,T,12);f('#3d6a5a',X,Y+3,T,1)}f('rgba(255,255,255,.02)',X+15,Y,1,T);
        if(fl&&tx%8===3){f('#2a3a38',X+1,Y-10,14,26);f('#34504a',X+3,Y-8,10,22);f('#172020',X+5,Y-5,6,5)}
        if(fl&&tx%8===7){f('#e8e8e0',X+5,Y-9,6,6);f('#a8323a',X+7,Y-8,2,4);f('#a8323a',X+6,Y-7,4,2)}
        if(hh>.93)f('rgba(120,20,30,.5)',X+(hh*90%12|0),Y+(hh*50%10|0),4+(hh*30%5|0),3)}
      else if(r.theme==='esgoto'){f('rgba(255,255,255,.02)',X,Y+7,T,1);f('rgba(255,255,255,.02)',X+((ty&1)?4:12),Y,1,7);
        if(ty===7){f('#1e2b27',X,Y+4,T,5);f('#2c3f39',X,Y+4,T,1);if(tx%5===0)f('#15201c',X+6,Y+2,3,9)}
        if(hh>.94)f('#3a5a2a',X+4,Y+2,2,8)}
      else if(r.theme==='porao'){if(hh>.6){f('#2a1630',X+(hh*100%14|0),Y,1,T);f('#2a1630',X,Y+(hh*70%14|0),T*hh|0,1)}
        if(hh>.9){f('#5c7a35',X+5,Y+6,2,2);f('rgba(200,224,106,.25)',X+4,Y+5,4,4)}
        if(fl&&hh<.14){f('#cdbfa8',X+7,Y+9,2,7);f('#9a3560',X+4,Y+6,8,4);f('#e8c8d8',X+6,Y+7,1,1)}}
    }}
  else{ // fachadas
    let bx=1,i=0;while(bx<r.w-2){const bw=5+Math.floor(hash(bx,7)*5),bh=5+Math.floor(hash(bx,9)*7),X=bx*T,Y=(14-bh)*T;
      f(['#17151d','#1c1921','#141219'][i%3],X,Y,bw*T,bh*T);f('#0e0d12',X,Y,bw*T,2);f('#0e0d12',X-1,Y,1,bh*T);
      for(let wy=0;wy<bh-1;wy++)for(let wx=0;wx<bw-1;wx++){const hh=hash(bx+wx*3,wy*5+1),lit=hh>.9;
        f(lit?'#8a7a3a':'#0b0a0f',X+10+wx*T,Y+8+wy*T,7,9);if(lit)f('#b8a64e',X+11+wx*T,Y+9+wy*T,2,3);if(hh<.15){f('#2a2018',X+9+wx*T,Y+11+wy*T,9,2);f('#2a2018',X+9+wx*T,Y+14+wy*T,9,1)}}
      bx+=bw+(hash(bx,3)>.6?1:0);i++}
    if(r.id==='praca'){const X=65*T,Y=3*T;f('#243030',X,Y,14*T,11*T);f('#1a2424',X,Y,14*T,3);
      for(let wy=0;wy<4;wy++)for(let wx=0;wx<6;wx++)f(hash(wx,wy)>.8?'#5a7a6a':'#0f1616',X+12+wx*36,Y+22+wy*34,14,16);
      f('#e8e8e0',X+96,Y+6,16,16);f('#a8323a',X+102,Y+8,4,12);f('#a8323a',X+98,Y+12,12,4);
      f('#3a3a40',40*T,13*T-6,6*T,6);f('#55555e',43*T-2,11*T,4,2*T)}   // fonte seca
    for(let lx=9;lx<r.w-2;lx+=13){f('#0b0a0e',lx*T+7,9*T,2,5*T);f('#0b0a0e',lx*T+3,9*T,10,2);f('#c9b458',lx*T+3,9*T+2,4,2);
      x.fillStyle='rgba(201,180,88,.06)';x.beginPath();x.moveTo(lx*T+5,9*T+4);x.lineTo(lx*T-18,14*T);x.lineTo(lx*T+28,14*T);x.fill()}
  }
  for(const d of r.doors){const X=d.x*T+1,Y=(d.y+1)*T-24;f('#0a090c',X,Y,14,24);f(d.lock?'#3e4a55':d.id==='2'?'#2e3a34':'#5a3d2a',X+2,Y+2,10,22);
    f('rgba(0,0,0,.25)',X+3,Y+4,8,8);f(d.lock?'#ff4030':'#c9b458',X+10,Y+13,1,2)}
  for(let ty=0;ty<r.h;ty++)for(let tx=0;tx<r.w;tx++){const ch=r.g[ty][tx],X=tx*T,Y=ty*T;
    if(SOL(ch)){f(th.a,X,Y,T,T);f(th.b,X,Y+7,T,1);f(th.b,X,Y+15,T,1);const o=(ty&1)?4:12;f(th.b,X+o,Y,1,7);f(th.b,X+((o+8)%16),Y+8,1,7);
      if(hash(tx,ty)>.7)f(th.b,X+3+(hash(ty,tx)*8|0),Y+2,3,2);
      const up=r.at(tx,ty-1);if(!SOL(up)){f(th.top,X,Y,T,2);if((r.theme==='porao'||r.theme==='esgoto')&&hash(tx,1)>.4)f('#5c7a35',X+(hash(tx,2)*12|0),Y,3,1)}
      if(ch==='B'){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(X+7,Y,1,6);x.fillRect(X+8,Y+5,1,5);x.fillRect(X+6,Y+10,1,6);x.fillRect(X+3,Y+4,4,1);x.fillRect(X+9,Y+9,4,1)}}
    else if(ch==='='){f('#6a523c',X,Y,T,3);f('#3a2c20',X,Y+3,T,1);f('#3a2c20',X+2,Y+4,1,3);f('#3a2c20',X+13,Y+4,1,3)}
    else if(ch==='^'){for(let k=0;k<4;k++){f('#5c3668',X+k*4+1,Y+8,3,8);f('#9a5aa8',X+k*4+2,Y+4,1,5);f('#c8e06a',X+k*4+2,Y+3,1,1)}}}
}

function spr(ox,oy,w,face,L,fl){for(const p of L){g.fillStyle=fl?'#fff':p[4];g.fillRect(Math.round(face>0?ox+p[0]:ox+w-p[0]-p[2]),Math.round(oy+p[1]),p[2],p[3])}}
const TQ=[];
function txt(s,x,y,size,col,align){TQ.push({s,x,y,size:size||8,col:col||'#fff',align:align||'left'})}

function drawPlayer(){
  if(P.inv>0&&(P.inv>>2)&1&&state==='play')return;if(state==='dead')return;
  const x=Math.round(P.x-CX),y=Math.round(P.y-CY),air=!P.onGround,wk=!air&&Math.abs(P.vx)>.1?(P.walk>>3)&3:0,lo=[0,1,0,-1][wk],cr=P.crouch;
  const L=cr?[[1,9,4,4,'#23232b'],[4+lo,10,6,3,'#2d2d38'],[0,5,2,5,'#382a24'],[1,4,8,6,'#4a3830'],[2,4,6,2,'#b3312c'],[-1,5,3,1,'#b3312c'],
      [2,-2,6,6,'#e0b48c'],[1,-2,7,2,'#2b1d14'],[1,0,2,3,'#2b1d14'],[6,1,1,1,'#111']]
    :[[2,15,3,air?5:7-(lo>0?1:0),'#23232b'],[5+lo,15,3,air?6:7-(lo<0?1:0),'#2d2d38'],
      [0,7,2,7,'#382a24'],[1,6,8,9,'#4a3830'],[1,13,8,1,'#1a1a20'],[2,6,6,2,'#b3312c'],[-1,7,3,1,'#b3312c'],
      [2,0,6,6,'#e0b48c'],[1,0,7,2,'#2b1d14'],[1,2,2,3,'#2b1d14'],[6,3,1,1,'#111']];
  {const hy=cr?-2:0;if(P.sex==='f')L.push([1,hy,7,2,'#3a2418'],[1,hy+2,2,3,'#3a2418'],[-1,hy+1,2,2,'#3a2418'],[-2,hy+2,2,5,'#3a2418']);else L.push([4,hy+5,4,1,'#b89070'])}
  const id=P.cur,w=WEAPONS[id],atk=P.atk>0,M=[];let o=cr?-3:0;
  if(w.t==='gun'){o=cr?-5:0;const dn=P.rl>0?2:0;
    M.push([5,10,5,2,'#382a24'],[9,10,1,2,'#e0b48c'],[10,9+dn,w.len,2,'#8a8f98'],[10,11+dn,2,2,'#4a3a2a']);
    if(w.len>8)M.push([6,11,4,2,'#4a3a2a']);if(atk&&P.atk>Math.min(10,w.cd)-3)M.push([10+w.len,8,3,4,'#ffe27a'],[13+w.len,9,2,2,'#fff']);}
  else if(atk){M.push([5,8,6,2,'#382a24']);
    if(id==='faca')M.push([11,8,6,1,'#dfe6ea']);else if(id==='punhal')M.push([11,8,5,1,'#c9b458'],[11,7,1,3,'#4a3a2a']);
    else if(id==='machado')M.push([11,8,8,1,'#6b4a2a'],[17,5,3,7,'#b33a3a'],[20,6,1,5,'#dfe6ea']);
    else M.push([11,8,9,1,'#4a3a2a'],[18,1,2,8,id==='foice'?'#dfe6ea':'#bfe8ff'],[12,0,8,2,id==='foice'?'#dfe6ea':'#bfe8ff']);}
  else{M.push([4,8,2,5,'#382a24']);
    if(w.wide)M.push([-2,2,1,14,'#4a3a2a'],[-2,1,7,1,id==='foice'?'#dfe6ea':'#bfe8ff'],[4,2,1,3,id==='foice'?'#dfe6ea':'#bfe8ff']);
    else if(id==='machado')M.push([-1,4,1,10,'#6b4a2a'],[-3,3,3,4,'#b33a3a']);else M.push([5,13,1,4,'#dfe6ea'])}
  spr(x,y,10,P.face,L);spr(x,y+o,10,P.face,M);
  if(w.t==='melee'&&atk){const R=w.range,k=P.atk/10,c=w.wide?'rgba(224,90,106,'+k+')':'rgba(255,255,255,'+k+')',oy=(w.wide?-10:0)+o,hh=w.wide?1.5:1;
    spr(x,y,10,P.face,[[10,2*hh+oy,R*.5|0,2,c],[10+R*.5|0,4*hh+oy,R*.3|0,3,c],[10+R*.72|0,7*hh+oy,R*.28|0,8*hh|0,c],[10+R*.5|0,15*hh+oy,R*.3|0,3,c],[10,18*hh+oy,R*.5|0,2,c]])}
  if(P.rl>0){px('#000',x-4,y-9,18,3);px('#ffe27a',x-3,y-8,Math.round(16*(1-P.rl/P.rlMax)),1)}
}
function drawEnemy(e){
  const x=Math.round(e.x-CX),y=Math.round(e.y-CY);if(x<-60||x>W+60||y<-60||y>H+60)return;
  const a=e.anim,s=(a>>3)&1,fl=e.flash>0;let L;
  switch(e.t){
    case'zumbi':L=[[2,15+s,3,7-s,'#3a3530'],[5,15,3,7,'#2e2a26'],[1,6,8,9,'#5b5046'],[3,9,3,2,'#7a1f1f'],[2,0,6,6,'#7d9172'],[2,0,6,1,'#4a4038'],[6,2,1,1,'#f2e9a0'],[5,4,3,1,'#5a1414'],[6,7+s,6,2,'#7d9172']];break;
    case'cao':L=[[0,1,2,2,'#4a2220'],[2,2,11,5,'#5a2a26'],[5,3,4,2,'#a8323a'],[11,0,5,5,'#4a2220'],[14,1,1,1,'#ffec80'],[13,4,3,1,'#ddd'],[3+s,7,2,4,'#4a2220'],[10-s,7,2,4,'#4a2220']];break;
    case'rastejador':L=[[2,3,13,5,'#b0485a'],[4,4,2,3,'#8a3044'],[8,4,2,3,'#8a3044'],[13,1,5,5,'#e09aa8'],[14,2,2,1,'#c0707f'],[16,5,2,1,'#fff'],[1+s,7,3,3,'#8a3044'],[11-s,7,3,3,'#8a3044']];
      if(!e.onGround)L.push([18,4,7,1,'#e86a7a']);break;
    case'cacador':L=[[3,15+s,3,7-s,'#2f5e3a'],[8,15,3,7,'#2f5e3a'],[2,5,10,11,'#3f7a4a'],[5,8,5,6,'#6aa56a'],[6,1,7,5,'#3f7a4a'],[11,2,1,1,'#ff5040'],[9,5,4,1,'#eee'],[9,8,5,3,'#2f5e3a'],[13,9,3,1,'#f0f0f0'],[13,11,3,1,'#f0f0f0']];break;
    case'cuspidor':{const p=(a>>4)&1;L=[[2,16,3,6,'#3a3040'],[7,16,3,6,'#3a3040'],[0,6,12,11,'#6b5a7a'],[2,8,2+p,2+p,'#c8e06a'],[7,11,3,3,'#c8e06a'],[4,14,2,2,'#9ab84a'],[3,1,6,5,'#8a789a'],[2,0,8,2,'#a8456a'],[7,4,2,1,'#c8e06a']];break}
    case'colosso':{const tell=(e.st==='wind'||e.st==='cwind')&&(e.tm>>2)&1;const ay=e.st==='wind'?-8:0;
      L=[[4,28+s,7,12-s,'#2a2a30'],[15,28,7,12,'#2a2a30'],[2,8,22,21,tell?'#a05050':'#6e6a72'],[12,10,1,16,'#3a2a2a'],[9,14,7,1,'#3a2a2a'],[0,5,8,6,'#a8456a'],[1,4,3,2,'#e8c8d8'],[5,3,2,2,'#e8c8d8'],
        [10,0,8,8,'#9a959c'],[15,3,2,1,'#ff4030'],[13,6,4,1,'#3a2a2a'],[20,10+ay,7,16,'#807a84'],[20,26+ay,8,5,'#b8b0b8']];
      if(e.st==='stun')txt('✶',x+13,y-12,8,'#ffd84a','center');else if(e.st==='wind'||e.st==='cwind')txt('!',x+13,y-14,10,'#ff5040','center');break}
    default:L=[[1,1,6,6,'#c8e06a'],[2,0,4,8,'#c8e06a'],[0,2,8,4,'#c8e06a'],[3,3,2,2,'#f6ffd0']];
  }
  spr(x,y,e.w,e.face,L,fl);
  if(e.hp<e.maxHp){px('#000',x-1,y-5,e.w+2,3);px('#c0392b',x,y-4,Math.max(1,e.w*e.hp/e.maxHp|0),1)}
}
function drawBoss(){const b=boss,x=Math.round(b.x-CX),y=Math.round(b.y-CY),pul=Math.sin(b.t*.06)*2,fl=b.flash>0,ph2=b.hp<b.maxHp/2,G=14*T-CY;
  for(const r of b.roots){const rx=Math.round(r.x-CX);
    if(r.t<45){if((r.t>>2)&1)px('#e86a7a',rx-7,G-2,14,2);px('rgba(232,106,122,.25)',rx-7,G-44,14,42)}
    else{const k=r.t<50?(r.t-45)/5:r.t>65?(75-r.t)/10:1,hh=44*k|0;px('#8f7f68',rx-6,G-hh*.5,12,hh*.5);px('#cdbfa8',rx-4,G-hh*.8,8,hh*.8);px('#e6dcc8',rx-2,G-hh,4,hh)}}
  for(let i=0;i<6;i++){const tx=x+10-i*26+Math.sin(b.t*.04+i)*3;px('#8f7f68',tx,G-3,22,3);px('#a8987f',tx+4,G-5,10,2)}
  px('#8f7f68',x+4,y+104,72,8);px('#a8987f',x+14,y+98,52,8);
  px(fl?'#fff':'#cdbfa8',x+24,y+48,32,56);px(fl?'#fff':'#a8987f',x+24,y+48,5,56);px(fl?'#fff':'#e6dcc8',x+46,y+52,4,48);
  px('#5a1f38',x+6,y+46,68,5);for(let i=0;i<11;i++)px('#3a1226',x+8+i*6,y+47,1,4);
  for(let i=0;i<24;i++){const hw=Math.round(Math.sqrt(1-((23-i)/24)**2)*(44+pul));px(fl?'#fff':i<7?'#a83c6a':i<16?'#8a2f56':'#6e2444',x+40-hw,y+i*2,hw*2,2)}
  const sc=ph2?'#c8e06a':'#e8c8d8';[[-22,16,7,4],[8,8,9,5],[24,26,6,4],[-32,32,5,4],[-6,26,5,3],[-12,6,4,3],[30,38,5,3]].forEach(s=>px(sc,x+40+s[0],y+s[1],s[2],s[3]));
  px('#1a0d14',x+29,y+60,22,16);const open=b.active&&!b.dying;
  if(open){px(ph2?'#ff8a5a':'#f4e06a',x+31,y+62,18,12);const dxp=clamp((P.x-b.x-40)/40,-1,1)*5;px('#1a0d14',x+38+dxp,y+64,4,8)}else px('#3a2030',x+31,y+67,18,2);
  for(let i=0;i<5;i++){px('#e6dcc8',x+31+i*4,y+60,2,2);px('#e6dcc8',x+33+i*4,y+74,2,2)}
}
function drawWorld(){
  const th=TH[room.theme];
  if(th.out){g.drawImage(skyC,0,0);const o=-(cam.x*.25%960);g.drawImage(skyl,o,H-180);g.drawImage(skyl,o+960,H-180)}else px('#000',0,0,W,H);
  CX=Math.round(cam.x)+(shake>0?(Math.random()*4-2)|0:0);CY=Math.round(cam.y)+(shake>0?(Math.random()*4-2)|0:0);
  g.drawImage(room.cv,-CX,-CY);
  // âncoras
  room.anchors.forEach((a,i)=>{const x=a.x*T+8-CX,y=(a.y+1)*T-CY,on=P.anchor.room===room.id&&P.anchor.i===i,c=on?'#6ad0d0':'#6a6a72';
    px('#1a1a20',x-1,y-26,2,26);px('#1a1a20',x-4,y-2,8,2);px(c,x-5,y-36,10,10);px(c,x-4,y-37,8,12);px('#101014',x-3,y-35,6,8);
    const an=on?tick*.08:1;px(c,x+Math.round(Math.cos(an)*2),y-31+Math.round(Math.sin(an)*2),1,1);px(c,x,y-31,1,1);
    if(on&&(tick>>4)&1)px('rgba(106,208,208,.18)',x-8,y-40,16,16)});
  // baús
  room.chests.forEach((c,i)=>{if(SOL(room.g[c.y][c.x]))return;const x=c.x*T+2-CX,y=(c.y+1)*T-10-CY,op=F.chests[room.id+':'+i];
    if(op){px('#3a2a1a',x,y+3,12,7);px('#1a120c',x+1,y+3,10,3);px('#4a3622',x,y-3,12,3)}
    else{px('#6b4a2a',x,y,12,10);px('#8a6236',x,y,12,3);px('#3a2a1a',x,y+3,12,1);px('#e0b040',x+5,y+2,2,4);if((tick>>5)&1)px('#fff6c0',x+10,y-1,1,1)}});
  // artefatos
  room.arts.forEach((a,i)=>{if(F.arts[room.id+':'+i]||SOL(room.g[a.y][a.x]))return;const x=a.x*T+8-CX,y=(a.y+1)*T-CY,b=Math.round(Math.sin(tick*.07+i)*2);
    px('#3a3a44',x-5,y-4,10,4);px('#55555e',x-4,y-6,8,2);
    px('rgba(224,176,64,.18)',x-6,y-20+b,12,12);px('#e0b040',x-1,y-18+b,2,8);px('#e0b040',x-3,y-16+b,6,4);px('#fff6c0',x-1,y-16+b,1,2)});
  for(const it of items){const x=Math.round(it.x-CX),y=Math.round(it.y-CY+Math.sin(it.t*.15)*1.5);
    if(it.kind==='heal'){px('#e8e8e0',x,y,8,8);px('#3aa84a',x+3,y+1,2,6);px('#3aa84a',x+1,y+3,6,2)}
    else{px(RAR[WEAPONS[it.id].rar],x,y,8,8);px('#101014',x+1,y+1,6,6);px(RAR[WEAPONS[it.id].rar],x+2,y+3,4,2)}}
  for(const e of enemies)drawEnemy(e);
  if(boss)drawBoss();
  drawPlayer();
  for(const b of bullets){const l=b.id==='magnum'?7:4;px('#ffe27a',Math.round(b.x-CX-(b.vx>0?l:0)),Math.round(b.y-CY),l,b.id==='magnum'?2:1);px('#fff',Math.round(b.x-CX-(b.vx>0?1:0)),Math.round(b.y-CY),1,1)}
  for(const s of eshots){const x=Math.round(s.x-CX),y=Math.round(s.y-CY);px(s.c,x-2,y-1,4,2);px(s.c,x-1,y-2,2,4);px('#fff',x-1,y-1,1,1)}
  for(const p of parts)px(p.c,Math.round(p.x-CX),Math.round(p.y-CY),p.life>10?2:1,p.life>10?2:1);
  // atmosfera
  if(th.out){for(let i=0;i<3;i++){const fx=((tick*.2*(i+1)+i*210)%(W+240))-240;px('rgba(150,170,130,.05)',fx,160+i*24,240,16)}}
  else if(room.theme!=='casa'&&room.theme!=='predio'){for(let i=0;i<24;i++){const fx=(hash(i,1)*W+tick*.1*(i%3+1))%W,fy=((hash(i,2)*H-tick*.15*(i%2+1))%H+H)%H;px('rgba(200,224,106,.45)',fx|0,fy|0,1,1)}}
  g.drawImage(vig,0,0);
  for(const t of texts)txt(t.s,t.x-CX,t.y-CY,7,t.c,'center');
  const n=state==='play'&&nearThing();if(n)txt(n.chest?'[E] abrir':n.door?'[E] entrar':'[E] viajar',P.x+5-CX,P.y-14-CY,7,'#ffe27a','center');
}
function drawHUD(){
  const bw=Math.min(190,Math.round(P.maxHp*.55));
  px('#000',7,7,bw+2,8);px('#3a1418',8,8,bw,6);px('#c0392b',8,8,Math.round(bw*clamp(P.hp/P.maxHp,0,1)),6);px('#e86a5a',8,8,Math.round(bw*clamp(P.hp/P.maxHp,0,1)),1);
  txt(Math.ceil(P.hp)+'/'+P.maxHp,10+bw+3,7,7,'#f2d0c8');
  px('#e8e8e0',8,19,8,8);px('#3aa84a',11,20,2,6);px('#3aa84a',9,22,6,2);txt('x'+P.heals+'  [H]',19,19,7,'#bfe8bf');
  // personagem
  txt('Nv '+P.lvl,W-8,6,8,'#f2e9c0','right');px('#000',W-69,17,62,4);px('#e0b040',W-68,18,Math.round(60*P.xp/need(P.lvl)),2);
  txt('LOOP '+F.loop,W-8,23,7,'#6ad0d0','right');
  if(P.key)txt('cartão de acesso',W-8,32,6,'#e0b040','right');
  // arma
  const id=P.cur,w=WEAPONS[id],ws=P.weapons[id];
  px('rgba(0,0,0,.55)',6,H-30,150,24);px(RAR[w.rar],6,H-30,2,24);
  txt(w.n,12,H-28,8,RAR[w.rar]);txt('Nv '+ws.lvl+'  dano '+Math.round(wdmg(id))+(w.pellets?'x'+w.pellets:''),12,H-18,6,'#cfd6dc');
  if(w.t==='gun'){if(P.rl>0)txt('RECARGA',152,H-28,6,(tick>>3)&1?'#ffe27a':'#b89a40','right');else{const am=P.ammo[id]===undefined?magOf(id):P.ammo[id];txt(am+'/'+magOf(id),152,H-28,7,am<=Math.ceil(magOf(id)/4)?'#ff6a5a':'#ffe27a','right')}}
  px('#000',100,H-15,52,4);px('#5a9ae0',101,H-14,Math.round(50*ws.xp/wneed(ws.lvl)),2);
  txt('['+(P.order.indexOf(id)+1)+'/'+P.order.length+']  Q troca'+(w.t==='gun'?'  ·  R recarrega':''),8,H-38,5,'#8a8f98');
  if(boss&&boss.active){const bx=176;px('#000',bx-1,H-17,292,9);px('#2a1226',bx,H-16,290,7);px(boss.hp<boss.maxHp/2?'#c8e06a':'#a83c6a',bx,H-16,Math.round(290*boss.hp/boss.maxHp),7);txt('FUNGO PRIMORDIAL',bx+145,H-27,7,'#e8c8d8','center')}
  if(banner>0&&state==='play'){const a=clamp(banner/40,0,1);txt(room.name,W/2,40,14,'rgba(242,233,192,'+a+')','center')}
  toasts.forEach((t,i)=>txt(t.s,W/2,62+i*11,7,t.t<30?'rgba(200,200,200,.5)':t.c,'center'));
}
function objective(){return!P.dj?'Uma barricada fecha a Rua dos Mortos. Suba o Prédio Residencial.':!P.key?'O hospital está trancado. Algo enorme guarda a Praça Central.':!F.boss?'Desça ao porão do hospital e destrua o Fungo Primordial.':'O loop foi quebrado. A cidade é sua.'}
function drawPause(){px('rgba(5,4,8,.86)',0,0,W,H);txt('PAUSA',W/2,10,14,'#f2e9c0','center');txt('Objetivo: '+objective(),W/2,29,7,'#6ad0d0','center');
  txt(pauseTab?'status':'[ STATUS ]',W/2-40,41,6,pauseTab?'#8a8f98':'#ffe27a','center');txt(pauseTab?'[ MAPA ]':'mapa',W/2+40,41,6,pauseTab?'#ffe27a':'#8a8f98','center');txt('A/D troca de aba',W-24,41,5,'#5a5a66','right');
  if(pauseTab){drawMap();txt('P ou Enter para voltar',W/2,H-20,7,'#8a8f98','center');return}
  txt('ARSENAL',24,52,8,'#f2e9c0');
  P.order.forEach((id,i)=>{const w=WEAPONS[id],s=P.weapons[id];txt((i+1)+'  '+w.n,24,64+i*10,7,id===P.cur?'#fff':RAR[w.rar]);txt('Nv '+s.lvl+'  dano '+Math.round(wdmg(id))+'  XP '+s.xp+'/'+wneed(s.lvl),150,64+i*10,7,'#8a8f98')});
  txt('CONTROLES',300,52,8,'#f2e9c0');
  ['A/D ou ←/→   andar','Espaço / W   pular','S ou ↓   agachar','S + pulo    descer plataforma','J / X / clique   atacar','R    recarregar','Q ou 1–9    trocar arma','H    usar kit médico','E    abrir baú / porta','E na âncora   viajar','P    pausa    M   som'].forEach((s,i)=>txt(s,300,64+i*10,7,'#cfd6dc'));
  {const names=Object.keys(P.arts).map(k=>ARTS[k].n+(P.arts[k]>1?' x'+P.arts[k]:''));txt('ARTEFATOS',24,172,8,'#f2e9c0');
    if(!names.length)txt('nenhum ainda — procure pela cidade e atrás de paredes rachadas',24,184,6,'#8a8f98');
    for(let i=0;i<names.length;i+=4)txt(names.slice(i,i+4).join('  ·  '),24,184+(i/4)*9,6,'#e0b040')}
  txt('Nível '+P.lvl+'  ·  Vida '+Math.ceil(P.hp)+'/'+P.maxHp+'  ·  Artefatos '+artCount()+'  ·  Abates '+F.kills+'  ·  Loop '+F.loop,W/2,H-34,7,'#e0b040','center');
  txt('P ou Enter para voltar',W/2,H-20,7,'#8a8f98','center')}
function drawTitle(){g.drawImage(skyC,0,0);const o=-((tick*.15)%960);g.drawImage(skyl,o,H-150);g.drawImage(skyl,o+960,H-150);px('#07060a',0,H-12,W,12);
  for(let i=0;i<3;i++){const fx=((tick*.2*(i+1)+i*210)%(W+240))-240;px('rgba(150,170,130,.06)',fx,170+i*24,240,16)}
  g.drawImage(vig,0,0);
  txt('MICÉLIO',W/2,34,40,'#c8e06a','center');txt('A CIDADE EM LOOP',W/2,80,11,'#e8c8d8','center');
  ['A cidade amanhece às 6:00. Sempre às 6:00.','No porão do hospital, um fungo gigante prende o tempo.','Cada morte reinicia o dia — mas suas armas e sua força ficam.','Atravesse ruas, casas e prédios. Chegue ao centro. Quebre o loop.'].forEach((s,i)=>txt(s,W/2,108+i*11,7,'#cfd6dc','center'));
  const hs=hasSave();if((tick>>5)&1)txt(hs?'ENTER — continuar':'ENTER ou clique — começar',W/2,170,10,'#f2e9c0','center');
  if(hs)txt('N — novo jogo (apaga o progresso)',W/2,186,7,'#8a8f98','center');
  txt('Andar A/D · Pular Espaço · Agachar S · Atacar J ou clique · Recarregar R · Trocar arma Q · Curar H · Interagir E · Pausa P',W/2,H-30,6,'#8a8f98','center');
  txt('clique na tela para o teclado funcionar',W/2,H-20,6,'#5a5a66','center')}
// ---------- mapa, viagem e seleção de personagem
let pauseTab=0;const travel={list:[],sel:0};
const MAP={rua1:[30,150,78,16],rua2:[110,150,88,16],praca:[200,150,68,16],casa:[48,122,40,14],predio:[134,86,34,54],esgoto:[140,178,56,14],hospital:[282,118,62,48],porao:[282,178,120,14]};
const SHORT={rua1:'Periferia',rua2:'Rua dos Mortos',praca:'Praça',casa:'Casa',predio:'Prédio',esgoto:'Esgoto',hospital:'Hospital',porao:'Porão'};
const LINKS=[['rua1','rua2'],['rua2','praca'],['casa','rua1'],['predio','rua2'],['esgoto','rua2'],['praca','hospital'],['hospital','porao']];
function drawMap(){
  for(const l of LINKS){if(!F.seen[l[0]]&&!F.seen[l[1]])continue;const a=MAP[l[0]],b=MAP[l[1]],ax=a[0]+a[2]/2|0,ay=a[1]+a[3]/2|0,bx=b[0]+b[2]/2|0,by=b[1]+b[3]/2|0;
    px('#4a4a56',Math.min(ax,bx),ay,Math.abs(bx-ax)+1,1);px('#4a4a56',bx,Math.min(ay,by),1,Math.abs(by-ay)+1)}
  for(const id in MAP){const m=MAP[id],seen=F.seen[id],adj=LINKS.some(l=>(l[0]===id&&F.seen[l[1]])||(l[1]===id&&F.seen[l[0]]));if(!seen&&!adj)continue;
    const cur=room.id===id;px(cur&&((tick>>4)&1)?'#ffe27a':seen?'#6a6a72':'#33333c',m[0]-1,m[1]-1,m[2]+2,m[3]+2);px(seen?'#22202a':'#121118',m[0],m[1],m[2],m[3]);
    txt(seen?SHORT[id]:'?',m[0]+m[2]/2,m[1]+m[3]/2-3,5,seen?'#cfd6dc':'#5a5a66','center');
    if(seen)ROOMS[id].anchors.forEach((a,i)=>{if(F.anchors[id+':'+i])px('#6ad0d0',m[0]+2+Math.round(a.x/ROOMS[id].w*(m[2]-6)),m[1]+m[3]-3,2,2)});
    if(cur)px('#ff6a5a',m[0]+1+Math.round(P.x/(room.w*T)*(m[2]-4)),m[1]+1+Math.round(P.y/(room.h*T)*(m[3]-4)),2,2)}
  txt('■ você',24,H-46,6,'#ff6a5a');txt('■ âncora conhecida',70,H-46,6,'#6ad0d0');txt('?  área ainda não visitada',170,H-46,6,'#8a8f98');
}
function openTravel(){const order=Object.keys(ROOMS);
  travel.list=Object.keys(F.anchors).filter(k=>ROOMS[k.split(':')[0]]).sort((a,b)=>order.indexOf(a.split(':')[0])-order.indexOf(b.split(':')[0])||a.localeCompare(b));
  travel.sel=Math.max(0,travel.list.indexOf(P.anchor.room+':'+P.anchor.i));state='travel';SND.pick()}
function updTravel(){const n=travel.list.length;if(hit('w','ArrowUp'))travel.sel=(travel.sel+n-1)%n;if(hit('s','ArrowDown'))travel.sel=(travel.sel+1)%n;
  if(hit('Escape','p','q')){state='play';return}
  if(hit('Enter','e',' ')){const k=travel.list[travel.sel].split(':'),same=k[0]===P.anchor.room&&+k[1]===P.anchor.i;state='play';if(same)return;
    P.anchor={room:k[0],i:+k[1]};respawn();SND.door();toast('Viagem pela âncora: '+ROOMS[k[0]].name,'#6ad0d0');save()}}
function drawTravel(){px('rgba(5,4,8,.88)',0,0,W,H);txt('VIAGEM ENTRE ÂNCORAS',W/2,30,12,'#6ad0d0','center');txt('Os relógios parados ainda se lembram uns dos outros.',W/2,48,6,'#8a8f98','center');
  travel.list.forEach((k,i)=>{const q=k.split(':'),r=ROOMS[q[0]],lab=r.name+(r.anchors.length>1?' ('+(+q[1]+1)+')':''),here=q[0]===P.anchor.room&&+q[1]===P.anchor.i;
    txt((i===travel.sel?'▶ ':'   ')+lab+(here?'   — você está aqui':''),W/2-100,72+i*13,8,i===travel.sel?'#ffe27a':'#cfd6dc')});
  txt('W/S escolher  ·  Enter viajar  ·  Esc cancelar',W/2,H-24,7,'#8a8f98','center')}
function drawCharSel(){g.drawImage(skyC,0,0);g.drawImage(skyl,0,H-150);px('#07060a',0,H-12,W,12);g.drawImage(vig,0,0);px('rgba(5,4,8,.55)',0,0,W,H);
  txt('QUEM ACORDA ÀS 6:00?',W/2,34,14,'#f2e9c0','center');
  const keep=[P.x,P.y,P.sex,P.face,P.onGround];CX=0;CY=0;P.onGround=true;P.face=1;
  ['m','f'].forEach((sx_,i)=>{const cx=W/2-70+i*140,sel=keep[2]===sx_;px(sel?'#ffe27a':'#33333c',cx-37,67,74,114);px('#121118',cx-36,68,72,112);
    g.save();g.translate(cx-20,82);g.scale(4,4);P.x=0;P.y=0;P.sex=sx_;drawPlayer();g.restore();
    txt(sx_==='m'?'MASCULINO':'FEMININO',cx,188,9,sel?'#ffe27a':'#8a8f98','center')});
  P.x=keep[0];P.y=keep[1];P.sex=keep[2];P.face=keep[3];P.onGround=keep[4];
  txt('A/D escolher  ·  Enter confirmar',W/2,H-36,8,'#cfd6dc','center')}
function render(){
  if(state==='title')drawTitle();
  else if(state==='charsel')drawCharSel();
  else{drawWorld();drawHUD();
    if(state==='travel'){TQ.length=0;drawTravel()}
    if(fade>0)px('rgba(0,0,0,'+fade+')',0,0,W,H);
    if(state==='pause'){TQ.length=0;drawPause()}
    if(state==='dead'){px('rgba(20,0,4,'+Math.min(.85,stT/70)+')',0,0,W,H);if(stT>40){txt('VOCÊ MORREU',W/2,96,22,'#c0392b','center');txt('Os ponteiros giram para trás. 6:00.',W/2,128,8,'#e8c8d8','center');txt('O loop '+(F.loop+1)+' começa — você mantém níveis e armas.',W/2,142,7,'#6ad0d0','center')}}
    if(state==='end'){px('rgba(8,6,12,'+Math.min(.9,stT/90)+')',0,0,W,H);if(stT>60){txt('6:01',W/2,50,34,'#f2e9c0','center');
      ['O relógio da praça dá um passo que não dava há muito tempo.','O micélio seca, as ruas se calam, o sol finalmente sobe.','Você quebrou o loop.'].forEach((s,i)=>txt(s,W/2,104+i*12,8,'#cfd6dc','center'));
      txt('Loops vividos: '+F.loop+'   ·   Nível '+P.lvl+'   ·   Abates '+F.kills+'   ·   Artefatos '+artCount(),W/2,156,7,'#e0b040','center');
      if(stT>120)txt('ENTER — continuar explorando a cidade',W/2,186,8,'#6ad0d0','center')}}}
  sx.imageSmoothingEnabled=false;sx.fillStyle='#050408';sx.fillRect(0,0,cv.width,cv.height);sx.drawImage(buf,OX,OY,W*S,H*S);
  sx.textBaseline='top';
  for(const t of TQ){sx.font='bold '+Math.max(6,Math.round(t.size*S))+'px "Courier New",Consolas,monospace';sx.textAlign=t.align;
    sx.fillStyle='rgba(0,0,0,.85)';sx.fillText(t.s,OX+(t.x+.7)*S,OY+(t.y+.7)*S);sx.fillStyle=t.col;sx.fillText(t.s,OX+t.x*S,OY+t.y*S)}
  TQ.length=0;
}
// ---------- loop principal
newGame();room=ROOMS.rua1;
let last=0,acc=0;
function frame(t){acc+=Math.min(60,t-last);last=t;let n=0;while(acc>=16.667&&n<4){update();acc-=16.667;n++;for(const k in pressed)delete pressed[k]}render();requestAnimationFrame(frame)}
window.__dbg={get P(){return P},get F(){return F},get room(){return room},get state(){return state},get boss(){return boss},get enemies(){return enemies},ROOMS,WEAPONS,enterRoom,giveLoot,keys,pressed};
requestAnimationFrame(frame);
