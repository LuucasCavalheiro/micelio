'use strict';
// Mundo: definição das salas da cidade
// ---------- salas
const ROOMS={};
class Room{
  constructor(id,name,w,h,theme,mult){Object.assign(this,{id,name,w,h,theme,mult:mult||1});this.g=[];
    for(let y=0;y<h;y++)this.g.push(new Array(w).fill(' '));
    this.doors=[];this.chests=[];this.anchors=[];this.arts=[];this.spawns=[];this.left=null;this.right=null;this.bs=[];this.bHp=30;this.boss=null;ROOMS[id]=this}
  rect(x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(j>=0&&j<this.h&&i>=0&&i<this.w)this.g[j][i]=c;return this}
  door(x,y,id,to,toId,lock){this.doors.push({x,y,id,to,toId,lock});return this}
  chest(x,y,loot){this.chests.push({x,y,loot});return this}
  anchor(x,y){this.anchors.push({x,y});return this}
  art(x,y,id){this.arts.push({x,y,id});return this}
  en(t,x,y){this.spawns.push({t,x,y});return this}
  ens(t,y,xs){xs.forEach(x=>this.en(t,x,y));return this}
  at(tx,ty){if(ty<0)return' ';if(ty>=this.h)return'#';
    if(tx<0){if(!this.left)return'#';tx=0}if(tx>=this.w){if(!this.right)return'#';tx=this.w-1}return this.g[ty][tx]}
}
function street(id,name,w,theme){const r=new Room(id,name,w,17,theme);r.rect(0,14,w,3,'#');return r}
function floors(r,ys,gxEven,gxOdd){ys.forEach((y,i)=>{r.rect(1,y,r.w-2,1,'#');const gx=i%2?gxOdd:gxEven;r.rect(gx,y,3,1,'=');r.rect(gx,y+3,3,1,'=')})}

