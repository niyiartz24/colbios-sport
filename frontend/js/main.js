// main.js — Colbios Sports home page

const POLL_INTERVAL = 7000; // ms

let allMatches = [];
let activeSport = 'all';
let pollTimer = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function sportClass(sport) {
  const known = ['football','basketball','volleyball','tennis','badminton'];
  return known.includes(sport) ? `sport-${sport}` : 'sport-default';
}

function statusLabel(status) {
  if (status === 'live')     return `<span class="status-badge live"><span class="dot"></span>Live</span>`;
  if (status === 'upcoming') return `<span class="status-badge upcoming">Upcoming</span>`;
  return `<span class="status-badge finished">FT</span>`;
}

function sportBadge(sport) {
  return `<span class="sport-badge ${sportClass(sport)}">${sport}</span>`;
}

function formatDate(d, t) {
  try {
    const dt = new Date(`${d}T${t}`);
    return dt.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) + ' ' +
           dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  } catch { return `${d} ${t}`; }
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderCard(m) {
  const sc = sportClass(m.sport_type);
  return `
    <a class="match-card ${sc} status-${m.status}" href="/match/${m.id}">
      <div class="card-top">
        ${sportBadge(m.sport_type)}
        ${statusLabel(m.status)}
      </div>
      <div class="card-score-row">
        <div class="team-block">
          <div class="team-name">${m.team_a}</div>
        </div>
        <div class="score-block">
          <span class="score-num">${m.score_a}</span>
          <span class="score-sep">:</span>
          <span class="score-num">${m.score_b}</span>
        </div>
        <div class="team-block right">
          <div class="team-name">${m.team_b}</div>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-datetime">${formatDate(m.date, m.time)}</span>
        <span class="card-arrow">View Details &rsaquo;</span>
      </div>
    </a>`;
}

function renderGrid(gridId, matches, countId) {
  const grid  = document.getElementById(gridId);
  const count = document.getElementById(countId);

  const filtered = activeSport === 'all'
    ? matches
    : matches.filter(m => m.sport_type === activeSport);

  count.textContent = filtered.length > 0 ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''}` : '';

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state">No ${activeSport === 'all' ? '' : activeSport + ' '}matches here.</div>`;
    return;
  }
  grid.innerHTML = filtered.map(renderCard).join('');
}

function renderAll() {
  const live     = allMatches.filter(m => m.status === 'live');
  const upcoming = allMatches.filter(m => m.status === 'upcoming');
  const finished = allMatches.filter(m => m.status === 'finished');

  renderGrid('grid-live',     live,     'count-live');
  renderGrid('grid-upcoming', upcoming, 'count-upcoming');
  renderGrid('grid-finished', finished, 'count-finished');
}

// ── Sports Filter ─────────────────────────────────────────────────────────────

async function buildSportFilters() {
  try {
    const res = await fetch('/api/sports');
    const sports = await res.json();
    const bar = document.getElementById('sport-filters');
    Object.entries(sports).forEach(([key, info]) => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.sport = key;
      btn.textContent = info.display_name || key;
      bar.appendChild(btn);
    });

    bar.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSport = btn.dataset.sport;
      renderAll();
    });
  } catch (err) {
    console.warn('Could not load sport filters:', err);
  }
}

// ── Data Fetching ─────────────────────────────────────────────────────────────

async function fetchMatches() {
  try {
    const res = await fetch('/api/matches');
    if (!res.ok) throw new Error('Server error');
    allMatches = await res.json();
    renderAll();
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(fetchMatches, POLL_INTERVAL);
}

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
  await buildSportFilters();
  await fetchMatches();
  startPolling();
})();
