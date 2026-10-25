/* Host is the authority; teams submit actions, never scores. */
(()=>{
'use strict';
const {CATALOG,BY_ID,DEFAULT_IDS}=TeamGameCatalog;
const NAMES=DEFAULT_IDS.map(id=>BY_ID[id].name);
function random(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n}
function token(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('')}
function rng(seed){let n=seed>>>0;return max=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n%max}}
function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=r(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
class Room{
  constructor(code,names=[],settings=null){this.id=token();this.code=code;this.settings=Room.validateSettings(settings);this.gameIds=this.settings.gameIds;this.phase='lobby';this.game=0;this.playoff=null;this.winner=null;this.completedAt=null;this.seeds=Array.from({length:this.gameIds.length*this.settings.memberCount},()=>random(2**32));this.tables=names.map((name,i)=>({number:i+1,name,players:[],ticket:null,approved:false,ready:false,connected:false,lastSeen:0,phase:'waiting',player:0,scores:this.gameIds.map(()=>0),turn:null,last:null}));}
  static validateSettings(settings){
    if(!settings)return{teamCount:null,memberCount:4,gameIds:[...DEFAULT_IDS],tieGameId:'reaction-green'};
    const {teamCount,memberCount,gameIds,tieGameId='reaction-green'}=settings;
    if(!Number.isInteger(teamCount)||teamCount<1||teamCount>100)throw Error('Teams 1 se 100 ke beech honi chahiye.');
    if(!Number.isInteger(memberCount)||memberCount<1||memberCount>100)throw Error('Har team ke members 1 se 100 ke beech hon.');
    if(!Array.isArray(gameIds)||!gameIds.length||gameIds.length>50||new Set(gameIds).size!==gameIds.length||gameIds.some(id=>typeof id!=='string'||!Object.hasOwn(BY_ID,id)))throw Error('50 games mein se kam se kam ek valid game choose karein; repeats allowed nahi.');
    if(BY_ID[tieGameId]?.family!=='reaction')throw Error('Valid reaction tie-breaker choose karein.');return{teamCount,memberCount,gameIds:[...gameIds],tieGameId};
  }
  get memberCount(){return this.settings.memberCount}
  get maxScore(){return this.memberCount*this.gameIds.length*100}
  get currentGame(){return BY_ID[this.playoff?this.settings.tieGameId:this.gameIds[this.game]]}
  static restore(s){
    if(!s||!/^\d{6}$/.test(s.code)||!Array.isArray(s.tables)||!Array.isArray(s.seeds))throw Error('Saved room invalid');
    const room=Object.assign(Object.create(Room.prototype),s);room.settings=s.settings&&s.settings.teamCount!==null?Room.validateSettings(s.settings):Room.validateSettings(null);room.gameIds=room.settings.gameIds;
    room.tables=room.tables.filter(t=>t.members||t.ticket||room.phase!=='lobby');
    room.tables.forEach(t=>{if(!t.members){t.code=t.code||room.code+'-'+token().slice(0,6).toUpperCase();t.members=[{name:t.players[0]||'Captain',ticket:t.ticket||token(),connected:false,lastSeen:0,ready:!!t.ready},null,null,null];}});
    room.tables.forEach(t=>{const turn=t.turn;if(!turn||turn.gameId)return;turn.gameId=room.playoff?room.settings.tieGameId:room.gameIds[room.game];turn.title=BY_ID[turn.gameId].name;turn.instruction=turn.game===0?'6 flashes usi order mein repeat karo':turn.game===2?'1 se 12 tak order mein tap karo':'Green signal par tap karo';if(turn.game===0){turn.targetSequence=[...turn.sequence];turn.flashInterval=600;turn.flashDuration=320;turn.readyAt=turn.startedAt+4400;}if(turn.game===1)turn.questions.forEach(q=>{q.answer=q.ink;q.labels=['Laal','Neela','Hara','Baingani'];q.prompt='Shabd nahi, ink ka rang chuno';q.options=[0,1,2,3]});if(turn.game===2)turn.targetOrder=Array.from({length:12},(_,i)=>i+1);if(turn.game===3){turn.reactionGoal=1;turn.reactionTotal=turn.reaction||0;turn.window=5000;}});
    return room;
  }
  createTeam(name,player,claim,now=Date.now()){
    if(typeof claim!=='string'||!/^[a-f0-9]{32}$/.test(claim))throw Error('Member identity invalid.');
    for(const table of this.tables){const seat=table.members?.findIndex(m=>m?.ticket===claim);if(seat>=0){this.touch(table,seat,now);return{table,seat}}}
    if(this.phase!=='lobby')throw Error('Game shuru ho chuka hai.');
    if(this.settings.teamCount&&this.tables.length>=this.settings.teamCount)throw Error('Admin ki set ki hui total teams complete hain.');
    if(typeof name!=='string'||!name.trim()||name.length>40||typeof player!=='string'||!player.trim()||player.length>40)throw Error('Team aur captain ka naam bharein.');
    if(this.tables.some(t=>t.name.toLowerCase()===name.trim().toLowerCase()))throw Error('Is naam ki team already hai.');
    let code;do{code=this.code+'-'+token().slice(0,6).toUpperCase()}while(this.tables.some(t=>t.code===code));
    const table={number:Math.max(0,...this.tables.map(t=>t.number))+1,name:name.trim(),code,players:Array.from({length:this.memberCount},(_,i)=>i===0?player.trim():''),members:Array.from({length:this.memberCount},(_,i)=>i===0?{name:player.trim(),ticket:claim,connected:true,lastSeen:now,ready:false}:null),approved:false,ready:false,connected:true,lastSeen:now,phase:'waiting',player:0,scores:this.gameIds.map(()=>0),turn:null,last:null};
    this.tables.push(table);return{table,seat:0};
  }
  joinMember(code,name,claim,now=Date.now()){
    const table=this.tables.find(t=>t.code===String(code).toUpperCase());if(!table)throw Error('Team code sahi nahi hai.');
    if(typeof claim!=='string'||!/^[a-f0-9]{32}$/.test(claim))throw Error('Member identity invalid.');
    let seat=table.members.findIndex(m=>m?.ticket===claim);
    if(seat<0){if(this.phase!=='lobby')throw Error('Game shuru ho chuka hai; sirf existing members reconnect kar sakte hain.');seat=table.members.findIndex(m=>!m);if(seat<0)throw Error(`Team ke ${this.memberCount} members complete hain.`);if(typeof name!=='string'||!name.trim()||name.length>40)throw Error('Apna naam bharein.');table.members[seat]={name:name.trim(),ticket:claim,connected:true,lastSeen:now,ready:false};table.players[seat]=name.trim();}
    this.touch(table,seat,now);return{table,seat};
  }
  touch(table,seat,now=Date.now()){const m=table.members[seat];m.connected=true;m.lastSeen=now;table.connected=table.members.every(m=>m&&m.connected&&now-m.lastSeen<15000);table.lastSeen=now;}
  memberReady(table,seat){if(this.phase!=='lobby'||!table.approved)throw Error('Host approval ka intezaar karein.');table.members[seat].ready=true;table.ready=table.members.every(m=>m?.ready);}
  pause(now=Date.now()){if(this.phase==='playing'&&!this.pausedAt)this.pausedAt=now;}
  resume(now=Date.now()){if(!this.pausedAt)return;const delta=Math.max(0,now-this.pausedAt);this.tables.forEach(t=>{if(t.phase==='playing'&&t.turn){for(const key of ['startedAt','deadline','goAt','readyAt'])if(Number.isFinite(t.turn[key]))t.turn[key]+=delta}});this.pausedAt=null;}
  allOnline(now=Date.now()){return this.activeTables().every(t=>this.online(t,now));}
  join(number,players,ticket,now=Date.now()){
    const t=this.tables.find(t=>t.number===number);if(!t)throw Error('Yeh table host ne create nahi ki hai.');
    if(t.ticket){if(ticket!==t.ticket)throw Error('Table already joined hai. Host se table reset karwayein.');}
    else{if(this.phase!=='lobby')throw Error('Game shuru ho chuka hai.');if(!Array.isArray(players)||players.length!==4||players.some(p=>typeof p!=='string'||!p.trim()||p.length>40))throw Error('Chaaron players ke naam chahiye.');t.players=players.map(p=>p.trim());t.ticket=token();}
    t.connected=true;t.lastSeen=now;return t;
  }
  approve(number){const t=this.tables.find(t=>t.number===number);if(this.phase!=='lobby'||(!t?.ticket&&!t?.members))throw Error('Pehle team ko join karne dein.');t.approved=true;}
  reset(number){if(this.phase!=='lobby')throw Error('Game ke dauraan table reset nahi hogi.');const t=this.tables.find(t=>t.number===number);if(!t)throw Error('Table nahi mili.');Object.assign(t,{ticket:null,players:[],approved:false,connected:false,ready:false,lastSeen:0});}
  ready(t){if(this.phase!=='lobby'||!t.approved)throw Error('Host approval ka intezaar karein.');t.ready=true;}
  online(t,now){return t.members?t.members.every(m=>m&&m.connected&&now-m.lastSeen<15000):t.connected&&now-t.lastSeen<15000}
  canStart(now=Date.now()){return this.phase==='lobby'&&this.tables.length>0&&(!this.settings.teamCount||this.tables.length===this.settings.teamCount)&&this.tables.every(t=>this.online(t,now)&&t.approved&&t.ready)}
  launch(now=Date.now()){
    if(this.phase==='lobby'){if(!this.canStart(now))throw Error('Sabhi tables connected, approved aur ready honi chahiye.');}
    else if(this.phase!=='between'&&this.phase!=='playoffReady')throw Error('Sabhi teams ke complete hone ka intezaar karein.');
    const active=this.activeTables();if(active.some(t=>!this.online(t,now)))throw Error('Participating tables ko reconnect karwayein.');
    this.phase='playing';active.forEach(t=>{t.player=0;t.phase='playing';this.startTurn(t,now+5000)});
  }
  activeTables(){return this.playoff?this.tables.filter(t=>this.playoff.candidates.includes(t.number)):this.tables}
  startTurn(t,now){
    const id=this.playoff?this.settings.tieGameId:this.gameIds[this.game],seed=this.playoff?this.playoffSeeds?.[t.player]:this.seeds[this.game*this.memberCount+t.player],r=rng(seed||1);
    t.phase='playing';t.turn={id:token(),...TeamGameCatalog.create(id,r,now)};
  }
  next(t,now=Date.now()){if(this.pausedAt||this.phase!=='playing'||t.phase!=='result'||t.player>=this.memberCount-1)throw Error('Agli baari abhi available nahi.');t.player++;this.startTurn(t,now);}
  action(t,message,now=Date.now()){
    if(this.pausedAt)return false;const turn=t.turn;if(this.phase!=='playing'||t.phase!=='playing'||message.turn!==turn?.id)return false;
    if(now>=turn.deadline){this.settle(t);this.checkRound(now);return true}if(now<turn.startedAt||message.step!==turn.index||!Number.isInteger(message.value))return false;
    const result=TeamGameCatalog.act(turn,message.value,now);if(result.accepted===false)return false;if(result.done)this.settle(t);this.checkRound(now);return true;
  }
  points(t){return TeamGameCatalog.points(t)}
  settle(t){if(t.phase!=='playing')return;const turn=t.turn,score=this.points(turn);if(this.playoff){this.playoff.scores[t.number]=(this.playoff.scores[t.number]||0)+score;this.playoff.times[t.number]=(this.playoff.times[t.number]||0)+(turn.reaction===null?10000:turn.reaction)}else t.scores[this.game]+=score;t.last={score,reaction:turn.reaction,early:turn.game===3&&turn.mistakes>0};t.phase=t.player===this.memberCount-1?'complete':'result';}
  tick(now=Date.now()){
    let changed=false;this.tables.forEach(t=>{if(t.members){t.members.forEach(m=>{if(m?.connected&&now-m.lastSeen>=15000){m.connected=false;changed=true}});t.connected=this.online(t,now);}else if(t.connected&&now-t.lastSeen>=15000){t.connected=false;changed=true}});
    if(this.phase==='playing'&&this.tables.some(t=>t.members)){
      if(!this.allOnline(now)&&!this.pausedAt){this.pause(now);changed=true}
      else if(this.allOnline(now)&&this.pausedAt){this.resume(now);changed=true}
    }
    if(!this.pausedAt){this.tables.forEach(t=>{if(this.phase==='playing'&&t.phase==='playing'&&now>=t.turn.deadline){this.settle(t);changed=true}});if(this.phase==='playing')changed=this.checkRound(now)||changed;}
    return changed;
  }
  checkRound(now){if(this.phase!=='playing'||!this.activeTables().every(t=>t.phase==='complete'))return false;
    if(this.playoff){const p=this.playoff,order=[...p.candidates].sort((a,b)=>(p.scores[b]-p.scores[a])||(p.times[a]-p.times[b])),best=order[0],tied=order.filter(n=>p.scores[n]===p.scores[best]&&p.times[n]===p.times[best]);if(tied.length===1)this.finish(best,now);else this.tie(tied)}
    else if(this.game<this.gameIds.length-1){this.game++;this.phase='between';}else{const scores=this.tables.map(t=>t.scores.reduce((a,b)=>a+b,0)),best=Math.max(...scores),top=this.tables.filter((t,i)=>scores[i]===best).map(t=>t.number);if(top.length===1)this.finish(top[0],now);else this.tie(top)}return true;
  }
  tie(candidates){this.playoff={candidates,scores:{},times:{},round:(this.playoff?.round||0)+1};this.playoffSeeds=Array.from({length:this.memberCount},()=>random(2**32));this.phase='playoffReady';}
  finish(number,now){this.winner=number;this.completedAt=now;this.phase='finished';}
  snapshot(number,now=Date.now(),seat=null){
    const mine=this.tables.find(t=>t.number===number),effectiveNow=this.pausedAt||now;let turn=null;
    if(mine?.phase==='playing'&&mine.turn&&(seat===null||seat===mine.player))turn=TeamGameCatalog.publicTurn(mine.turn,effectiveNow);
    return {id:this.id,code:this.code,phase:this.phase,game:this.game,names:this.gameIds.map(id=>BY_ID[id].name),settings:this.settings,gameIds:this.gameIds,maxScore:this.maxScore,currentGame:this.currentGame,now,pausedAt:this.pausedAt||null,winner:this.winner,completedAt:this.completedAt,playoff:this.playoff,tables:this.tables.map(t=>({number:t.number,name:t.name,players:t.players,connected:this.online(t,now),joined:!!t.ticket||!!t.members,memberCount:t.members?t.members.filter(Boolean).length:t.players.length,members:t.members?t.members.map(m=>m?{name:m.name,connected:m.connected&&now-m.lastSeen<15000,ready:m.ready}:null):null,approved:t.approved,ready:t.ready,phase:t.phase,player:t.player,scores:t.scores,last:t.last})),mine:mine?{number:mine.number,code:mine.code||null,seat,memberReady:seat!==null?mine.members?.[seat]?.ready:false,phase:mine.phase,approved:mine.approved,ready:mine.ready,player:mine.player,last:mine.last,turn}:null};
  }
}
window.TeamRoom={Room,NAMES,token,random};
})();
