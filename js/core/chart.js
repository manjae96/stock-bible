/* 캔들 차트 (SVG)
   - 상승 봉은 속이 빈 사각형, 하락 봉은 채운 사각형으로 그려 색을 구분하기 어려워도 읽을 수 있다.
   - 확대·축소(버튼, 두 손가락), 끌어서 이동, 키보드(←→ 이동, +/- 확대) 지원.
   - hideFrom을 주면 그 봉부터는 가려서 미래 구간을 숨긴다. 가격 축도 공개된 봉만으로 계산해 미래가 새지 않게 한다.
   - 실제 데이터(meta.synthetic=false)는 종목·시장·통화·봉 주기·기간·출처·기준 시점이 없으면 그리지 않는다. */
(function (SB) {
  const { esc, fmt } = SB.u;
  const PAD_L = 6, PAD_R = 64, P_TOP = 14;
  const REQUIRED_REAL_META = ['symbol', 'market', 'currency', 'tf', 'period', 'source', 'asOf'];

  function niceStep(range, count) {
    const raw = range / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return step * mag;
  }
  function sma(bars, p) {
    const out = []; let sum = 0;
    for (let i = 0; i < bars.length; i++) {
      sum += bars[i].c;
      if (i >= p) sum -= bars[i - p].c;
      out.push(i >= p - 1 ? sum / p : null);
    }
    return out;
  }
  function colorsFor(market) {
    if (market === 'US') return { up: 'var(--us-up)', down: 'var(--us-down)', conv: '미국식 색 관례: 상승 초록, 하락 빨강' };
    return { up: 'var(--kr-up)', down: 'var(--kr-down)', conv: '한국식 색 관례: 상승 빨강, 하락 파랑' };
  }

  function mount(el, opts) {
    const bars = opts.bars || [];
    const meta = opts.meta || {};
    if (!meta.synthetic) {
      const missing = REQUIRED_REAL_META.filter((k) => !meta[k]);
      if (missing.length) {
        el.innerHTML = '<div class="notice bad">실제 데이터 차트에 필요한 표시 정보가 없어 그리지 않았습니다: ' + esc(missing.join(', ')) + '</div>';
        return { reveal() {}, destroy() {} };
      }
    }
    const decimals = meta.decimals != null ? meta.decimals : 2;
    const colorMarket = meta.market === 'ALL' ? (SB.store.prefs.market === 'US' ? 'US' : 'KR') : meta.market;
    const col = colorsFor(colorMarket);
    const tfInfo = SB.u.TIMEFRAMES[meta.tf] || { name: meta.tf, short: '' };
    const state = {
      hideFrom: opts.hideFrom != null ? opts.hideFrom : null,
      annot: opts.annot != null ? opts.annot : SB.store.prefs.annot,
      s: 0, e: bars.length,
      sel: null,
    };
    const uid = 'c' + Math.random().toString(36).slice(2, 8);
    /* 화면 폭에 맞춰 그림 좌표계를 정해 글자가 휴대폰에서도 실제 크기로 보이게 한다 */
    let VW = 720, VH = 330, P_BOT = 228, V_TOP = 242, V_BOT = 292, AX_Y = 314;
    function layout() {
      const w = box && box.clientWidth;
      if (w) { VW = Math.max(300, Math.round(w)); VH = VW < 520 ? 290 : 330; }
      P_BOT = VH - 102; V_TOP = VH - 88; V_BOT = VH - 38; AX_Y = VH - 16;
    }

    const marketName = meta.synthetic ? ({ KR: '한국 (가상)', US: '미국 (가상)', ALL: '시장 구분 없음 (가상)' }[meta.market] || '가상') : meta.market;
    el.innerHTML = `
      <div class="chart">
        <div class="chart-head">
          <div class="row">
            ${meta.synthetic ? '<span class="chip synthetic">설명용 가상 데이터</span>' : '<span class="chip real">실제 데이터</span>'}
            ${opts.title ? `<strong class="small">${esc(opts.title)}</strong>` : ''}
          </div>
          <div class="chart-tools" role="group" aria-label="차트 조작">
            <button type="button" data-act="zin" aria-label="확대">＋</button>
            <button type="button" data-act="zout" aria-label="축소">－</button>
            <button type="button" data-act="left" aria-label="왼쪽으로 이동">◀</button>
            <button type="button" data-act="right" aria-label="오른쪽으로 이동">▶</button>
            <button type="button" data-act="all">전체</button>
            <button type="button" data-act="annot" aria-pressed="${state.annot}">설명</button>
          </div>
        </div>
        <div class="chart-box" tabindex="0" aria-describedby="${uid}-info"></div>
        <div class="chart-info" id="${uid}-info" aria-live="polite">봉을 누르면 시가·고가·저가·종가가 표시됩니다.</div>
        <div class="chart-legend">
          <span class="lg"><i class="up" style="border-color:${col.up}"></i>속 빈 봉 ▲ 상승 (종가 ≥ 시가)</span>
          <span class="lg"><i style="border-color:${col.down};background:${col.down}"></i>채운 봉 ▼ 하락 (종가 &lt; 시가)</span>
          <span>아래 막대: 거래량</span>
          <span>${esc(col.conv)}</span>
        </div>
        <div class="chart-meta">
          ${meta.synthetic
            ? `<span>시장: ${esc(marketName)}</span><span>통화: ${esc(meta.currency)}</span><span>봉 주기: ${esc(tfInfo.name)} (가상)</span><span>기간: 날짜 없음, 봉 순서만 표시</span><span>출처: ${esc(meta.source)}</span><span>기준 시점: ${esc(meta.asOf)}</span>`
            : `<span>종목: ${esc(meta.symbol)}</span><span>시장: ${esc(meta.market)}</span><span>통화: ${esc(meta.currency)}</span><span>봉 주기: ${esc(tfInfo.name)}</span><span>기간: ${esc(meta.period)}</span><span>출처: ${esc(meta.source)}</span><span>기준 시점: ${esc(meta.asOf)}</span>${meta.adjust ? `<span>가격 조정: ${esc(meta.adjust)}</span>` : ''}`}
        </div>
      </div>`;
    const box = el.querySelector('.chart-box');
    const info = el.querySelector('.chart-info');

    function visibleBars() {
      const out = [];
      for (let i = state.s; i < state.e; i++) {
        if (state.hideFrom != null && i >= state.hideFrom) break;
        out.push(bars[i]);
      }
      return out;
    }
    function annVisible(a) { return a.phase !== 'reveal' || state.hideFrom == null; }

    function draw() {
      layout();
      const n = state.e - state.s;
      const plotW = VW - PAD_L - PAD_R;
      const slot = plotW / n;
      const bw = Math.max(1.2, Math.min(14, slot * 0.62));
      const vis = visibleBars();
      if (!vis.length) { box.innerHTML = ''; return; }
      let lo = Infinity, hi = -Infinity, vmax = 0;
      vis.forEach((b) => { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); vmax = Math.max(vmax, b.v || 0); });
      const anns = state.annot ? (opts.annotations || []).filter(annVisible) : [];
      anns.forEach((a) => {
        if (a.t === 'h' && a.price != null) { lo = Math.min(lo, a.price); hi = Math.max(hi, a.price); }
      });
      const padY = (hi - lo) * 0.08 || hi * 0.02;
      lo -= padY; hi += padY;
      const y = (p) => P_TOP + (hi - p) / (hi - lo) * (P_BOT - P_TOP);
      const x = (i) => PAD_L + (i - state.s + 0.5) * slot;
      const vy = (v) => V_BOT - (v / (vmax || 1)) * (V_BOT - V_TOP);

      const parts = [];
      // 가격 눈금
      const step = niceStep(hi - lo, 4);
      for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) {
        const yy = y(t).toFixed(1);
        parts.push(`<line x1="${PAD_L}" x2="${VW - PAD_R}" y1="${yy}" y2="${yy}" style="stroke:var(--line);stroke-width:1"/>`);
        parts.push(`<text x="${VW - PAD_R + 6}" y="${(+yy + 4).toFixed(1)}" style="fill:var(--muted);font-size:11px;font-family:var(--font-mono)">${fmt.n(t, decimals)}</text>`);
      }
      parts.push(`<line x1="${PAD_L}" x2="${VW - PAD_R}" y1="${V_BOT}" y2="${V_BOT}" style="stroke:var(--line)"/>`);
      // 가로축 (봉 순서)
      const every = Math.max(1, Math.ceil(n / 8 / 5) * 5);
      for (let i = state.s; i < state.e; i++) {
        if ((i + 1) % every === 0 || i === state.s) {
          parts.push(`<text x="${x(i).toFixed(1)}" y="${AX_Y}" text-anchor="middle" style="fill:var(--muted);font-size:10.5px;font-family:var(--font-mono)">${i + 1}</text>`);
        }
      }
      parts.push(`<text x="${VW - PAD_R + 6}" y="${AX_Y}" style="fill:var(--muted);font-size:10.5px">봉 순서</text>`);
      // 구간 표시(zone)
      anns.filter((a) => a.t === 'zone').forEach((a) => {
        const i1 = Math.max(a.i1, state.s), i2 = Math.min(a.i2, state.e - 1);
        if (i2 < i1) return;
        parts.push(`<rect x="${(x(i1) - slot / 2).toFixed(1)}" y="${P_TOP}" width="${((i2 - i1 + 1) * slot).toFixed(1)}" height="${P_BOT - P_TOP}" style="fill:var(--accent-soft);opacity:.55"/>`);
        if (a.label) parts.push(`<text x="${(x(i1) - slot / 2 + 4).toFixed(1)}" y="${P_TOP + 12}" style="fill:var(--accent);font-size:11px;font-weight:600">${esc(a.label)}</text>`);
      });
      // 거래량
      vis.forEach((b) => {
        const up = b.c >= b.o;
        const top = vy(b.v || 0);
        parts.push(`<rect x="${(x(b.i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${(V_BOT - top).toFixed(1)}" style="fill:${up ? 'none' : 'var(--neutral-candle)'};stroke:var(--neutral-candle);stroke-width:1;opacity:.55"/>`);
      });
      // 캔들
      vis.forEach((b) => {
        const up = b.c >= b.o;
        const c = up ? col.up : col.down;
        const xx = x(b.i);
        const yt = y(Math.max(b.o, b.c)), yb = y(Math.min(b.o, b.c));
        const sel = state.sel === b.i;
        parts.push(`<line x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}" y1="${y(b.h).toFixed(1)}" y2="${y(b.l).toFixed(1)}" style="stroke:${c};stroke-width:1.2"/>`);
        parts.push(`<rect x="${(xx - bw / 2).toFixed(1)}" y="${yt.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, yb - yt).toFixed(1)}" style="fill:${up ? 'var(--surface)' : c};stroke:${c};stroke-width:${sel ? 2.4 : 1.2}"/>`);
      });
      // 이동평균선
      (opts.ma || []).forEach((p, k) => {
        const m = sma(bars, p);
        let d = '';
        for (let i = state.s; i < state.e; i++) {
          if (state.hideFrom != null && i >= state.hideFrom) break;
          if (m[i] == null) continue;
          d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(m[i]).toFixed(1);
        }
        if (d) {
          parts.push(`<path d="${d}" style="fill:none;stroke:var(--ink);stroke-width:1.4;opacity:.7;stroke-dasharray:${k === 0 ? 'none' : '5 3'}"/>`);
          parts.push(`<text x="${PAD_L + 4}" y="${P_BOT - 6 - k * 14}" style="fill:var(--ink);font-size:10.5px;opacity:.75">${p}봉 이동평균${k ? ' (점선)' : ' (실선)'}</text>`);
        }
      });
      // 주석 선
      const dash = { sup: '6 4', res: '6 4', neck: 'none', target: '2 4', stop: '2 4', trend: 'none' };
      const stroke = (k) => k === 'target' ? 'var(--ok)' : k === 'stop' ? 'var(--bad)' : 'var(--accent)';
      anns.forEach((a) => {
        if (a.t === 'h') {
          const i1 = a.from != null ? Math.max(a.from, state.s) : state.s;
          const i2 = a.to != null ? Math.min(a.to, state.e - 1) : state.e - 1;
          if (i2 < i1) return;
          const yy = y(a.price).toFixed(1);
          parts.push(`<line x1="${(x(i1) - slot / 2).toFixed(1)}" x2="${(x(i2) + slot / 2).toFixed(1)}" y1="${yy}" y2="${yy}" style="stroke:${stroke(a.kind)};stroke-width:${a.kind === 'neck' ? 2 : 1.6};stroke-dasharray:${dash[a.kind] || 'none'}"/>`);
          if (a.label) parts.push(`<text x="${(x(i1) - slot / 2 + 3).toFixed(1)}" y="${(+yy - 5).toFixed(1)}" style="fill:${stroke(a.kind)};font-size:11px;font-weight:600;paint-order:stroke;stroke:var(--surface);stroke-width:3px">${esc(a.label)}</text>`);
        } else if (a.t === 'seg') {
          parts.push(`<line x1="${x(a.a[0]).toFixed(1)}" y1="${y(a.a[1]).toFixed(1)}" x2="${x(a.b[0]).toFixed(1)}" y2="${y(a.b[1]).toFixed(1)}" style="stroke:${stroke(a.kind)};stroke-width:1.6;stroke-dasharray:${dash[a.kind] || 'none'}"/>`);
          if (a.label) parts.push(`<text x="${(x(a.b[0]) + 4).toFixed(1)}" y="${(y(a.b[1]) - 4).toFixed(1)}" style="fill:${stroke(a.kind)};font-size:11px;font-weight:600;paint-order:stroke;stroke:var(--surface);stroke-width:3px">${esc(a.label)}</text>`);
        } else if (a.t === 'mark') {
          if (a.i < state.s || a.i >= state.e) return;
          if (state.hideFrom != null && a.i >= state.hideFrom) return;
          const b = bars[a.i];
          const above = a.pos !== 'below';
          const yy = above ? y(b.h) - 10 : y(b.l) + 18;
          parts.push(`<text x="${x(a.i).toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="middle" style="fill:var(--accent);font-size:11.5px;font-weight:700;paint-order:stroke;stroke:var(--surface);stroke-width:3px">${above ? '▾ ' : '▴ '}${esc(a.label)}</text>`);
        }
      });
      // 가려진 미래 구간
      if (state.hideFrom != null && state.hideFrom < state.e) {
        const i1 = Math.max(state.hideFrom, state.s);
        const x1 = x(i1) - slot / 2;
        const w = VW - PAD_R - x1;
        parts.push(`<defs><pattern id="${uid}-h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" style="fill:var(--surface-2)"/><line x1="0" y1="0" x2="0" y2="8" style="stroke:var(--line);stroke-width:3"/></pattern></defs>`);
        parts.push(`<rect x="${x1.toFixed(1)}" y="${P_TOP}" width="${w.toFixed(1)}" height="${V_BOT - P_TOP}" style="fill:url(#${uid}-h)"/>`);
        const hiddenN = bars.length - state.hideFrom;
        parts.push(`<text x="${(x1 + w / 2).toFixed(1)}" y="${((P_TOP + P_BOT) / 2).toFixed(1)}" text-anchor="middle" style="fill:var(--ink);font-size:12px;font-weight:600;paint-order:stroke;stroke:var(--surface-2);stroke-width:4px">가려진 미래 ${hiddenN}봉</text>`);
      }
      const last = vis[vis.length - 1];
      const label = `${meta.synthetic ? '설명용 가상 데이터' : esc(meta.symbol)} 캔들 차트. ${vis.length}개 봉 표시${state.hideFrom != null ? ', 이후 구간은 가려짐' : ''}. 표시 구간 최고 ${fmt.n(Math.max(...vis.map((b) => b.h)), decimals)}, 최저 ${fmt.n(Math.min(...vis.map((b) => b.l)), decimals)}, 마지막 종가 ${fmt.n(last.c, decimals)}.`;
      box.innerHTML = `<svg viewBox="0 0 ${VW} ${VH}" role="img" aria-label="${label}">${parts.join('')}</svg>`;
    }

    function clampView() {
      const n = state.e - state.s;
      if (state.s < 0) { state.s = 0; state.e = n; }
      if (state.e > bars.length) { state.e = bars.length; state.s = Math.max(0, bars.length - n); }
    }
    function zoom(f, centerIdx) {
      const n = state.e - state.s;
      const nn = Math.max(12, Math.min(bars.length, Math.round(n * f)));
      const c = centerIdx != null ? centerIdx : (state.s + state.e) / 2;
      state.s = Math.round(c - nn / 2); state.e = state.s + nn; clampView(); draw();
    }
    function pan(d) { state.s += d; state.e += d; clampView(); draw(); }

    function showInfo(i) {
      if (state.hideFrom != null && i >= state.hideFrom) { info.textContent = '이 구간은 아직 가려져 있습니다.'; return; }
      const b = bars[i]; if (!b) return;
      state.sel = i;
      const up = b.c >= b.o;
      const prev = bars[i - 1];
      const chg = prev ? (b.c / prev.c - 1) : null;
      info.textContent = `${i + 1}번째 ${tfInfo.short || ''}봉 ${up ? '▲' : '▼'} 시가 ${fmt.n(b.o, decimals)} · 고가 ${fmt.n(b.h, decimals)} · 저가 ${fmt.n(b.l, decimals)} · 종가 ${fmt.n(b.c, decimals)}${chg != null ? ' (전 봉 대비 ' + fmt.spct(chg, 2) + ')' : ''} · 거래량 ${fmt.n(b.v)}`;
      draw();
    }

    // 조작
    el.querySelector('.chart-tools').addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      const n = state.e - state.s;
      const act = b.dataset.act;
      if (act === 'zin') zoom(0.7);
      else if (act === 'zout') zoom(1.45);
      else if (act === 'left') pan(-Math.max(1, Math.round(n / 4)));
      else if (act === 'right') pan(Math.max(1, Math.round(n / 4)));
      else if (act === 'all') { state.s = 0; state.e = bars.length; draw(); }
      else if (act === 'annot') { state.annot = !state.annot; b.setAttribute('aria-pressed', state.annot); SB.store.setPref('annot', state.annot); draw(); }
    });
    box.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { pan(-2); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight') { pan(2); ev.preventDefault(); }
      else if (ev.key === '+' || ev.key === '=') { zoom(0.75); ev.preventDefault(); }
      else if (ev.key === '-') { zoom(1.35); ev.preventDefault(); }
    });
    const pointers = new Map();
    let dragStart = null, pinchStart = null, moved = false;
    function idxFromClient(clientX) {
      const rect = box.getBoundingClientRect();
      const vx = (clientX - rect.left) / rect.width * VW;
      const slot = (VW - PAD_L - PAD_R) / (state.e - state.s);
      return Math.floor((vx - PAD_L) / slot) + state.s;
    }
    box.addEventListener('pointerdown', (ev) => {
      pointers.set(ev.pointerId, ev.clientX);
      moved = false;
      if (pointers.size === 1) dragStart = { x: ev.clientX, s: state.s, e: state.e };
      if (pointers.size === 2) {
        const xs = Array.from(pointers.values());
        pinchStart = { d: Math.abs(xs[0] - xs[1]) || 1, n: state.e - state.s, c: idxFromClient((xs[0] + xs[1]) / 2) };
      }
    });
    box.addEventListener('pointermove', (ev) => {
      if (!pointers.has(ev.pointerId)) return;
      pointers.set(ev.pointerId, ev.clientX);
      if (pointers.size === 2 && pinchStart) {
        const xs = Array.from(pointers.values());
        const d = Math.abs(xs[0] - xs[1]) || 1;
        const nn = Math.max(12, Math.min(bars.length, Math.round(pinchStart.n * pinchStart.d / d)));
        state.s = Math.round(pinchStart.c - nn / 2); state.e = state.s + nn; clampView(); draw(); moved = true;
        return;
      }
      if (dragStart && ev.pointerType !== 'mouse' || (dragStart && ev.buttons === 1)) {
        const rect = box.getBoundingClientRect();
        const dx = ev.clientX - dragStart.x;
        if (Math.abs(dx) > 6) {
          moved = true; box.classList.add('grabbing');
          const slotPx = rect.width * (VW - PAD_L - PAD_R) / VW / (dragStart.e - dragStart.s);
          const shift = Math.round(-dx / slotPx);
          state.s = dragStart.s + shift; state.e = dragStart.e + shift; clampView(); draw();
        }
      }
    });
    function endPointer(ev) {
      const wasMoved = moved;
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0) {
        box.classList.remove('grabbing');
        if (!wasMoved && dragStart && ev.type === 'pointerup') showInfo(idxFromClient(ev.clientX));
        dragStart = null;
      }
    }
    box.addEventListener('pointerup', endPointer);
    box.addEventListener('pointercancel', endPointer);
    box.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') endPointer(ev); });

    draw();
    if (window.ResizeObserver) {
      let lastW = box.clientWidth;
      new ResizeObserver(() => { if (Math.abs(box.clientWidth - lastW) > 2) { lastW = box.clientWidth; draw(); } }).observe(box);
    }
    return {
      reveal() { state.hideFrom = null; state.s = 0; state.e = bars.length; draw(); info.textContent = '가려졌던 구간을 공개했습니다.'; },
      setHide(i) { state.hideFrom = i; draw(); },
      redraw: draw,
    };
  }

  SB.chart = { mount, sma, REQUIRED_REAL_META };
})(window.SB);
