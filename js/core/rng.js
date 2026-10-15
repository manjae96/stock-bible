/* 재현 가능한 난수 — 같은 seed면 항상 같은 가상 차트가 나온다 */
(function (SB) {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rng(seed) {
    const r = mulberry32(seed);
    let spare = null;
    return {
      next: r,
      gauss() {
        if (spare != null) { const s = spare; spare = null; return s; }
        let u = 0, v = 0;
        while (u === 0) u = r();
        while (v === 0) v = r();
        const m = Math.sqrt(-2 * Math.log(u));
        spare = m * Math.sin(2 * Math.PI * v);
        return m * Math.cos(2 * Math.PI * v);
      },
      int(n) { return Math.floor(r() * n); },
    };
  }
  function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  SB.rng = rng;
  SB.hashSeed = hashSeed;
})(window.SB);
