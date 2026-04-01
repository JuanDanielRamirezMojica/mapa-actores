let actorCount = 0;
let relCount = 0;

const TYPE_COLORS = {
  central: '#e8c547',
  secundario: '#2e7db5',
  ilegal: '#c43a4a',
  observador: '#2a8c5c'
};

const REL_COLORS = {
  alianza:      '#2a8c5c',
  cooperacion:  '#7c6af7',
  coordinacion: '#2e7db5',
  dependencia:  '#ffaa33',
  competencia:  '#ff9de2',
  tension:      '#c43a4a',
  neutral:      '#8b8aaa'
};

const REL_OPTIONS = [
  { value: 'alianza',      label: 'Alianza' },
  { value: 'cooperacion',  label: 'Cooperación' },
  { value: 'coordinacion', label: 'Coordinación' },
  { value: 'dependencia',  label: 'Dependencia' },
  { value: 'competencia',  label: 'Competencia' },
  { value: 'tension',      label: 'Tensión' },
  { value: 'neutral',      label: 'Neutral' },
];

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t,i) =>
    t.classList.toggle('active', (i===0&&tab==='form')||(i===1&&tab==='map'))
  );
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
}

function getActors() {
  return Array.from(document.querySelectorAll('.actor-card')).map(card => ({
    id: card.dataset.id,
    name: card.querySelector('input').value.trim(),
    type: card.querySelector('.actor-type-select').value,
    estatal: card.querySelector('.actor-estatal-select')?.value || 'estatal',
    incidencia: card.querySelector('.actor-incidencia-select')?.value || 'media'
  })).filter(a => a.name);
}

function addActor() {
  actorCount++;
  const id = 'a' + actorCount;
  const container = document.getElementById('actors-container');
  const card = document.createElement('div');
  card.className = 'actor-card';
  card.dataset.id = id;
  card.innerHTML = `
    <div class="actor-card-top">
      <div class="actor-dot" style="background:#e8c547" id="dot-${id}"></div>
      <input type="text" placeholder="Nombre del actor..." oninput="updateAllRelSelects()">
      <button class="btn-icon" onclick="removeActor('${id}')">✕</button>
    </div>
    <div class="actor-card-bottom" style="gap:0.5rem;">
      <select class="actor-type-select" style="flex:2;" onchange="updateDot('${id}', this.value, this.closest('.actor-card').querySelector('.actor-estatal-select').value)">
        <option value="central">Central </option>
        <option value="secundario">Secundario</option>
        <option value="ilegal">Ilegal </option>
        <option value="observador">Observador  </option>
      </select>
      <select class="actor-estatal-select" style="flex:1;" onchange="updateDot('${id}', this.closest('.actor-card').querySelector('.actor-type-select').value, this.value)">
        <option value="estatal">Estatal</option>
        <option value="noestatal">No estatal</option>
      </select>
      <select class="actor-incidencia-select" style="flex:1;">
        <option value="alta">Inc. Alta</option>
        <option value="media" selected>Inc. Media</option>
        <option value="baja">Inc. Baja</option>
      </select>
    </div>
  `;
  container.appendChild(card);
  updateAllRelSelects();
  validateForm();
}

function updateDot(id, type, estatal) {
  const colors = { central:'#e8c547', secundario:'#2e7db5', ilegal:'#c43a4a', observador:'#2a8c5c' };
  const dot = document.getElementById('dot-' + id);
  if (!dot) return;
  const color = colors[type] || '#e8c547';
  dot.style.background = color;
  dot.style.borderRadius = (estatal === 'noestatal') ? '2px' : '50%';
}

function removeActor(id) {
  const card = document.querySelector(`.actor-card[data-id="${id}"]`);
  if (card) card.remove();
  updateAllRelSelects();
  validateForm();
}

// ── Update all relation selects (mutual exclusion + intermediario) ─────────
function updateAllRelSelects() {
  const actors = getActors();

  document.querySelectorAll('.rel-card').forEach(card => {
    const sel1 = card.querySelector('.actor-select-1');
    const sel2 = card.querySelector('.actor-select-2');
    if (!sel1 || !sel2) return;

    const v1 = sel1.value;
    const v2 = sel2.value;

    // Rebuild sel1: exclude current sel2 selection
    sel1.innerHTML = actors
      .filter(a => a.id !== v2)
      .map(a => `<option value="${a.id}" ${a.id===v1?'selected':''}>${a.name||'(sin nombre)'}</option>`)
      .join('');

    // Rebuild sel2: exclude current sel1 selection
    sel2.innerHTML = actors
      .filter(a => a.id !== sel1.value)
      .map(a => `<option value="${a.id}" ${a.id===v2?'selected':''}>${a.name||'(sin nombre)'}</option>`)
      .join('');

    // Rebuild intermediario dropdown
    const intWrap = card.querySelector('.intermediario-wrap');
    if (intWrap) rebuildIntermediario(intWrap, actors, sel1.value, sel2.value);

    // Rebuild dominante select — only from/to actors
    const dominanteSel = card.querySelector('.dominante-select');
    if (dominanteSel) {
      const curDom = dominanteSel.value;
      const fromActor = actors.find(a => a.id === sel1.value);
      const toActor   = actors.find(a => a.id === sel2.value);
      const domOpts = [fromActor, toActor].filter(Boolean);
      dominanteSel.innerHTML = domOpts
        .map(a => `<option value="${a.id}" ${a.id===curDom?'selected':''}>${a.name||'(sin nombre)'}</option>`)
        .join('');
    }
  });
  validateForm();
}

function rebuildIntermediario(wrap, actors, excludeId1, excludeId2) {
  const dropdown = wrap.querySelector('.intermediario-dropdown');
  const checkedIds = Array.from(dropdown.querySelectorAll('input:checked')).map(c => c.value);
  const available = actors.filter(a => a.id !== excludeId1 && a.id !== excludeId2);

  if (available.length === 0) {
    dropdown.innerHTML = `<div class="int-empty">No hay otros actores disponibles</div>`;
  } else {
    dropdown.innerHTML = available.map(a => `
      <label class="int-option">
        <input type="checkbox" value="${a.id}" ${checkedIds.includes(a.id)?'checked':''}
          onchange="refreshIntBtn(this)">
        ${a.name || '(sin nombre)'}
      </label>
    `).join('');
  }
  refreshIntBtn(null, wrap);
}

