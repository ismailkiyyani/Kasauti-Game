const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const {WebSocketServer}=require('ws');
const engine=require('./engine');
const PORT=process.env.PORT||3000,rooms=new Map(),MAXQ=20;
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/^(the|a|an) /,'').replace(/\s+/g,' ').trim();

const server=http.createServer((req,res)=>{
  fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{res.writeHead(e?500:200,{'Content-Type':'text/html; charset=utf-8'});res.end(d)});
});

const send=(ws,o)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
const clamp=(v,a,b,d)=>{v=+v;return isFinite(v)&&v>0?Math.min(b,Math.max(a,Math.round(v))):d};
const defRules=()=>({maxQ:20,limit:5});
const sanRules=(x,o)=>{x=x||{};return{maxQ:clamp(x.maxQ,10,20,o.maxQ),limit:clamp(x.limit,1,60,o.limit)}};
const used=r=>r.log.filter(l=>!l.g&&!l.h&&!l.u).length;
const other=t=>t==='A'?'B':'A';
const EMO=['👍','😂','😮','👏','🔥','❤️'];
const mem=(r,t)=>[...r.players].filter(([id,p])=>p.team===t).map(([id])=>id);
function view(r,pid){
  const p=r.players.get(pid)||{},host=pid===r.host;
  const see=r.phase==='ended'||(!!p.team&&p.team!==r.asking);
  return{t:'state',code:r.code,you:pid,host,hostId:r.host,phase:r.phase,endsAt:r.endsAt,log:r.log,result:r.result,asking:r.asking,score:r.score,round:r.round,rules:r.rules,used:used(r),secretSet:!!r.secret,cdEnds:r.cdEnds||0,
    asker:r.asker,answerer:r.answerer,ai:!!r.ai,aiCat:r.ai?r.ai.label:'',clues:r.ai?engine.clues(r.log):[],aiBusy:(r.aiN||0)>0,players:[...[...r.players].map(([id,q])=>({id,name:q.name,team:q.team,ok:!!q.ok})),...(r.ai?[{id:'AI',name:'AI Keeper 🤖',team:'B',ok:true}]:[])],secret:see?r.secret:undefined,
    typing:(r.typing&&r.typing.until>Date.now()&&(host||p.team===r.asking))?{by:(r.players.get(r.typing.pid)||{}).name}:null,chat:r.chat.slice(-60),tchat:p.team?r.tchat[p.team].slice(-60):[]}}
const bcast=r=>{for(const [id,p] of r.players)send(p.ws,view(r,id))};
const end=(r,seek,why,by)=>{r.phase='ended';const w=seek?r.asking:other(r.asking);r.score[w]++;r.result={winner:w,seekers:seek,name:r.secret,why,by,...(r.ai&&r.ai.rec?{info:r.ai.rec.info,facts:engine.facts(r.ai.rec)}:{})}};
const check=r=>{if(r.phase==='playing'&&used(r)>=r.rules.maxQ&&r.log.every(l=>l.a||l.h))end(r,false,'questions')};
const begin=r=>{r.phase='playing';r.endsAt=Date.now()+r.rules.limit*60000};
function fixRoles(r){if(r.asker&&r.players.get(r.asker)?.team!==r.asking)r.asker=null;const a=r.players.get(r.answerer);if(!a||!a.team||a.team===r.asking)r.answerer=null}
function shuffle(r){const ids=[...r.players.keys()].filter(i=>i!==r.host);for(let i=ids.length-1;i>0;i--){const j=crypto.randomInt(i+1);[ids[i],ids[j]]=[ids[j],ids[i]]}
  ids.forEach((id,i)=>{const p=r.players.get(id);p.team=i%2?'B':'A';p.ok=false});fixRoles(r)}

