// match.js — Colbios Sports match detail page

const POLL_INTERVAL = 7000;

let matchId = null;
let pollTimer = null;
let lastEventCount = 0;

// ── URL parsing ───────────────────────────────────────────────────────────────

function getMatchIdFromUrl() {
  const parts = window.location.pathname.split('/');
  const id = parseInt(parts[parts.length - 1], 10);
  return isNaN(id) ? null : id;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sportClass(sport) {
  const known = ['football','basketball','volleyball','tennis','badminton'];
  return known.includes(sport) ? `sport-${sport}` : 'sport-default';
}

function statusText(status) {
  if (status === 'live')     return 'LIVE';
  if (status === 'finished') return 'FULL TIME';
  return 'UPCOMING';
}

function statusBadgeHtml(status) {
  if (status === 'live')     return `<span class="status-badge live"><span class="dot"></span>Live</span>`;
  if (status === 'upcoming') return `<span class="status-badge upcoming">Upcoming</span>`;
  return `<span class="status-badge finished">FT</span>`;
}

function formatDate(d, t) {
  try {
    const dt = new Date(`${d}T${t}`);
    return dt.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'}) +
           ' · ' + dt.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
  } catch { return `${d} ${t}`; }
}

function eventLabel(type) {
  const labels = {
    goal: 'Goal', own_goal: 'Own Goal', penalty: 'Penalty', yellow_card: 'Yellow Card',
    red_card: 'Red Card', substitution: 'Substitution', injury: 'Injury',
    '2pt': '2-Point Shot', '3pt': '3-Point Shot', '1pt': 'Free Throw',
    foul: 'Foul', timeout: 'Timeout', block: 'Block',
    point: 'Point', ace: 'Ace', error: 'Opponent Error', set_win: 'Set Won',
    game_win: 'Game Won', double_fault: 'Double Fault', break_point: 'Break Point',
  };
  return labels[type] || type.replace(/_/g,' ');
}

function isScoringEvent(type) {
  return ['goal','own_goal','penalty','2pt','3pt','1pt','point','ace','error','game_win'].includes(type);
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderScoreboard(m) {
  document.title = `${m.team_a} vs ${m.team_b} - Colbios Sports`;

  const sc = sportClass(m.sport_type);

  document.getElementById('scoreboard').className = `scoreboard sb-${sc}`;
  document.getElementById('sb-sport-badge').className  = `sport-badge ${sc}`;
  document.getElementById('sb-sport-badge').textContent = m.sport_type;
  document.getElementById('sb-status-badge').outerHTML  = ''; // replaced below
  document.getElementById('sb-team-a').textContent = m.team_a;
  document.getElementById('sb-team-b').textContent = m.team_b;
  document.getElementById('sb-score-a').textContent = m.score_a;
  document.getElementById('sb-score-b').textContent = m.score_b;
  document.getElementById('sb-status-text').textContent = statusText(m.status);
  document.getElementById('sb-date').textContent = formatDate(m.date, m.time);

  // Replace status badge
  const meta = document.querySelector('.scoreboard-meta');
  const oldBadge = meta.querySelector('.status-badge');
  const tmp = document.createElement('span');
  tmp.innerHTML = statusBadgeHtml(m.status);
  if (oldBadge) oldBadge.replaceWith(tmp.firstChild);
  else meta.appendChild(tmp.firstChild);
}

function renderTimeline(events, teamA, teamB) {
  const body = document.getElementById('timeline-body');
  if (!events || events.length === 0) {
    body.innerHTML = '<div class="no-events">No events recorded yet.</div>';
    return;
  }

  // Show in reverse chronological (newest first)
  const sorted = [...events].reverse();

  body.innerHTML = sorted.map(ev => {
    const isA    = ev.team === 'a';
    const team   = isA ? teamA : teamB;
    const cls    = isA ? 'team-a' : 'team-b';
    const label  = eventLabel(ev.event_type);
    const scoring = isScoringEvent(ev.event_type);
    const timeStr = ev.minute_or_time ? ev.minute_or_time : ev.created_at;
    const scoreTag = scoring ? `<span class="te-score-tag">+${ev.value}pt${ev.value !== 1 ? 's' : ''}</span>` : '';
    const player = ev.player_name ? `<span class="te-player">${ev.player_name} &bull; ${team}</span>` : `<span class="te-player">${team}</span>`;

    return `
      <div class="timeline-event">
        <div class="te-time">${timeStr || '--'}</div>
        <div class="te-content">
          <div class="te-label ${cls}">${label}${scoreTag}</div>
          ${player}
        </div>
      </div>`;
  }).join('');
}

// ── Fetch & Poll ──────────────────────────────────────────────────────────────

async function fetchMatch() {
  try {
    const res = await fetch(`/api/match/${matchId}`);
    if (res.status === 404) {
      document.getElementById('match-detail-root').innerHTML =
        `<a href="/" class="back-link">Back</a><div class="empty-state">Match not found.</div>`;
      clearInterval(pollTimer);
      return;
    }
    if (!res.ok) throw new Error('Server error');

    const data = await res.json();
    renderScoreboard(data);
    renderTimeline(data.events, data.team_a, data.team_b);

    // Update refresh label
    const refreshEl = document.getElementById('timeline-refresh-label');
    if (refreshEl) {
      const now = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      refreshEl.textContent = data.status === 'live'
        ? `Live — last updated ${now}`
        : 'Auto-refresh active';
    }

    lastEventCount = (data.events || []).length;
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(fetchMatch, POLL_INTERVAL);
}

// ── Init ──────────────────────────────────────────────────────────────────────

matchId = getMatchIdFromUrl();
if (!matchId) {
  window.location.href = '/';
} else {
  fetchMatch().then(startPolling);
}