function refreshIntBtn(el, wrapEl) {
  const wrap = wrapEl || el.closest('.intermediario-wrap');
  const btn = wrap.querySelector('.int-btn-text');
  const checked = Array.from(wrap.querySelectorAll('input:checked'));
  btn.textContent = checked.length === 0
    ? 'Ninguno'
    : checked.map(c => c.closest('label').textContent.trim()).join(', ');
}

function toggleDropdown(btn) {
  const wrap = btn.closest('.intermediario-wrap');
  const dropdown = wrap.querySelector('.intermediario-dropdown');
  const isOpen = dropdown.classList.contains('open');
  // Close all others first
  document.querySelectorAll('.intermediario-dropdown.open').forEach(d => d.classList.remove('open'));
  if (!isOpen) {
    dropdown.classList.add('open');
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!wrap.contains(e.target)) {
          dropdown.classList.remove('open');
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }
}

function toggleDominante(flujoSel) {
  const card = flujoSel.closest('.rel-card');
  const wrap = card.querySelector('.dominante-wrap');
  if (wrap) wrap.style.display = flujoSel.value === 'asimetrica' ? 'flex' : 'none';
}

// ── Sync mutual exclusion when user changes a select ──────────────────────
function syncRelSelects(changedSel) {
  const card = changedSel.closest('.rel-card');
  const sel1 = card.querySelector('.actor-select-1');
  const sel2 = card.querySelector('.actor-select-2');
  const actors = getActors();

  // If both ended up the same, flip the other one
  if (sel1.value === sel2.value) {
    const other = actors.find(a => a.id !== changedSel.value);
    if (other) {
      (changedSel === sel1 ? sel2 : sel1).value = other.id;
    }
  }
  updateAllRelSelects();
}

function addRelation() {
  relCount++;
  const actors = getActors();
  if (actors.length < 2) { alert('Agrega al menos 2 actores primero.'); return; }

  const container = document.getElementById('relations-container');
  const card = document.createElement('div');
  card.className = 'rel-card';

  const relOpts = REL_OPTIONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('');
  const aOpts = actors.map(a => `<option value="${a.id}">${a.name||'(sin nombre)'}</option>`).join('');

  // Initial intermediario options (all except first two actors)
  const intOpts = actors.length > 2
    ? actors.slice(2).map(a => `
        <label class="int-option">
          <input type="checkbox" value="${a.id}" onchange="refreshIntBtn(this)">
          ${a.name||'(sin nombre)'}
        </label>`).join('')
    : `<div class="int-empty">No hay otros actores disponibles</div>`;

  card.innerHTML = `
    <div class="rel-row">
      <span class="rel-label">Actor 1</span>
      <select class="rel-select actor-select-1" onchange="syncRelSelects(this)">${aOpts}</select>
      <select class="rel-select-sm dir-select">
        <option value="bilateral">↔</option>
        <option value="unilateral">→</option>
      </select>
      <select class="rel-select actor-select-2" onchange="syncRelSelects(this)">
        ${actors.filter(a => a.id !== actors[0].id).map(a => `<option value="${a.id}">${a.name||'(sin nombre)'}</option>`).join('')}
      </select>
      <select class="rel-select rel-type-select" style="flex:0;min-width:130px;">${relOpts}</select>
      <button class="btn-icon" onclick="this.closest('.rel-card').remove()">✕</button>
    </div>
    <div class="rel-row">
      <span class="rel-label">Flujo</span>
      <select class="rel-select flujo-select" style="flex:0;min-width:140px;" onchange="toggleDominante(this)">
        <option value="simetrica">Simétrica</option>
        <option value="asimetrica">Asimétrica</option>
      </select>
      <span class="dominante-wrap" style="display:none;align-items:center;gap:0.5rem;flex:1;">
        <span class="rel-label" style="min-width:unset;">Actor dominante</span>
        <select class="rel-select dominante-select" style="flex:1;">${aOpts}</select>
      </span>
    </div>
    <div class="rel-row">
      <span class="rel-label">Intermediario</span>
      <div class="intermediario-wrap">
        <button type="button" class="intermediario-btn" onclick="toggleDropdown(this)">
          <span class="int-btn-text">Ninguno</span>
          <span style="font-size:0.7rem;opacity:0.5;flex-shrink:0;">▾</span>
        </button>
        <div class="intermediario-dropdown">${intOpts}</div>
      </div>
      <span class="rel-label" style="min-width:unset;margin-left:0.5rem;">Intensidad</span>
      <select class="rel-select intensidad-select" style="flex:0;min-width:100px;">
        <option value="alta">Alta</option>
        <option value="media" selected>Media</option>
        <option value="baja">Baja</option>
      </select>
    </div>
  `;

  container.appendChild(card);
  // Ensure actor2 starts as second actor
  card.querySelector('.actor-select-2').value = actors[1].id;
  updateAllRelSelects();
}

// ── Form validation ────────────────────────────────────────────────────────
function validateForm() {
  const titulo = document.getElementById('dimTitulo').value.trim();
  const actors = getActors();
  const btn = document.getElementById('btnGenerar');
  const hint = document.getElementById('generateHint');
  if (!btn || !hint) return;

  const issues = [];
  if (!titulo) issues.push('falta el título del diagrama');
  const allCards = document.querySelectorAll('.actor-card input');
  const hasEmptyName = Array.from(allCards).some(inp => inp.value.trim() === '');
  if (hasEmptyName) issues.push('hay actores sin nombre');
  else if (actors.length === 0) issues.push('agrega al menos un actor');
  else if (actors.length === 1) issues.push('agrega al menos 2 actores para poder relacionarlos');

  if (issues.length === 0) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    hint.style.display = 'none';
    hint.textContent = '';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    hint.textContent = '⚠ ' + issues.join(' · ');
    hint.style.display = 'block';
  }
}

