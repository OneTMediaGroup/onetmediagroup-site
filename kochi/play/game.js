export const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const edges=lines.flatMap(l=>[[l[0],l[1]],[l[1],l[2]]]);
export const other=p=>p==='black'?'white':'black';
export const adjacent=(a,b)=>edges.some(([x,y])=>x===a&&y===b||x===b&&y===a);
export const fresh=()=>({board:Array(9).fill(null),turn:'black',history:[]});
export const winningLine=g=>lines.find(l=>g.board[l[0]]&&l.every(i=>g.board[i]===g.board[l[0]]));
export const winner=g=>{const l=winningLine(g);return l?g.board[l[0]]:null};
export const placing=g=>g.board.filter(Boolean).length<6;
export const remaining=(g,p)=>3-g.board.filter(x=>x===p).length;
export function legal(g){if(winner(g))return [];const empty=g.board.flatMap((v,i)=>v?[]:[i]);return placing(g)?empty.map(to=>({from:null,to})):g.board.flatMap((v,from)=>v===g.turn?empty.filter(to=>adjacent(from,to)).map(to=>({from,to})):[])}
export function apply(g,a){if(!legal(g).some(x=>x.from==a.from&&x.to===a.to))throw Error('Choose an empty point along one connection.');const board=[...g.board];if(a.from!=null)board[a.from]=null;board[a.to]=g.turn;const next={board,turn:g.turn,history:[...g.history,{from:a.from??null,to:a.to}]};if(!winner(next))next.turn=other(g.turn);return next}
export const replay=actions=>actions.reduce(apply,fresh());
export const depths={hiro:1,zara:2,olivia:2,marco:3,luna:4,sujith:4,kai:4,onet:5};
export function winningActions(g,p){if(placing(g)&&remaining(g,p)<=0)return [];return legal({...g,turn:p}).filter(a=>{const b=[...g.board];if(a.from!=null)b[a.from]=null;b[a.to]=p;return lines.some(l=>l.every(i=>b[i]===p))})}
export function choose(g,depth,random=Math.random){const p=g.turn;function score(s,r,anc){const w=winner(s);if(w)return w===p?1000+r:-1000-r;const key=s.board.map(x=>x?.[0]??'-').join('')+s.turn;if(anc.has(key))return 0;if(!r){let v=s.board[4]===p?3:s.board[4]===other(p)?-3:0;for(const l of lines){const own=l.filter(i=>s.board[i]===p).length,opp=l.filter(i=>s.board[i]===other(p)).length;if(!opp)v+=own*own*4;if(!own)v-=opp*opp*4}return v}const values=legal(s).map(a=>score(apply(s,a),r-1,new Set([...anc,key])));return values.length?(s.turn===p?Math.max(...values):Math.min(...values)):0}const ranked=legal(g).map(a=>({a,v:score(apply(g,a),Math.max(1,Math.min(5,depth))-1,new Set())}));const best=Math.max(...ranked.map(x=>x.v));const options=ranked.filter(x=>x.v===best);return options.length?options[Math.floor(random()*options.length)].a:null}
export function event(before,after,actor){if(winner(after))return winner(after)==='white'?'win':'loss';if(actor!=='black')return 'context';if(winningActions(before,'white').length&&!winningActions(after,'white').length)return 'block';if(winningActions(after,'white').length)return 'mistake';if(winningActions(after,'black').length>1)return 'strong';if(winningActions(after,'black').length)return 'threat';if(placing(before))return after.history.at(-1).to===4?'centre':[0,2,6,8].includes(after.history.at(-1).to)?'corner':'placement';return 'movement'}
