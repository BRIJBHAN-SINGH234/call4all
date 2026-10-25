/* Host is the authority; teams submit actions, never scores. */
(()=>{
'use strict';
const NAMES=['Memory Relay','Colour Sprint','Number Hunt','Reaction Relay'];
function random(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n}
function token(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('')}
function rng(seed){let n=seed>>>0;return max=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n%max}}
function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=r(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
class Room{
  constructor(code,names){this.id=token();this.code=code;this.phase='lobby';this.game=0;this.playoff=null;this.winner=null;this.completedAt=null;this.seeds=Array.from({length:16},()=>random(2**32));this.tables=names.map((name,i)=>({number:i+1,name,players:[],ticket:null,approved:false,ready:false,connected:false,lastSeen:0,phase:'waiting',player:0,scores:[0,0,0,0],turn:null,last:null}));}
  static restore(s){if(!s||!/^\d{6}$/.test(s.code)||!Array.isArray(s.tables)||!s.tables.length||!Array.isArray(s.seeds))throw Error('Saved room invalid');return Object.assign(Object.create(Room.prototype),s)}
  join(number,players,ticket,now=Date.now()){
    const t=this.tables.find(t=>t.number===number);if(!t)throw Error('Yeh table host ne create nahi ki hai.');
    if(t.ticket){if(ticket!==t.ticket)throw Error('Table already joined hai. Host se table reset karwayein.');}
    else{if(this.phase!=='lobby')throw Error('Game shuru ho chuka hai.');if(!Array.isArray(players)||players.length!==4||players.some(p=>typeof p!=='string'||!p.trim()||p.length>40))throw Error('Chaaron players ke naam chahiye.');t.players=players.map(p=>p.trim());t.ticket=token();}
    t.connected=true;t.lastSeen=now;return t;
  }
  approve(number){const t=this.tables[number-1];if(this.phase!=='lobby'||!t?.ticket)throw Error('Pehle team ko join karne dein.');t.approved=true;}
  reset(number){if(this.phase!=='lobby')throw Error('Game ke dauraan table reset nahi hogi.');const t=this.tables[number-1];if(!t)throw Error('Table nahi mili.');Object.assign(t,{ticket:null,players:[],approved:false,connected:false,ready:false,lastSeen:0});}
  ready(t){if(this.phase!=='lobby'||!t.approved)throw Error('Host approval ka intezaar karein.');t.ready=true;}
  online(t,now){return t.connected&&now-t.lastSeen<15000}
  canStart(now=Date.now()){return this.phase==='lobby'&&this.tables.every(t=>this.online(t,now)&&t.approved&&t.ready)}
  launch(now=Date.now()){
    if(this.phase==='lobby'){if(!this.canStart(now))throw Error('Sabhi tables connected, approved aur ready honi chahiye.');}
    else if(this.phase!=='between'&&this.phase!=='playoffReady')throw Error('Sabhi teams ke complete hone ka intezaar karein.');
    const active=this.activeTables();if(active.some(t=>!this.online(t,now)))throw Error('Participating tables ko reconnect karwayein.');
    this.phase='playing';active.forEach(t=>{t.player=0;t.phase='playing';this.startTurn(t,now+5000)});
  }
  activeTables(){return this.playoff?this.tables.filter(t=>this.playoff.candidates.includes(t.number)):this.tables}
  startTurn(t,now){
    const game=this.playoff?3:this.game,r=rng(this.seeds[game*4+t.player]);
    t.phase='playing';t.turn={id:token(),game,startedAt:now,deadline:now+[30000,25000,30000,11000][game],index:0,correct:0,mistakes:0,sequence:Array.from({length:6},()=>r(16)),board:shuffle(Array.from({length:16},(_,i)=>i+1),r),questions:Array.from({length:8},()=>{const ink=r(4);return{ink,word:(ink+1+r(3))%4,options:shuffle([0,1,2,3],r)}}),goAt:now+1800+r(2500),reaction:null};if(game===3)t.turn.deadline=t.turn.goAt+5000;
  }
  next(t,now=Date.now()){if(this.phase!=='playing'||t.phase!=='result'||t.player>=3)throw Error('Agli baari abhi available nahi.');t.player++;this.startTurn(t,now);}
  action(t,message,now=Date.now()){
    const turn=t.turn;if(this.phase!=='playing'||t.phase!=='playing'||message.turn!==turn?.id)return false;
    if(now>=turn.deadline){this.settle(t);return true}if(now<turn.startedAt)return false;
    if(message.step!==turn.index)return false;
    const v=message.value;if(!Number.isInteger(v))return false;
    if(turn.game===0){if(now<turn.startedAt+4400||v<0||v>15)return false;if(v!==turn.sequence[turn.index]){turn.mistakes++;this.settle(t);return true}turn.index++;turn.correct++;if(turn.index===6)this.settle(t);}
    else if(turn.game===1){if(v<0||v>3)return false;if(v===turn.questions[turn.index].ink)turn.correct++;else turn.mistakes++;turn.index++;if(turn.index===8)this.settle(t);}
    else if(turn.game===2){if(v<1||v>16)return false;if(v!==turn.index+1){turn.mistakes++;if(turn.mistakes>=3)this.settle(t)}else{turn.index++;turn.correct++;if(turn.index===12)this.settle(t)}}
    else{turn.mistakes=now<turn.goAt?1:0;turn.reaction=turn.mistakes?null:now-turn.goAt;this.settle(t)}
    this.checkRound(now);return true;
  }
  points(t){if(t.game===0)return t.correct*15+(t.correct===6?10:0);if(t.game===1)return t.correct*12+(t.correct===8?4:0);if(t.game===2)return t.correct*8+(t.correct===12?4:0);return t.reaction===null||t.mistakes?0:Math.max(0,Math.min(100,Math.round(100-t.reaction/20)))}
  settle(t){if(t.phase!=='playing')return;const turn=t.turn,score=this.points(turn);if(this.playoff){this.playoff.scores[t.number]=(this.playoff.scores[t.number]||0)+score;this.playoff.times[t.number]=(this.playoff.times[t.number]||0)+(turn.reaction===null?10000:turn.reaction)}else t.scores[this.game]+=score;t.last={score,reaction:turn.reaction,early:turn.game===3&&turn.mistakes>0};t.phase=t.player===3?'complete':'result';}
  tick(now=Date.now()){let changed=false;this.tables.forEach(t=>{if(t.connected&&now-t.lastSeen>=15000){t.connected=false;changed=true}if(this.phase==='playing'&&t.phase==='playing'&&now>=t.turn.deadline){this.settle(t);changed=true}});if(this.phase==='playing')changed=this.checkRound(now)||changed;return changed;}
  checkRound(now){if(this.phase!=='playing'||!this.activeTables().every(t=>t.phase==='complete'))return false;
    if(this.playoff){const p=this.playoff,order=[...p.candidates].sort((a,b)=>(p.scores[b]-p.scores[a])||(p.times[a]-p.times[b])),best=order[0],tied=order.filter(n=>p.scores[n]===p.scores[best]&&p.times[n]===p.times[best]);if(tied.length===1)this.finish(best,now);else this.tie(tied)}
    else if(this.game<3){this.game++;this.phase='between';}else{const scores=this.tables.map(t=>t.scores.reduce((a,b)=>a+b,0)),best=Math.max(...scores),top=this.tables.filter((t,i)=>scores[i]===best).map(t=>t.number);if(top.length===1)this.finish(top[0],now);else this.tie(top)}return true;
  }
  tie(candidates){this.playoff={candidates,scores:{},times:{},round:(this.playoff?.round||0)+1};for(let i=12;i<16;i++)this.seeds[i]=random(2**32);this.phase='playoffReady';}
  finish(number,now){this.winner=number;this.completedAt=now;this.phase='finished';}
  snapshot(number,now=Date.now()){
    const mine=this.tables.find(t=>t.number===number);let turn=null;
    if(mine?.phase==='playing'&&mine.turn){const t=mine.turn;turn={id:t.id,game:t.game,startedAt:t.startedAt,deadline:t.deadline,index:t.index,correct:t.correct,mistakes:t.mistakes};if(t.game===0){turn.readyAt=t.startedAt+4400;turn.sequence=now<turn.readyAt?t.sequence:null;}if(t.game===1){const q=t.questions[t.index];turn.question={word:q.word,ink:q.ink,options:q.options}}if(t.game===2)turn.board=t.board;if(t.game===3)turn.goAt=t.goAt;}
    return {id:this.id,code:this.code,phase:this.phase,game:this.game,names:NAMES,now,winner:this.winner,completedAt:this.completedAt,playoff:this.playoff,tables:this.tables.map(t=>({number:t.number,name:t.name,players:t.players,connected:this.online(t,now),joined:!!t.ticket,approved:t.approved,ready:t.ready,phase:t.phase,player:t.player,scores:t.scores,last:t.last})),mine:mine?{number:mine.number,phase:mine.phase,approved:mine.approved,ready:mine.ready,player:mine.player,last:mine.last,turn}:null};
  }
}
window.TeamRoom={Room,NAMES,token,random};
})();