function generateMap() {
  const actorData = getActors();
  if (actorData.length === 0) { alert('Agrega al menos un actor.'); return; }

  const relData = Array.from(document.querySelectorAll('.rel-card')).map(card => {
    const sel1 = card.querySelector('.actor-select-1');
    const sel2 = card.querySelector('.actor-select-2');
    const intermediarios = Array.from(card.querySelectorAll('.intermediario-dropdown input:checked')).map(c => c.value);
    const flujoSel = card.querySelector('.flujo-select');
    const dominanteSel = card.querySelector('.dominante-select');
    return {
      from: sel1 ? sel1.value : null,
      to: sel2 ? sel2.value : null,
      dir: card.querySelector('.dir-select').value,
      type: card.querySelector('.rel-type-select').value,
      flujo: flujoSel ? flujoSel.value : 'simetrica',
      dominante: dominanteSel ? dominanteSel.value : null,
      intensidad: (card.querySelector('.intensidad-select')?.value) || 'media',
      intermediarios
    };
  }).filter(r => r.from && r.to && r.from !== r.to);

  const titulo = document.getElementById('dimTitulo').value.trim() || 'Mapa de Actores';
  const subtitulo = document.getElementById('dimSubtitulo').value.trim();
  const descripcion = document.getElementById('dimDescripcion').value.trim();

  drawMap(actorData, relData, titulo, subtitulo, descripcion);
  switchTab('map');
}

// ── Global map state for hover ─────────────────────────────────────────────
let _mapState = null;

function drawMap(actorData, relData, titulo, subtitulo, descripcion) {
  const canvas = document.getElementById('mapCanvas');
  const W = 1100;

  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.font = '11px DM Sans, sans-serif';
  const descWordCount = descripcion ? Math.ceil(tempCtx.measureText(descripcion).width / (W - 56)) * 15 + 20 : 0;
  const headerH = 50 + (subtitulo ? 22 : 0) + descWordCount;
  // Legend is now OUTSIDE the actor area (below canvas), so no legendH needed in H
  const LEGEND_H = 58; // space reserved at bottom for legend inside canvas
  const H = 820 + headerH;

  canvas.width = W; canvas.height = H;
  canvas.style.display = 'block';
  document.getElementById('mapCanvasWrap').style.display = 'block';
  document.getElementById('map-empty').style.display = 'none';
  document.getElementById('map-hint').style.display = 'block';
  document.getElementById('map-display-title').textContent = titulo;
  document.getElementById('map-display-subtitle').textContent =
    subtitulo || `${actorData.length} actores · ${relData.length} relaciones`;

  // ── Safe margin so actors never spawn outside ──────────────────────────
  const MARGIN = 72; // px from each edge where actors are kept
  const topPad = headerH + MARGIN;
  const bottomPad = LEGEND_H + MARGIN;
  const cx = W / 2;
  const cy = topPad + (H - topPad - bottomPad) / 2;

  // ── Compute positions ──────────────────────────────────────────────────
  const groups = {};
  actorData.forEach(a => { if (!groups[a.type]) groups[a.type] = []; groups[a.type].push(a); });

  const typeOrder = ['central', 'observador', 'secundario', 'ilegal'];
  const ringR =    [0, 180, 295, 400];
  const positions = {};

  typeOrder.forEach((type, ti) => {
    const group = groups[type] || [];
    const r = ringR[ti];
    group.forEach((actor, i) => {
      if (r === 0 && group.length === 1) {
        positions[actor.id] = { x: cx, y: cy };
      } else {
        const effectiveR = r === 0 ? 110 : r;
        const offset = ti * 0.3;
        const angle = (2 * Math.PI * i / Math.max(group.length, 1)) - Math.PI / 2 + offset;
        positions[actor.id] = {
          x: Math.max(MARGIN, Math.min(W - MARGIN, cx + effectiveR * Math.cos(angle))),
          y: Math.max(topPad - MARGIN/2, Math.min(H - bottomPad, cy + effectiveR * Math.sin(angle)))
        };
      }
    });
  });

  if (Object.keys(groups).length === 1) {
    actorData.forEach((actor, i) => {
      const r = 270;
      const angle = (2 * Math.PI * i / actorData.length) - Math.PI / 2;
      positions[actor.id] = {
        x: Math.max(MARGIN, Math.min(W - MARGIN, cx + r * Math.cos(angle))),
        y: Math.max(topPad - MARGIN/2, Math.min(H - bottomPad, cy + r * Math.sin(angle)))
      };
    });
  }

  // ── Save state ────────────────────────────────────────────────────────
  _relControlOffsets = {};
  _mapState = { actorData, relData, positions, headerH, W, H, titulo, subtitulo, descripcion, MARGIN, LEGEND_H };
  _mapState.relGeom = buildRelGeom(relData, actorData, positions);

  // ── Render & attach listeners ──────────────────────────────────────────
  renderMap(_mapState, null, null);
  attachCanvasListeners(canvas);
}

