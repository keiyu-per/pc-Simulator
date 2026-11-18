'use strict';
const {models,simulate,judge,hash,version} = FortuneEngine;
const el = id => document.getElementById(id);
const prefix = 'sim-fortune:1:';
const memory = new Map();
function read(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(prefix+key)) ?? memory.get(key) ?? fallback; }
  catch { return memory.get(key) ?? fallback; }
}
function save(key,value) {
  memory.set(key,value);
  try { localStorage.setItem(prefix+key,JSON.stringify(value)); }
  catch { el('storageStatus').textContent = '端末に保存できません。この画面を閉じるまで結果を保持します。'; }
}
const today = () => new Date(Date.now()+9*3600000).toISOString().slice(0,10);
let date = today();
let device = read('device');
if (!device) { device = crypto.getRandomValues(new Uint32Array(2)).join('-'); save('device',device); }
const format = n => n.toLocaleString('ja-JP');
function option(group,value,title,sub,checked) {
  const label = document.createElement('label');
  const radio = document.createElement('input');
  Object.assign(radio,{type:'radio',name:group,value,checked});
  const span = document.createElement('span');
  span.textContent = title;
  if (sub) { const small = document.createElement('small'); small.textContent=sub; span.append(small); }
  label.append(radio,span);
  el(group).append(label);
}
for (const [id,model] of Object.entries(models)) option('machines',id,model.name,model.label,id==='ghoul');
for (const n of [1,3,5]) option('goals',n,n+'回','',n===1);
const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
'牡羊,牡牛,双子,蟹,獅子,乙女,天秤,蠍,射手,山羊,水瓶,魚'.split(',').forEach((s,i)=>el('sign').add(new Option(s+'座',signs[i])));
el('sign').value = read('sign','');
let request;
async function stars() {
  request?.abort();
  const controller = new AbortController();
  request = controller;
  const sign = el('sign').value, day = today();
  save('sign',sign);
  el('retry').hidden = true;
  el('credit').href = 'https://sigastra.com/ja/';
  el('credit').textContent = '占い提供：Sigastra';
  if (!sign) { el('stars').textContent='星座を選ぶと今日の運勢が表示されます。'; return; }
  const key = 'star/'+sign;
  const cached = read(key);
  function show(item) {
    el('stars').textContent = item.text;
    el('credit').textContent = item.credit;
    el('credit').href = item.href;
  }
  if (cached?.day === day) { show(cached); return; }
  el('stars').textContent = '今日の星座占いを取得中…';
  const timer = setTimeout(()=>controller.abort(),7000);
  try {
    const response = await fetch('https://sigastra.com/api/v1/daily?lang=ja&sign='+sign,{signal:controller.signal,cache:'no-store'});
    if (!response.ok) throw Error();
    const data = await response.json();
    const item = data.items?.[0];
    const sourceDay = item?.date ?? data.date ?? data.periodKey;
    if (!item || typeof item.text !== 'string' || !item.text.trim() ||
        (sourceDay && String(sourceDay).slice(0,10) !== day)) throw Error();
    if (request !== controller || today() !== day) return;
    const href = new URL(data.attribution?.localizedHref || '/ja/','https://sigastra.com');
    const entry = {day,text:item.text,credit:data.attribution?.text || '占い提供：Sigastra',href:href.origin==='https://sigastra.com'?href.href:'https://sigastra.com/ja/'};
    show(entry); save(key,entry);
  } catch {
    if (request === controller) {
      el('stars').textContent='今日の配信を取得できませんでした。';
      el('retry').hidden=false;
    }
  } finally { clearTimeout(timer); }
}
el('sign').onchange = stars;
el('retry').onclick = stars;
const strokes = new Map();
for (const [count,chars] of Object.entries(strokeGroups)) for (const ch of chars) strokes.set(ch,Number(count));
const readings = ['じっくり考える力が持ち味。迷ったら候補を二つに絞ってみて。','小さな変化に気づける人。いつもと違う道に発見がありそう。','一歩を踏み出す力が持ち味。気になることをひとつ試してみて。','人との縁を育てるタイプ。短いひとことが会話のきっかけに。','整える力が持ち味。身近なものをひとつ片付けると気分も軽く。'];
function nameReading() {
  const raw = el('name').value;
  save('name',raw);
  const chars = [...raw.normalize('NFC').replace(/\s/gu,'')];
  const missing = [...new Set(chars.filter(ch=>!strokes.has(ch)))];
  if (!chars.length) { el('reading').textContent='漢字の名前を入力すると総画を鑑定します。'; return; }
  if (missing.length) { el('reading').textContent='画数未対応：'+missing.join('・'); return; }
  const count = chars.reduce((sum,ch)=>sum+strokes.get(ch),0);
  el('reading').textContent = count+'画（'+chars.map(ch=>ch+strokes.get(ch)).join('・')+'）｜'+readings[(count-1)%readings.length];
}
el('name').value = read('name','');
el('name').oninput = nameReading;
const keys = () => {
  const all = new Set(memory.keys());
  try { for (let i=0;i<localStorage.length;i++) { const k=localStorage.key(i); if(k?.startsWith(prefix)) all.add(k.slice(prefix.length)); } } catch {}
  return [...all].filter(k=>k.startsWith('run/')).sort().reverse();
};
function showResult(run) {
  const model = models[run.id];
  el('conditions').textContent=run.day+'　'+model.name+'・初当たり'+run.goal+'回';
  el('rank').textContent=run.judgement.rank;
  el('spins').textContent=format(run.normal)+' 回';
  el('balls').textContent=format(run.balls)+' 発';
  el('verdict').textContent='同条件4,096件との比較で、初当たりの早さは100点中'+run.judgement.speed+'点、出玉は'+run.judgement.payout+'点。右打ちは計'+format(run.right)+'回転。';
  el('events').replaceChildren();
  for (const e of run.events) {
    const li=document.createElement('li'), info=document.createElement('small');
    li.textContent=e.kind+'　払出 '+format(e.balls)+'発';
    info.textContent=e.mode+' '+e.spins+'回転 → '+e.next+'｜通常累計'+format(e.normal)+'回転・目標 '+e.progress+'/'+run.goal;
    li.append(info); el('events').append(li);
  }
  el('breakdown').open=false;
  el('result').hidden=false;
  el('result').focus();
}
function historyList() {
  const node = el('history'); node.replaceChildren();
  for (const key of keys()) {
    const run=read(key);
    if (!run || !models[run.id] || !run.judgement) continue;
    const button=document.createElement('button');
    button.className='historyItem';
    button.textContent=run.day+'　'+models[run.id].name+'・'+run.goal+'回　'+run.judgement.rank;
    button.onclick=()=>showResult(run);
    node.append(button);
  }
  if (!node.childElementCount) node.textContent='まだ占い履歴はありません。';
}
function refreshDay() {
  if (date !== today()) { date=today(); el('result').hidden=true; stars(); }
  el('date').textContent=date.replaceAll('-',' / ')+'　日本時間';
}
el('draw').onclick=()=>{
  refreshDay();
  const id=document.querySelector('[name=machines]:checked').value;
  const goal=Number(document.querySelector('[name=goals]:checked').value);
  const key=['run',date,id,goal,version].join('/');
  let run=read(key);
  if (!run) {
    run=simulate(id,goal,hash(device+'/'+key));
    run.day=date; run.judgement=judge(run); save(key,run);
  }
  showResult(run); historyList();
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden) refreshDay();});
window.addEventListener('storage',historyList);
setInterval(refreshDay,1000);
refreshDay(); nameReading(); historyList(); stars();