const nextAsker=r=>{const L=[...r.players].filter(([,p])=>p.team===r.asking).map(([id])=>id);if(!L.length)return null;return L[(L.indexOf(r.asker)+1)%L.length]};
const ensureRoles=r=>{if(r.phase==='lobby'||r.phase==='ended')return;if(!r.asker)r.asker=mem(r,r.asking)[0]||null;if(!r.answerer)r.answerer=mem(r,other(r.asking))[0]||null};
const dropPlayer=(r,pid)=>{r.players.delete(pid);if(r.asker===pid)r.asker=null;if(r.answerer===pid)r.answerer=null;if(r.typing&&r.typing.pid===pid)r.typing=null;ensureRoles(r)};
const closeRoom=(r,msg)=>{for(const [,p] of r.players){send(p.ws,{t:'closed',e:msg});if(p.ws)p.ws.room=null}rooms.delete(r.code)};
// ---- AI Keeper (offline): the secret and every answer come from engine.js / data.js. No external service.
const AI_THINK=process.env.KASOTI_AI_DELAY==='0'?0:1; // set KASOTI_AI_DELAY=0 to answer instantly (used by tests)
function aiStart(r){
  const a=r.ai,rec=engine.pick(a.opts,a.used);
  a.rec=rec;a.used.push(rec.n);r.secret=rec.n;r.log=[];r.typing=null;r.cdEnds=Date.now()+6000;r.phase='countdown';bcast(r);
}
function aiTurn(r,i){
  const l=r.log[i];if(!l)return;
  r.aiN=(r.aiN||0)+1;bcast(r);
  setTimeout(()=>{
    r.aiN--;
    if(r.phase!=='playing'||!rooms.has(r.code)||r.log[i]!==l)return;
    const rec=r.ai.rec;
    try{
      if(l.h)l.r=engine.hint(rec,r.log.filter(x=>!x.h&&!x.g).map(x=>x.q));
      else if(l.g){const ok=engine.judge(rec,l.q);l.a=ok?'Yes':'No';end(r,ok,ok?'guessed':'wrong',l.by)}
      else{const o=engine.answer(rec,l.q);l.a=o.a;if(o.a==='Unclear'){l.u=1;l.note=o.note}check(r)}
    }catch(e){l.a='Unclear';l.u=1;l.note='Something went wrong. Please ask again.'}
    bcast(r);
  },AI_THINK?450+Math.random()*450:0);
}