function renderMap(state, hoveredActor, hoveredRel, draggingActor) {
  const { actorData, relGeom, positions, headerH, W, H, titulo, subtitulo, descripcion } = state;
  const canvas = document.getElementById('mapCanvas');
  const ctx = canvas.getContext('2d');

  // Background (full canvas, no transform)
  ctx.fillStyle = '#f0ede6';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(26,25,22,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Header text
  let textY = 36;
  ctx.fillStyle = '#0d0d0b';
  ctx.font = 'bold 20px Syne, sans-serif';
  ctx.fillText(titulo, 28, textY); textY += 26;
  if (subtitulo) {
    ctx.fillStyle = '#5a5750'; ctx.font = '400 13px DM Sans, sans-serif';
    ctx.fillText(subtitulo, 28, textY); textY += 22;
  }
  if (descripcion) {
    ctx.fillStyle = '#5a5750'; ctx.font = 'italic 11px DM Sans, sans-serif';
    const words = descripcion.split(' '); let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > W - 56 && line) {
        ctx.fillText(line, 28, textY); line = word; textY += 15;
      } else { line = test; }
    }
    if (line) { ctx.fillText(line, 28, textY); textY += 15; }
    textY += 8;
  }

  // ── Draw relations ─────────────────────────────────────────────────────
  relGeom.forEach(g => {
    const { rel, sx, sy, ex, ey, midX, midY, ux, uy, intNodes } = g;
    const color = REL_COLORS[rel.type] || '#8b8aaa';
    const dash  = rel.type === 'tension' ? [8,5] : rel.type === 'neutral' ? [3,5] : [];
    const isHov = hoveredRel === g;

    // Intensidad: alta → very vivid + thicker, media → normal, baja → softened but readable
    const intensidad = rel.intensidad || 'media';
    const intensAlpha = intensidad === 'alta' ? 'ff' : intensidad === 'baja' ? '77' : 'cc';
    const intensLW    = intensidad === 'alta' ? 1.35 : intensidad === 'baja' ? 0.7 : 1.0;
    const alpha = hoveredRel && !isHov ? '33' : intensAlpha;
    const baseLW = (isHov ? 3.5 : 2) * intensLW;

    const isAsym = rel.flujo === 'asimetrica' && rel.dominante;
    const qAt = (t, s, m, e) => (1-t)*(1-t)*s + 2*(1-t)*t*m + t*t*e;

    if (!isAsym || dash.length > 0) {
      // Standard uniform line (also for dashed — can't taper dashes cleanly)
      ctx.beginPath();
      ctx.setLineDash(dash);
      ctx.strokeStyle = color + alpha;
      ctx.lineWidth = baseLW;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(midX, midY, ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Tapered line: draw as many short segments with varying lineWidth
      // Determine which end is dominant
      // dominantEnd = 'from' means thick at sx/sy, thin at ex/ey
      // dominantEnd = 'to'   means thin at sx/sy, thick at ex/ey
      const dominantIsFrom = rel.dominante === rel.from;
      const lwMin = intensidad === 'baja' ? 1.0 : 1.5;
      const lwMax = isHov ? 8 : (intensidad === 'alta' ? 7.5 : intensidad === 'baja' ? 4 : 6.5);
      const segments = 40;
      for (let i = 0; i < segments; i++) {
        const t0 = i / segments;
        const t1 = (i + 1) / segments;
        const px0 = qAt(t0, sx, midX, ex), py0 = qAt(t0, sy, midY, ey);
        const px1 = qAt(t1, sx, midX, ex), py1 = qAt(t1, sy, midY, ey);
        // t=0 is 'from', t=1 is 'to'
        const tMid = (t0 + t1) / 2;
        let lw;
        if (dominantIsFrom) {
          lw = lwMax - (lwMax - lwMin) * tMid;  // thick→thin
        } else {
          lw = lwMin + (lwMax - lwMin) * tMid;  // thin→thick
        }
        ctx.beginPath();
        ctx.strokeStyle = color + alpha;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.moveTo(px0, py0);
        ctx.lineTo(px1, py1);
        ctx.stroke();
      }
    }

    // Arrows: unilateral → one arrowhead at end; bilateral ↔ → arrowhead at both ends
    function drawArrowhead(tipX, tipY, dirX, dirY, size) {
      const s = size || 13;
      // Pull the tip back slightly so the arrowhead sits just outside the node
      const pullback = 4;
      const tx = tipX - dirX * pullback;
      const ty = tipY - dirY * pullback;
      ctx.beginPath();
      ctx.fillStyle = color + alpha;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - dirX*s + dirY*(s*0.42), ty - dirY*s - dirX*(s*0.42));
      ctx.lineTo(tx - dirX*s - dirY*(s*0.42), ty - dirY*s + dirX*(s*0.42));
      ctx.closePath(); ctx.fill();
    }

    if (rel.dir === 'unilateral' || rel.dir === 'bilateral') {
      // Arrow at the "to" end
      const t1=0.88, t2=0.90;
      const bx=qAt(t1,sx,midX,ex), by=qAt(t1,sy,midY,ey);
      const cx2=qAt(t2,sx,midX,ex), cy2=qAt(t2,sy,midY,ey);
      const adx=cx2-bx, ady=cy2-by, al=Math.sqrt(adx*adx+ady*ady)||1;
      const toSize = isAsym ? (rel.dominante===rel.to ? 16 : 10) : 13;
      drawArrowhead(ex, ey, adx/al, ady/al, toSize);

      if (rel.dir === 'bilateral') {
        const t3=0.12, t4=0.10;
        const bx2=qAt(t3,sx,midX,ex), by2=qAt(t3,sy,midY,ey);
        const cx3=qAt(t4,sx,midX,ex), cy3=qAt(t4,sy,midY,ey);
        const adx2=cx3-bx2, ady2=cy3-by2, al2=Math.sqrt(adx2*adx2+ady2*ady2)||1;
        const fromSize = isAsym ? (rel.dominante===rel.from ? 16 : 10) : 13;
        drawArrowhead(sx, sy, adx2/al2, ady2/al2, fromSize);
      }
    }

    // intNodes drawn in separate pass after actor nodes (see below)
  });

  // ── Draw relation control-point handles (after lines, before nodes) ────
  relGeom.forEach(g => {
    const isHov = hoveredRel === g;
    const intensidad = g.rel.intensidad || 'media';
    const baseA = intensidad === 'alta' ? 0.55 : intensidad === 'baja' ? 0.2 : 0.3;
    const alpha = hoveredRel && !isHov ? 0.08 : (isHov ? 0.85 : baseA);
    const color = REL_COLORS[g.rel.type] || '#8b8aaa';
    // Point on the actual curve at t=0.5 (not the bezier control point)
    const t = 0.5;
    const hx = (1-t)*(1-t)*g.sx + 2*(1-t)*t*g.midX + t*t*g.ex;
    const hy = (1-t)*(1-t)*g.sy + 2*(1-t)*t*g.midY + t*t*g.ey;
    // Parse hex color to rgba
    const r = parseInt(color.slice(1,3),16), gv = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    ctx.beginPath();
    ctx.arc(hx, hy, isHov ? 6 : 4.5, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${r},${gv},${b},${alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r},${gv},${b},${Math.min(1, alpha + 0.35)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // ── Draw actor nodes ───────────────────────────────────────────────────
  actorData.forEach(actor => {
    const pos = positions[actor.id];
    if (!pos) return;
    const color = TYPE_COLORS[actor.type] || '#ffffff';
    const r = actor.type === 'central' ? 28 : 22;
    const isDragging = draggingActor && draggingActor.id === actor.id;
    const isHov = hoveredActor && hoveredActor.id === actor.id;
    const alpha = hoveredActor && !isHov ? '55' : 'ff';
    const effectiveR = (isDragging || isHov) ? r + 4 : r;
    const isSquare = actor.estatal === 'noestatal';
    const incidencia = actor.incidencia || 'media';

    // Glow — same smooth 2-stop gradient as before, incidencia only tweaks inner opacity and radius
    const glowInnerAlpha = isHov || isDragging ? '77'
      : incidencia === 'alta' ? '55' : incidencia === 'baja' ? '18' : '33';
    const glowRadius = incidencia === 'alta' ? effectiveR * 2.8 : incidencia === 'baja' ? effectiveR * 1.4 : effectiveR * 2;
    const grd = ctx.createRadialGradient(pos.x, pos.y, effectiveR * 0.3, pos.x, pos.y, glowRadius);
    grd.addColorStop(0, color + glowInnerAlpha);
    grd.addColorStop(1, color + '00');
    ctx.beginPath(); ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();

    // Shape: circle or rounded square
    ctx.beginPath();
    if (isSquare) {
      const s = effectiveR * 1.55;
      ctx.roundRect(pos.x - s/2, pos.y - s/2, s, s, 5);
    } else {
      ctx.arc(pos.x, pos.y, effectiveR, 0, Math.PI*2);
    }
    ctx.fillStyle = isDragging ? '#dcd9d0' : '#ffffff'; ctx.fill();
    ctx.strokeStyle = color + alpha;
    ctx.lineWidth = isDragging ? 4 : isHov ? 3.5 : (actor.type === 'central' ? 3 : 2);
    ctx.stroke();

    const abbr = actor.name.split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();
    ctx.fillStyle = color + alpha;
    ctx.font = `bold ${Math.round(effectiveR*0.55)}px Syne, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(abbr, pos.x, pos.y);

    ctx.fillStyle = isHov ? '#0d0d0b' : '#1a1916' + alpha;
    ctx.font = isHov ? `600 12px DM Sans, sans-serif` : `500 11px DM Sans, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const words = actor.name.split(' ');
    const half = Math.ceil(words.length / 2);
    const line1 = words.slice(0, half).join(' ');
    const line2 = words.slice(half).join(' ');
    ctx.fillText(line1, pos.x, pos.y + effectiveR + 5);
    if (line2) ctx.fillText(line2, pos.x, pos.y + effectiveR + 18);
  });

  // ── Draw intermediario nodes ON curves (after actors so they render on top) ──
  relGeom.forEach(g => {
    const { intNodes } = g;
    const isHovG = hoveredRel === g;
    intNodes.forEach(n => {
      const nodeR = 13;
      const isSquareInt = n.estatal === 'noestatal';
      const strokeAlpha = hoveredRel && !isHovG ? '44' : 'ff';
      const textAlpha   = hoveredRel && !isHovG ? '44' : 'dd';

      ctx.beginPath();
      if (isSquareInt) {
        const s = nodeR * 2;
        ctx.roundRect(n.x - s/2, n.y - s/2, s, s, 3);
      } else {
        ctx.arc(n.x, n.y, nodeR, 0, Math.PI*2);
      }
      ctx.fillStyle = '#e8e5de';
      ctx.fill();
      ctx.strokeStyle = '#9a9790' + strokeAlpha;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const name = n.name.length > 10 ? n.name.split(' ')[0] : n.name;
      ctx.fillStyle = '#0d0d0b' + textAlpha;
      ctx.font = 'bold 8px DM Sans, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name.slice(0, 8), n.x, n.y);
      if (n.name.split(' ').length > 1 || n.name.length > 8) {
        ctx.fillStyle = '#5a5750' + (hoveredRel && !isHovG ? '44' : 'cc');
        ctx.font = '9px DM Sans, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(n.name.length > 10 ? n.name.split(' ').slice(1).join(' ').slice(0,8) : '', n.x, n.y + nodeR + 3);
      }
      ctx.textBaseline = 'alphabetic';
    });
  });

  // ── Legend — rendered in a dedicated bottom band, below actor area ─────
  const LEGEND_H = state.LEGEND_H || 58;
  const legendBandY = H - LEGEND_H;
  // Separator line
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, legendBandY); ctx.lineTo(W, legendBandY); ctx.stroke();
  // Slightly darker bg for the legend band
  ctx.fillStyle = 'rgba(26,25,22,0.05)';
  ctx.fillRect(0, legendBandY, W, LEGEND_H);

  const legendRow1Y = legendBandY + 18;
  const legendRow2Y = legendBandY + 40;
  let lx = 28;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';

  // Row 1: actor types + estatal shapes
  [{ label:'Central', color:'#e8c547' },{ label:'Secundario', color:'#2e7db5' },
   { label:'Ilegal', color:'#c43a4a' },{ label:'Observador', color:'#2a8c5c' }].forEach(t => {
    ctx.beginPath(); ctx.arc(lx+5, legendRow1Y, 5, 0, Math.PI*2);
    ctx.fillStyle = t.color; ctx.fill();
    ctx.fillStyle = '#5a5750'; ctx.font = '10px DM Sans, sans-serif';
    ctx.fillText(t.label, lx+14, legendRow1Y); lx += 90;
  });
  // Estatal indicators
  ctx.beginPath(); ctx.arc(lx+5, legendRow1Y, 5, 0, Math.PI*2);
  ctx.strokeStyle = '#8b8aaa'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#5a5750'; ctx.font = '10px DM Sans, sans-serif';
  ctx.fillText('Estatal', lx+14, legendRow1Y); lx += 68;
  ctx.beginPath(); ctx.roundRect(lx+1, legendRow1Y-5, 10, 10, 2);
  ctx.strokeStyle = '#8b8aaa'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#5a5750'; ctx.font = '10px DM Sans, sans-serif';
  ctx.fillText('No estatal', lx+14, legendRow1Y);

  // Row 2: relation types
  lx = 28;
  [{ label:'Alianza', color:'#2a8c5c', dash:[] }, { label:'Cooperación', color:'#7c6af7', dash:[] },
   { label:'Coordinación', color:'#2e7db5', dash:[] }, { label:'Dependencia', color:'#ffaa33', dash:[] },
   { label:'Competencia', color:'#ff9de2', dash:[] }, { label:'Tensión', color:'#c43a4a', dash:[5,3] },
   { label:'Neutral', color:'#8b8aaa', dash:[2,4] }].forEach(r => {
    if (lx + 80 > W) return;
    ctx.beginPath(); ctx.setLineDash(r.dash); ctx.strokeStyle = r.color;
    ctx.lineWidth = 2; ctx.moveTo(lx, legendRow2Y); ctx.lineTo(lx+18, legendRow2Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#5a5750'; ctx.font = '10px DM Sans, sans-serif';
    ctx.fillText(r.label, lx+22, legendRow2Y); lx += 90;
  });
  ctx.fillStyle = '#5a5750'; ctx.font = '10px DM Sans, sans-serif';
  ctx.fillText('↔ Bilateral   → Unilateral', lx, legendRow2Y);

  // ── Tooltip ────────────────────────────────────────────────────────────
  if (hoveredActor) drawTooltipActor(ctx, hoveredActor, positions[hoveredActor.id], W, H);
  if (hoveredRel)   drawTooltipRel(ctx, hoveredRel, actorData, W, H);

  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}

function drawTooltipActor(ctx, actor, pos, W, H) {
  const TYPE_LABELS_MAP = { central:'Central ', secundario:'Secundario', ilegal:'Ilegal ', observador:'Observador  ' };
  const color = TYPE_COLORS[actor.type] || '#ffffff';
  const estatalLabel = actor.estatal === 'noestatal' ? 'No estatal  ▪  ◼' : 'Estatal  ▪  ●';
  const lines = [actor.name, TYPE_LABELS_MAP[actor.type] || actor.type, estatalLabel];
  drawTooltip(ctx, lines, pos.x, pos.y - 38, color, W, H);
}

function drawTooltipRel(ctx, g, actorData, W, H) {
  const REL_LABELS = { alianza:'Alianza', cooperacion:'Cooperación', coordinacion:'Coordinación',
    dependencia:'Dependencia', competencia:'Competencia', tension:'Tensión', neutral:'Neutral' };
  const { rel, midX, midY, intNodes } = g;
  const fromActor = actorData.find(a => a.id === rel.from);
  const toActor   = actorData.find(a => a.id === rel.to);
  const dirLabel  = rel.dir === 'bilateral' ? 'Bilateral ↔' : 'Unilateral →';
  const lines = [
    `${fromActor?.name || '?'}  ${rel.dir === 'bilateral' ? '↔' : '→'}  ${toActor?.name || '?'}`,
    `Tipo: ${REL_LABELS[rel.type] || rel.type}  ·  ${dirLabel}  ·  Intensidad: ${{ alta:'Alta', media:'Media', baja:'Baja' }[rel.intensidad] || 'Media'}`,
  ];
  if (rel.flujo === 'asimetrica' && rel.dominante) {
    const domActor = actorData.find(a => a.id === rel.dominante);
    lines.push(`Flujo: Asimétrica  ·  Dominante: ${domActor?.name || '?'}`);
  }
  if (intNodes.length > 0) {
    const names = intNodes.map(n => n.name);
    for (let i = 0; i < names.length; i += 3) {
      const chunk = names.slice(i, i + 3).join(', ');
      lines.push(i === 0 ? `Intermediarios: ${chunk}` : `  ${chunk}`);
    }
  }
  const color = REL_COLORS[rel.type] || '#8b8aaa';
  drawTooltip(ctx, lines, midX, midY - 14, color, W, H);
}

function drawTooltip(ctx, lines, x, y, accentColor, W, H) {
  const PAD = 12, LINE_H = 18, R = 8;
  ctx.font = '13px DM Sans, sans-serif';
  const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
  const TW = maxW + PAD * 2;
  const TH = lines.length * LINE_H + PAD * 1.5;

  let tx = x - TW / 2;
  let ty = y - TH;
  tx = Math.max(8, Math.min(W - TW - 8, tx));
  ty = Math.max(8, Math.min(H - TH - 8, ty));

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 16;

  // Background
  ctx.beginPath();
  ctx.roundRect(tx, ty, TW, TH, R);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Accent left bar
  ctx.beginPath();
  ctx.roundRect(tx, ty, 3, TH, [R, 0, 0, R]);
  ctx.fillStyle = accentColor;
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.roundRect(tx, ty, TW, TH, R);
  ctx.strokeStyle = accentColor + '55';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#0d0d0b' : '#5a5750';
    ctx.font = i === 0 ? 'bold 13px DM Sans, sans-serif' : '12px DM Sans, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(line, tx + PAD + 4, ty + PAD * 0.75 + i * LINE_H);
  });
}

// ── Per-relation manual control-point offsets (for dragging arrows) ───────
// key: relData index → { perp: pixels perpendicular, tang: pixels tangential }
let _relControlOffsets = {};

// ── Build relation geometry from current positions ─────────────────────────
function buildRelGeom(relData, actorData, positions) {
  // Count how many relations exist between each pair, to offset parallels
  const pairCount = {};
  relData.forEach(rel => {
    const key = [rel.from, rel.to].sort().join('|');
    pairCount[key] = (pairCount[key] || 0) + 1;
  });
  const pairSeen = {};

  return relData.map((rel, relIdx) => {
    const from = positions[rel.from];
    const to   = positions[rel.to];
    if (!from || !to) return null;

    const key = [rel.from, rel.to].sort().join('|');
    pairSeen[key] = (pairSeen[key] || 0);
    const idx   = pairSeen[key];
    const total = pairCount[key];
    pairSeen[key]++;

    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx/dist, uy = dy/dist;
    const nodeR = 24;
    const sx = from.x + ux*nodeR, sy = from.y + uy*nodeR;
    const ex = to.x  - ux*nodeR, ey = to.y  - uy*nodeR;

    // Automatic curve separation between parallel relations
    // Single relation: gentle curve. Multiple: spread clearly apart with 70px steps
    const baseOffset = total === 1 ? 36 : 70;
    let autoCurveDir;
    if (total === 1) {
      autoCurveDir = 0.55; // single: gentle curve
    } else {
      // interleave left/right: idx=0→+1(right), idx=1→-1(left), idx=2→+2, idx=3→-2 ...
      const sign = (idx % 2 === 0) ? 1 : -1;
      const mag  = Math.floor(idx / 2) + 1;
      autoCurveDir = sign * mag;
    }

    // Apply manual drag offset if present for this relation index
    const manualOffset = _relControlOffsets[relIdx] || { perp: 0, tang: 0 };
    const autoCurveMag = baseOffset * Math.abs(autoCurveDir);
    const autoSign = Math.sign(autoCurveDir) || 1;
    // perp: lateral displacement (perpendicular to line), tang: along-line shift
    const midX = (sx+ex)/2 - uy * autoCurveMag * autoSign - uy * manualOffset.perp + ux * manualOffset.tang;
    const midY = (sy+ey)/2 + ux * autoCurveMag * autoSign + ux * manualOffset.perp + uy * manualOffset.tang;

    const intNodes = (rel.intermediarios || []).map((intId, i2) => {
      const actor = actorData.find(a => a.id === intId);
      if (!actor) return null;
      const count = rel.intermediarios.length;
      const t = count === 1 ? 0.5 : 0.35 + (i2 / (count - 1)) * 0.3;
      const ix = (1-t)*(1-t)*sx + 2*(1-t)*t*midX + t*t*ex;
      const iy = (1-t)*(1-t)*sy + 2*(1-t)*t*midY + t*t*ey;
      return { id: intId, name: actor.name, estatal: actor.estatal || 'estatal', x: ix, y: iy, t };
    }).filter(Boolean);

    return { rel, relIdx, from, to, sx, sy, ex, ey, midX, midY, ux, uy, intNodes };
  }).filter(Boolean);
}

// ── Canvas interaction state ───────────────────────────────────────────────
let _drag = null; // { actor, offsetX, offsetY } or { relCtrlPoint, relIdx, startMx, startMy, origPerp, origTang }
let _hoveredActor = null;
let _hoveredRel = null;

function getCanvasXY(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    mx: (clientX - rect.left) * scaleX,
    my: (clientY - rect.top)  * scaleY
  };
}

