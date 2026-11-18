/* Machine rules, checked 2026-11-18. Sources are listed in README.md.
   The normal tables use one roll per physical hit, including charge events. */
const FortuneEngine = (() => {
  const version = 1;
  const models = {
    ghoul: {name:'東京喰種', normal:399.9 / 2, label:'図柄 約1/399.9', right:95.3, limit:130},
    oni: {name:'鬼がかり2', normal:349.9, label:'1/349.9', right:99.9, limit:144},
    re: {name:'リゼロ2 ライト', normal:249.9, label:'1/249.9', right:99.9, limit:163},
    madoka: {name:'甘まど', normal:99.9, label:'約1/99.9', right:62.1, limit:60}
  };
  function hash(text) {
    let value = 2166136261;
    for (const ch of text) value = Math.imul(value ^ ch.codePointAt(0), 16777619);
    return value >>> 0;
  }
  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ state >>> 15, state | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function wait(random, denominator) {
    return 1 + Math.floor(Math.log1p(-random()) / Math.log1p(-1 / denominator));
  }
  const normal = '通常', rush = 'RUSH', upper = '上位RUSH';
  function initial(id, roll) {
    if (id === 'ghoul') {
      if (roll < .5) return [300, normal, 'チャージ', false];
      if (roll < .505) return [300, rush, 'チャージ昇格', true];
      return [1500, roll < .755 ? rush : normal, '図柄揃い', true];
    }
    if (id === 'oni') return [roll < .1 ? 3000 : 1500, roll < .55 ? rush : normal, '初当たり', true];
    if (id === 're') return [600, roll < .6 ? rush : normal, '初当たり', true];
    if (roll < .005) return [1000, upper, '上位直行', true];
    return [200, roll < .55 ? rush : normal, '初当たり', true];
  }
  function rightHit(id, roll, state, residual) {
    if (id === 'ghoul') return [roll < .03 ? 6000 : 3000, rush];
    if (id === 'oni') {
      if (roll < .25) return [6000, rush];
      if (roll < .80) return [1500, rush];
      return [roll < .86 ? 300 : 0, rush];
    }
    if (id === 're') return [roll < .25 ? 2400 : roll < .8 ? 1200 : 240, rush];
    const stayUpper = state === upper && !residual;
    return [roll < .5 ? 1000 : 400, stayUpper || roll < .25 ? upper : rush];
  }
  function simulate(id, goal, seed, detail = true) {
    if (!Object.hasOwn(models,id) || ![1,3,5].includes(goal)) throw new Error('対象外の抽選条件');
    const model = models[id], rng = random(seed);
    const result = {id,goal,seed,version,normal:0,right:0,balls:0,events:[]};
    function record(mode, spins, kind, balls, next, progress) {
      result.balls += balls;
      if (detail) result.events.push({mode,spins,kind,balls,next,progress,normal:result.normal});
    }
    let hits = 0;
    while (hits < goal) {
      const spins = wait(rng,model.normal);
      result.normal += spins;
      const [balls, next, kind, counts] = initial(id,rng());
      if (counts) hits++;
      record(normal,spins,kind,balls,next,hits);
      let state = next;
      while (state !== normal) {
        const st = state === upper ? 135 : model.limit;
        const limit = st + (id === 'madoka' ? 4 : 0);
        const interval = wait(rng,model.right);
        result.right += Math.min(interval,limit);
        if (interval > limit) break;
        const residual = interval > st;
        const [payout,destination] = rightHit(id,rng(),state,residual);
        record(state,interval,residual ? '残保留引き戻し' : payout ? '右打ち当たり' : 'Re:Start',payout,destination,hits);
        if (id === 're' && payout === 2400) {
          while (rng() < .25) record(state,0,'強欲フリーズ',1200,destination,hits);
        }
        state = destination;
      }
    }
    return result;
  }
  function judge(result) {
    const rng = random(hash([version,result.id,result.goal,'reference'].join('/')));
    const trials = 4096;
    let speed = 0, payout = 0;
    for (let i = 0; i < trials; i++) {
      const sample = simulate(result.id,result.goal,Math.floor(rng()*2**32),false);
      speed += sample.normal > result.normal ? 1 : Number(sample.normal === result.normal)/2;
      payout += sample.balls < result.balls ? 1 : Number(sample.balls === result.balls)/2;
    }
    const score = (speed+payout)*50/trials;
    return {score,speed:Math.round(speed*100/trials),payout:Math.round(payout*100/trials),
      rank:['末吉','小吉','中吉','吉','大吉'][Math.min(4,Math.floor(score/20))],version:1};
  }
  return {models,version,hash,simulate,judge};
})();
if (typeof module !== 'undefined') module.exports = FortuneEngine;