const wss=new WebSocketServer({server});
wss.on('connection',ws=>{
  ws.on('close',()=>{if(ws.room&&ws.room.players.has(ws.pid)&&ws.room.players.get(ws.pid).ws===ws)ws.room.players.get(ws.pid).ws=null});
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw)}catch(e){return}
    if(m.t==='create'){
      const u=String(m.name||'Host').trim().slice(0,24)||'Host';
      let c;do{c=crypto.randomBytes(2).toString('hex').toUpperCase()}while(rooms.has(c));
      const pid=crypto.randomBytes(6).toString('hex');
      const r={code:c,host:pid,phase:'lobby',endsAt:0,cat:'',secret:'',log:[],result:null,players:new Map(),at:Date.now(),asking:'A',score:{A:0,B:0},round:1,rules:defRules(),asker:null,answerer:null,chat:[],tchat:{A:[],B:[]},mid:0};
      r.players.set(pid,{name:u,team:'B',ok:true,ws});rooms.set(c,r);ws.pid=pid;ws.room=r;return bcast(r);
    }
    if(m.t==='createai'){
      if([...rooms.values()].filter(x=>x.ai).length>=200)return send(ws,{t:'err',e:'Lots of AI games are running. Please try again in a moment.'});
      const name=String(m.name||'Player').trim().slice(0,24)||'Player';
      const opts={topic:['any','person','place'].includes(m.topic)?m.topic:'any',country:['both','india','pakistan'].includes(m.country)?m.country:'both',difficulty:['any','easy','medium','hard'].includes(m.difficulty)?m.difficulty:'any'};
      let c;do{c=crypto.randomBytes(2).toString('hex').toUpperCase()}while(rooms.has(c));
      const pid=crypto.randomBytes(6).toString('hex');
      const r={code:c,host:pid,phase:'countdown',endsAt:0,secret:'',log:[],result:null,players:new Map(),at:Date.now(),asking:'A',score:{A:0,B:0},round:1,rules:{maxQ:20,limit:clamp(m.limit,3,30,10)},asker:pid,answerer:'AI',chat:[],tchat:{A:[],B:[]},mid:0,ai:{opts,label:engine.label(opts),used:[],rec:null}};
      r.players.set(pid,{name,team:'A',ok:true,ws});rooms.set(c,r);ws.pid=pid;ws.room=r;aiStart(r);return;
    }
    if(m.t==='peek'){
      const r=rooms.get(String(m.code||'').toUpperCase().trim());if(!r)return send(ws,{t:'err',e:'Game not found'});
      if(r.phase!=='lobby')return send(ws,{t:'err',e:'That game has already started. Ask the host to wait for the next round.'});
      return send(ws,{t:'peek',code:r.code,asking:r.asking,round:r.round,players:[...r.players].map(([id,p])=>({name:p.name,team:p.team,host:id===r.host}))});
    }
    if(m.t==='join'){
      const r=rooms.get(String(m.code||'').toUpperCase().trim());if(!r)return send(ws,{t:'err',e:'Game not found',gone:1});
      let pid=m.pid;
      if(!r.players.has(pid)&&r.phase!=='lobby')return send(ws,{t:'err',e:'That game has already started. Ask the host to wait for the next round.',gone:1});
      if(!r.players.has(pid)){if(r.players.size>=50)return send(ws,{t:'err',e:'Room is full'});
        const n=t=>mem(r,t).length;
        let team=m.team==='A'||m.team==='B'?m.team:(n('A')<=n('B')?'A':'B');
        pid=crypto.randomBytes(6).toString('hex');r.players.set(pid,{name:String(m.name||'Guest').slice(0,24),team})}
      r.players.get(pid).ws=ws;ws.pid=pid;ws.room=r;return bcast(r);
    }
    const r=ws.room,pid=ws.pid;if(!r)return;const me=r.players.get(pid);if(!me)return;
    const host=pid===r.host,x=String(m.text||'').trim().slice(0,300),playing=r.phase==='playing',asking=me.team===r.asking;
    if(r.ai&&(m.t==='leave'||m.t==='endgame')){rooms.delete(r.code);ws.room=null;return send(ws,{t:'left'})}
    if(m.t==='leave'){if(host)return closeRoom(r,'The host left, so the game ended.');dropPlayer(r,pid);ws.room=null;send(ws,{t:'left'});return bcast(r)}
    if(host&&m.t==='endgame')return closeRoom(r,'The host ended the game.');
    if(host&&m.t==='kick'){const p=r.players.get(m.pid);if(!p||m.pid===pid)return;send(p.ws,{t:'kicked'});if(p.ws)p.ws.room=null;dropPlayer(r,m.pid);return bcast(r)}
    if(host&&m.t==='team'&&r.phase==='lobby'&&r.players.has(m.pid)){const t=m.team==='A'||m.team==='B'?m.team:null;if(t||m.pid===pid){const q=r.players.get(m.pid);q.team=t;q.ok=false;fixRoles(r)}}
    else if(host&&m.t==='rules'&&r.phase==='lobby'){r.rules=sanRules(m.rules,r.rules);if(m.asking==='A'||m.asking==='B'){r.asking=m.asking;fixRoles(r)}}
    else if(host&&m.t==='shuffle'&&r.phase==='lobby')shuffle(r);
    else if(host&&m.t==='asking'&&r.phase==='lobby'){r.asking=m.team==='B'?'B':'A';fixRoles(r)}
    else if(host&&m.t==='start'&&r.phase==='lobby'){
      r.rules=sanRules(m.rules,r.rules);fixRoles(r);
      const g=mem(r,r.asking),a=mem(r,other(r.asking));
      if(!g.length||!a.length)return send(ws,{t:'err',e:'Each team needs at least one player.'});
      if(!r.secret)return send(ws,{t:'err',e:'The Keepers must save the secret name first.'});
      if([...r.players].some(([id,p])=>id!==r.host&&p.team&&!p.ok))return send(ws,{t:'err',e:'Everyone needs to confirm their team first.'});
      if(!r.asker)r.asker=g[0];if(!r.answerer)r.answerer=a[0];
      r.log=[];r.cdEnds=Date.now()+12000;r.phase='countdown';
    }
    else if(host&&m.t==='skip'&&r.phase==='countdown')begin(r);
    else if(host&&m.t==='cancel'&&r.phase==='countdown'&&!r.ai)r.phase='lobby';
    else if(host&&m.t==='end'&&playing)end(r,false,'host');
    else if(host&&r.ai&&m.t==='next'&&r.phase==='ended'){r.log=[];r.result=null;r.endsAt=0;r.round++;aiStart(r)}
    else if(host&&m.t==='next'&&r.phase==='ended'){r.phase='lobby';r.chat=[];r.tchat={A:[],B:[]};r.log=[];r.secret='';r.players.forEach(p=>p.ok=false);r.result=null;r.endsAt=0;r.round++;r.asking=other(r.asking);r.asker=r.answerer=null;if(m.shuffle)shuffle(r)}
    else if(m.t==='myteam'&&r.phase==='lobby'&&(m.team==='A'||m.team==='B')){if(me.ok&&!host)return;me.team=m.team;fixRoles(r)}
    else if(m.t==='confirm'&&r.phase==='lobby'&&me.team)me.ok=true;
    else if(m.t==='secret'&&r.phase==='lobby'&&me.team&&!asking&&(me.ok||host)){const s=String(m.secret||'').trim().slice(0,80);if(s)r.secret=s}
    else if(m.t==='role'&&r.phase!=='ended'&&r.players.has(m.pid)){const t=r.players.get(m.pid).team;
      if(m.role==='asker'&&t===r.asking&&host){if(r.typing&&r.typing.until>Date.now()&&r.asker!==m.pid)return send(ws,{t:'err',e:'The questioner is writing a question — wait until it has been asked.'});r.asker=m.pid}
      else if(m.role==='answerer'&&t&&t!==r.asking&&(host||(me.team&&!asking)))r.answerer=m.pid}
    else if(playing&&pid===r.asker&&asking&&m.t==='ask'&&x&&used(r)<r.rules.maxQ&&!r.log.some(l=>!l.h&&!l.a)){r.typing=null;r.log.push({by:me.name,q:x.slice(0,160),a:null});r.asker=nextAsker(r);if(r.ai)aiTurn(r,r.log.length-1)}
    else if(playing&&pid===r.asker&&asking&&m.t==='guess'&&x&&!r.log.some(l=>!l.h&&!l.a)){r.typing=null;r.log.push({by:me.name,q:x.slice(0,80),a:null,g:1});if(r.ai)aiTurn(r,r.log.length-1)}
    else if(playing&&pid===r.asker&&asking&&m.t==='hint'&&used(r)>=10&&r.log.filter(l=>l.h).length<3&&!r.log.some(l=>l.h&&!l.r&&!l.s)){r.log.push({by:me.name,q:'💡 '+(x.slice(0,100)||'Can we get a hint?'),h:1});if(r.ai)aiTurn(r,r.log.length-1)}
    else if(playing&&pid===r.answerer&&m.t==='ans'&&r.log[m.i]&&!r.log[m.i].h&&!r.log[m.i].g&&(m.a==='Yes'||m.a==='No')&&!r.log.slice(m.i+1).some(l=>!l.g&&!l.h)){const l=r.log[m.i];if(l.a&&l.a!==m.a)l.ed=1;l.a=m.a;check(r)}
    else if(playing&&pid===r.answerer&&m.t==='verdict'&&r.log[m.i]&&r.log[m.i].g&&!r.log[m.i].a){const l=r.log[m.i],ok=!!m.ok;l.a=ok?'Yes':'No';end(r,ok,ok?'guessed':'wrong',l.by)}
    else if(playing&&pid===r.answerer&&(m.t==='hintreply'||m.t==='hintskip')&&r.log[m.i]&&r.log[m.i].h&&!r.log[m.i].r&&!r.log[m.i].s){
      if(m.t==='hintskip')r.log[m.i].s=1;else{if(!x)return;r.log[m.i].r=x.slice(0,160)}}
    else if(m.t==='pass'&&playing&&pid===r.asker&&asking){r.typing=null;r.asker=nextAsker(r)}
    else if(m.t==='typing'&&playing&&pid===r.asker&&asking){r.typing=m.on?{pid,until:Date.now()+4000}:null}
    else if(m.t==='chat'&&x){const list=m.scope==='t'?(me.team&&r.tchat[me.team]):r.chat;
      if(list){list.push({id:++r.mid,by:me.name,pid,text:x,rx:{}});if(list.length>200)list.shift()}}
    else if(m.t==='react'&&EMO.includes(m.e)){const list=m.scope==='t'?(me.team&&r.tchat[me.team]):r.chat,g=list&&list.find(y=>y.id===m.id);
      if(g){const a=g.rx[m.e]||(g.rx[m.e]=[]),i=a.indexOf(pid);i<0?a.push(pid):a.splice(i,1);if(!a.length)delete g.rx[m.e]}}
    else return;
    bcast(r);
  });
});
setInterval(()=>{const now=Date.now();for(const [c,r] of rooms){
  if(r.typing&&now>r.typing.until){r.typing=null;bcast(r)}
  if(r.phase==='countdown'&&now>=r.cdEnds){begin(r);bcast(r)}
  if(r.phase==='playing'&&now>r.endsAt){end(r,false,'time');bcast(r)}
  if(now-r.at>(r.ai?2:6)*3600e3)rooms.delete(c)}},1000).unref();

if(require.main===module)server.listen(PORT,'0.0.0.0',()=>{
  console.log('Kasoti running:\n  http://localhost:'+PORT);
  for(const l of Object.values(os.networkInterfaces()))for(const i of l)if(i.family==='IPv4'&&!i.internal)console.log('  Same Wi-Fi/LAN: http://'+i.address+':'+PORT);
});

module.exports={server,rooms};