function actorAtPoint(mx, my, actorData, positions) {
  for (const actor of actorData) {
    const pos = positions[actor.id];
    if (!pos) continue;
    const r = (actor.type === 'central' ? 28 : 22) + 6;
    const dx = mx - pos.x, dy = my - pos.y;
    if (dx*dx + dy*dy < r*r) return actor;
  }
  return null;
}

function relAtPoint(mx, my, relGeom) {
  for (const g of relGeom) {
    const { sx, sy, midX, midY, ex, ey } = g;
    for (let t = 0; t <= 1; t += 0.05) {
      const qx = (1-t)*(1-t)*sx + 2*(1-t)*t*midX + t*t*ex;
      const qy = (1-t)*(1-t)*sy + 2*(1-t)*t*midY + t*t*ey;
      if ((mx-qx)*(mx-qx) + (my-qy)*(my-qy) < 64) return g;
    }
  }
  return null;
}

function attachCanvasListeners(canvas) {
  // Remove old listeners by replacing element reference handlers
  canvas.onmousedown  = onPointerDown;
  canvas.onmousemove  = onPointerMove;
  canvas.onmouseup    = onPointerUp;
  canvas.onmouseleave = onPointerLeave;
  canvas.ontouchstart = (e) => { e.preventDefault(); onPointerDown(e); };
  canvas.ontouchmove  = (e) => { e.preventDefault(); onPointerMove(e); };
  canvas.ontouchend   = (e) => { e.preventDefault(); onPointerUp(e); };
}