{ // 1 · Periferia
  const r=street('rua1','Periferia',100,'rua');
  r.rect(0,0,1,14,'#').anchor(5,13).rect(14,13,3,1,'#').door(26,13,'1','casa','1');
  r.ens('zumbi',13,[22,31,38,52,58,68,76,84,92]).ens('cao',13,[72,88]);
  r.rect(32,11,4,1,'=').rect(39,9,4,1,'=').rect(45,8,6,1,'#').chest(48,7,{t:1,w:1});
  r.rect(61,14,3,2,' ').rect(61,15,3,1,'^');
  r.chest(80,13,{t:1});
  r.rect(86,10,2,1,'=').rect(90,6,3,1,'#').art(91,5,'coracao');   // só com pulo duplo
  r.right='rua2';
}
{ // 2 · Casa
  const r=new Room('casa','Casa Abandonada',30,17,'casa');
  r.rect(0,0,30,17,'#').rect(1,5,28,9,' ').rect(1,9,22,1,'#').rect(24,11,4,1,'=');
  r.door(4,13,'1','rua1','1').ens('zumbi',13,[12,18]).en('zumbi',15,8);
  r.chest(11,8,{t:1,w:1});
  r.rect(7,5,1,4,'B').rect(1,5,6,4,'S').art(3,8,'coracao').chest(5,8,{t:1});   // sala secreta
}
{ // 3 · Rua dos Mortos
  const r=street('rua2','Rua dos Mortos',110,'rua');
  r.ens('cao',13,[12,20,36]).ens('zumbi',13,[16,28,33,46]).door(40,13,'1','predio','1').anchor(50,13);
  r.rect(56,9,2,5,'#');                                   // barricada: só com pulo duplo
  r.ens('rastejador',13,[66,82]).ens('zumbi',13,[70,75,90,100]).en('cuspidor',104,13);
  r.rect(78,10,3,1,'=').rect(84,7,4,1,'#').chest(85,6,{t:2,w:1});
  r.door(96,13,'2','esgoto','2');r.left='rua1';r.right='praca';
}
{ // 4 · Prédio
  const r=new Room('predio','Prédio Residencial',30,44,'predio',1.1);
  r.rect(0,0,30,44,'#').rect(1,3,28,39,' ');
  floors(r,[37,32,27,22,17,12,7],24,3);
  r.door(3,41,'1','rua2','1').ens('zumbi',41,[12,18]);
  r.ens('zumbi',36,[8,15]).en('cao',14,31).en('zumbi',20,31);
  r.en('rastejador',14,26).chest(8,26,{t:2,w:1});
  r.ens('zumbi',21,[10,18]).en('rastejador',14,21).anchor(25,21);
  r.ens('rastejador',16,[10,20]).chest(6,16,{t:1}).art(14,16,'pedra');
  r.en('cuspidor',20,11).en('rastejador',10,11);
  r.en('rastejador',22,6).chest(14,6,{art:'botas'});
}
{ // 5 · Praça
  const r=street('praca','Praça Central',80,'praca',1.2);
  r.rect(79,0,1,14,'#').ens('cacador',13,[16,26]).en('cuspidor',22,13).anchor(32,13);
  r.en('colosso',56,13).rect(44,10,4,1,'=').rect(62,10,4,1,'=').art(64,9,'polvora');
  r.door(74,13,'1','hospital','1','key');r.left='rua2';
}
{ // 6 · Esgoto (opcional)
  const r=new Room('esgoto','Esgoto',70,17,'esgoto',1.2);
  r.rect(0,0,70,17,'#').rect(1,6,68,8,' ').door(3,13,'2','rua2','2');
  r.rect(14,13,3,1,'^').rect(30,13,4,1,'^').rect(40,11,4,1,'=');
  r.ens('cuspidor',13,[22,44]).ens('rastejador',13,[26,38,52]).ens('cao',13,[36,48]);
  r.art(56,13,'pente').chest(60,13,{t:3,w:1});
  r.rect(63,6,6,4,'#').rect(63,10,1,4,'B').rect(64,10,5,4,'S').art(65,13,'amuleto').chest(67,13,{t:3});   // sala secreta
}
{ // 7 · Hospital
  const r=new Room('hospital','Hospital Santa Aurora',60,32,'hospital',1.4);
  r.rect(0,0,60,32,'#').rect(1,6,58,24,' ');
  floors(r,[25,20,15,10],53,4);
  r.door(3,29,'1','praca','1').anchor(8,29).door(56,29,'2','porao','2');
  r.en('cacador',24,29).en('cuspidor',36,29).ens('zumbi',29,[30,42,46]);
  r.ens('rastejador',24,[14,30]).en('cuspidor',44,24).chest(6,24,{t:2});
  r.ens('cacador',19,[20,40]).ens('zumbi',19,[28,32]).chest(54,19,{t:3}).art(10,19,'luva');
  r.ens('cuspidor',14,[12,30]).ens('rastejador',14,[22,46]).chest(6,14,{t:3,w:1});
  r.ens('cacador',9,[24,36]);
  r.rect(49,6,1,4,'B').rect(50,6,9,4,'S').art(53,9,'gatilho').chest(56,9,{t:3,w:1});   // sala secreta
}
{ // 8 · Porão
  const r=new Room('porao','Porão — O Ninho',124,17,'porao',1.7);
  r.rect(0,0,124,17,'#').rect(1,4,122,10,' ').door(3,13,'2','hospital','2').anchor(8,13);
  r.ens('cacador',13,[20,34,52]).ens('cuspidor',13,[28,46,60]).ens('rastejador',13,[24,40,56]);
  r.rect(30,13,3,1,'^').rect(48,13,3,1,'^').rect(36,10,4,1,'=').rect(62,10,4,1,'=').art(63,9,'soro');
  r.anchor(70,13).chest(74,13,{heal:2});
  r.ens('cacador',13,[92,99]).en('cuspidor',103,13).rect(86,10,4,1,'=').rect(96,10,4,1,'=');
  r.boss={x:112};
}
for(const id in ROOMS){const r=ROOMS[id];for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const c=r.g[y][x];if(c==='B'||c==='S')r.bs.push([x,y,c])}}
