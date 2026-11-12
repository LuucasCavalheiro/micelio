'use strict';
// Dados: armas, artefatos e inimigos
// ---------- armas
const RAR=['#cfd6dc','#6ac06a','#5a9ae0','#c86ae0','#e0b040'];
const WEAPONS={
  faca:{n:'Faca',t:'melee',dmg:9,cd:16,range:22,rar:0},
  punhal:{n:'Punhal Ritual',t:'melee',dmg:7,cd:9,range:18,crit:.25,rar:1},
  pistola:{n:'Pistola 9mm',t:'gun',dmg:9,cd:22,mag:12,rl:50,spd:7,len:5,rar:0},
  escopeta:{n:'Escopeta',t:'gun',dmg:7,cd:50,mag:5,rl:85,spd:7,pellets:5,spread:.2,life:18,len:10,rar:1},
  smg:{n:'Submetralhadora',t:'gun',dmg:5,cd:8,mag:30,rl:70,spd:8,spread:.06,len:7,rar:1},
  machado:{n:'Machado de Bombeiro',t:'melee',dmg:24,cd:28,range:28,rar:1},
  magnum:{n:'Magnum .44',t:'gun',dmg:40,cd:48,mag:6,rl:80,spd:10,pierce:3,len:7,rar:2},
  rifle:{n:'Rifle de Assalto',t:'gun',dmg:10,cd:10,mag:24,rl:95,spd:10,spread:.03,len:11,rar:2},
  foice:{n:'Foice de Combate',t:'melee',dmg:26,cd:26,range:40,wide:true,leech:.05,rar:3},
  foice_lunar:{n:'Foice Lunar',t:'melee',dmg:40,cd:24,range:46,wide:true,leech:.08,rar:4}};
const need=l=>Math.round(25*Math.pow(l,1.4));     // XP do personagem
const wneed=l=>Math.round(18*Math.pow(l,1.4));    // XP de arma
const wmult=l=>1+.12*(l-1);
// ---------- artefatos
const ARTS={
  coracao:{n:'Coração Fóssil',d:'vida máxima +20'},
  botas:{n:'Botas de Impulso',d:'pulo duplo'},
  pente:{n:'Pente Estendido',d:'+50% de balas por pente'},
  gatilho:{n:'Gatilho Leve',d:'armas de fogo atiram 15% mais rápido'},
  polvora:{n:'Pólvora Negra',d:'+15% de dano com armas de fogo'},
  pedra:{n:'Pedra de Amolar',d:'+20% de dano corpo a corpo'},
  luva:{n:'Luvas Ágeis',d:'recarga 30% mais rápida'},
  amuleto:{n:'Amuleto do Loop',d:'+25% de XP'},
  soro:{n:'Soro Verde',d:'kits médicos curam 60%'}};
// baús sorteiam o conteúdo dentro da faixa da região
const POOLS={1:[['pistola',3],['punhal',3],['escopeta',1]],
  2:[['escopeta',3],['smg',3],['machado',2],['pistola',1],['punhal',1]],
  3:[['magnum',3],['rifle',3],['machado',2],['smg',1],['escopeta',1],['foice_lunar',.3]]};
const hasA=id=>P.arts[id]>0;
const artCount=()=>Object.values(P.arts).reduce((a,b)=>a+b,0);
const wdmg=id=>{const w=WEAPONS[id];return w.dmg*wmult(P.weapons[id].lvl)*(w.t==='gun'?(hasA('polvora')?1.15:1):(hasA('pedra')?1.2:1))};
const magOf=id=>Math.round(WEAPONS[id].mag*(hasA('pente')?1.5:1));
const cdOf=w=>w.t==='gun'&&hasA('gatilho')?Math.round(w.cd*.85):w.cd;
const rlOf=w=>Math.round(w.rl*(hasA('luva')?.7:1));

// ---------- inimigos (B.O.W.s originais)
const ET={
  zumbi:{n:'Zumbi',w:10,h:22,hp:24,dmg:8,xp:4,sp:.45,heal:.03,drops:[['punhal',.015]]},
  cao:{n:'Cão Podre',w:16,h:11,hp:16,dmg:9,xp:4,sp:1.25,heal:.03,drops:[]},
  rastejador:{n:'Rastejador',w:18,h:10,hp:45,dmg:13,xp:10,sp:1.3,heal:.05,drops:[['smg',.02]]},
  cuspidor:{n:'Cuspidor',w:12,h:22,hp:50,dmg:12,xp:12,sp:.3,heal:.07,drops:[['machado',.03]]},
  cacador:{n:'Caçador',w:14,h:22,hp:90,dmg:18,xp:20,sp:1.1,heal:.08,drops:[['machado',.05],['foice_lunar',.02]]},
  colosso:{n:'Colosso',w:26,h:40,hp:800,dmg:26,xp:150,sp:.7,heal:0,drops:[]},
  esporo:{n:'Esporo',w:8,h:8,hp:8,dmg:8,xp:1,sp:.9,heal:0,drops:[]}};