function onPointerDown(e) {
  if (!_mapState) return;
  const canvas = document.getElementById('mapCanvas');
  const { mx, my } = getCanvasXY(canvas, e);
  const { actorData, positions, relGeom, relData } = _mapState;
  const actor = actorAtPoint(mx, my, actorData, positions);
  if (actor) {
    const pos = positions[actor.id];
    _drag = { actor, offsetX: mx - pos.x, offsetY: my - pos.y };
    canvas.style.cursor = 'grabbing';
    return;
  }
  // Check if clicking near a relation control point (midpoint on curve)
  if (relGeom) {
    for (const g of relGeom) {
      const t = 0.5;
      const hx = (1-t)*(1-t)*g.sx + 2*(1-t)*t*g.midX + t*t*g.ex;
      const hy = (1-t)*(1-t)*g.sy + 2*(1-t)*t*g.midY + t*t*g.ey;
      const dx = mx - hx, dy = my - hy;
      if (dx*dx + dy*dy < 100) {
        const manualOffset = _relControlOffsets[g.relIdx] || { perp: 0, tang: 0 };
        _drag = {
          relCtrlPoint: true,
          relIdx: g.relIdx,
          startMx: mx, startMy: my,
          origPerp: manualOffset.perp,
          origTang: manualOffset.tang,
          ux: g.ux, uy: g.uy
        };
        canvas.style.cursor = 'grabbing';
        return;
      }
    }
  }
}

function onPointerMove(e) {
  if (!_mapState) return;
  const canvas = document.getElementById('mapCanvas');

  const { mx, my } = getCanvasXY(canvas, e);
  const { actorData, relData, positions } = _mapState;

  if (_drag) {
    if (_drag.relCtrlPoint) {
      // Move the control point of a relation
      const ddx = mx - _drag.startMx;
      const ddy = my - _drag.startMy;
      // Decompose displacement into perpendicular and tangential components
      // perp axis: (-uy, ux), tang axis: (ux, uy)
      const perp = -ddx * _drag.uy + ddy * _drag.ux;
      const tang =  ddx * _drag.ux + ddy * _drag.uy;
      _relControlOffsets[_drag.relIdx] = {
        perp: _drag.origPerp + perp,
        tang: _drag.origTang + tang
      };
      _mapState.relGeom = buildRelGeom(relData, actorData, positions);
      renderMap(_mapState, null, null, null);
      canvas.style.cursor = 'grabbing';
      return;
    }
    // Move the dragged actor — enforce safe margins
    const { W, H, headerH, MARGIN, LEGEND_H } = _mapState;
    const minY = (headerH || 0) + (MARGIN || 60);
    const maxY = H - (LEGEND_H || 58) - (MARGIN || 60) / 2;
    const newX = Math.max(MARGIN || 60, Math.min(W - (MARGIN || 60), mx - _drag.offsetX));
    const newY = Math.max(minY, Math.min(maxY, my - _drag.offsetY));
    positions[_drag.actor.id] = { x: newX, y: newY };
    // Recompute relation geometry live
    _mapState.relGeom = buildRelGeom(relData, actorData, positions);
    renderMap(_mapState, null, null, _drag.actor);
    canvas.style.cursor = 'grabbing';
    return;
  }

  // Hover detection
  const actor = actorAtPoint(mx, my, actorData, positions);
  if (actor) {
    if (_hoveredActor?.id !== actor.id) {
      _hoveredActor = actor; _hoveredRel = null;
      renderMap(_mapState, actor, null, null);
    }
    canvas.style.cursor = 'grab';
    return;
  }

  // Check hover over relation control point handle
  if (_mapState.relGeom) {
    for (const g of _mapState.relGeom) {
      const t = 0.5;
      const hx = (1-t)*(1-t)*g.sx + 2*(1-t)*t*g.midX + t*t*g.ex;
      const hy = (1-t)*(1-t)*g.sy + 2*(1-t)*t*g.midY + t*t*g.ey;
      const dx = mx - hx, dy = my - hy;
      if (dx*dx + dy*dy < 144) { // 12px radius
        canvas.style.cursor = 'grab';
        if (_hoveredRel !== g) {
          _hoveredRel = g; _hoveredActor = null;
          renderMap(_mapState, null, g, null);
        }
        return;
      }
    }
  }

  const rel = relAtPoint(mx, my, _mapState.relGeom);
  if (rel) {
    if (_hoveredRel !== rel) {
      _hoveredRel = rel; _hoveredActor = null;
      renderMap(_mapState, null, rel, null);
    }
    canvas.style.cursor = 'pointer';
    return;
  }

  if (_hoveredActor || _hoveredRel) {
    _hoveredActor = null; _hoveredRel = null;
    renderMap(_mapState, null, null, null);
  }
  canvas.style.cursor = 'default';
}

function onPointerUp(e) {
  if (_drag) {
    _drag = null;
    const canvas = document.getElementById('mapCanvas');
    canvas.style.cursor = 'default';
    renderMap(_mapState, null, null, null);
  }
}

function onPointerLeave(e) {
  if (_drag) { _drag = null; }
  _hoveredActor = null; _hoveredRel = null;
  if (_mapState) renderMap(_mapState, null, null, null);
  const canvas = document.getElementById('mapCanvas');
  canvas.style.cursor = 'default';
}

function resetLayout() {
  if (!_mapState) return;
  _relControlOffsets = {};
  applyZoom();
  const { actorData, relData, W, H, headerH, MARGIN, LEGEND_H } = _mapState;
  const groups = {};
  actorData.forEach(a => { if (!groups[a.type]) groups[a.type] = []; groups[a.type].push(a); });
  const typeOrder = ['central', 'observador', 'secundario', 'ilegal'];
  const ringR = [0, 180, 295, 400];
  const mg = MARGIN || 72;
  const lgH = LEGEND_H || 58;
  const topPad = (headerH || 0) + mg;
  const bottomPad = lgH + mg;
  const positions = {};
  const cx = W / 2;
  const cy = topPad + (H - topPad - bottomPad) / 2;
  typeOrder.forEach((type, ti) => {
    const group = groups[type] || [];
    const r = ringR[ti];
    group.forEach((actor, i) => {
      if (r === 0 && group.length === 1) {
        positions[actor.id] = { x: cx, y: cy };
      } else {
        const effectiveR = r === 0 ? 110 : r;
        const offset = ti * 0.3;
        const angle = (2 * Math.PI * i / Math.max(group.length, 1)) - Math.PI / 2 + offset;
        positions[actor.id] = {
          x: Math.max(mg, Math.min(W - mg, cx + effectiveR * Math.cos(angle))),
          y: Math.max(topPad - mg/2, Math.min(H - bottomPad, cy + effectiveR * Math.sin(angle)))
        };
      }
    });
  });
  if (Object.keys(groups).length === 1) {
    actorData.forEach((actor, i) => {
      const r = 270;
      const angle = (2 * Math.PI * i / actorData.length) - Math.PI / 2;
      positions[actor.id] = {
        x: Math.max(mg, Math.min(W - mg, cx + r * Math.cos(angle))),
        y: Math.max(topPad - mg/2, Math.min(H - bottomPad, cy + r * Math.sin(angle)))
      };
    });
  }
  _mapState.positions = positions;
  _mapState.relGeom = buildRelGeom(relData, actorData, positions);
  renderMap(_mapState, null, null, null);
}

// ── Zoom & Pan system ──────────────────────────────────────────────────────
let _zoom = 1.0;




// Canvas-space pan: shifts the drawn content inside the canvas



function applyZoom() {
  const canvas = document.getElementById('mapCanvas');
  const wrap = document.getElementById('mapCanvasWrap');
  if (!canvas || !wrap) return;
  canvas.style.transform = `scale(${_zoom})`;
  canvas.style.transformOrigin = 'top left';
  wrap.style.height = Math.round(canvas.height * _zoom) + 'px';
  const label = document.getElementById('zoomLabel');
  if (label) label.textContent = Math.round(_zoom * 100) + '%';
}

function zoomMap(delta) {
  _zoom = Math.max(0.3, Math.min(2.5, _zoom + delta));
  applyZoom();
}

function zoomReset() {
  _zoom = 1.0;
  applyZoom();
}

function handleHover(mx, my) {} // kept for compatibility

function downloadMap() {
  const canvas = document.getElementById('mapCanvas');
  if (!canvas || !_mapState) return;
  const title = (document.getElementById('dimTitulo').value.trim() || 'mapa_actores').replace(/\s+/g,'_');
  // Render a clean frame before download
  renderMap(_mapState, null, null, null);
  const a = document.createElement('a');
  a.download = `mapa_actores_${title}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// Start with 3 default actors
addActor(); addActor(); addActor();
document.getElementById('dimTitulo').addEventListener('input', validateForm);
validateForm();
