// live.js — Colbios Sports Live Control Panel

let currentMatch = null;
let selectedTeam = 'a';
let selectedEventType = null;
let sportConfig = null;
let pollTimer = null;

// ── Auth guard ────────────────────────────────────────────────────────────────

async function checkAuth() {
  const res = await fetch('/auth/check');
  const d = await res.json();
  if (!d.authenticated) { window.location.href = '/admin/login'; return false; }
  const el = document.getElementById('admin-username');
  if (el) el.textContent = d.username;
  return true;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Match selector ────────────────────────────────────────────────────────────

async function loadMatchSelector() {
  const res = await fetch('/admin/api/matches');
  if (res.status === 401) { window.location.href = '/admin/login'; return; }
  const matches = await res.json();

  const sel = document.getElementById('match-select');
  sel.innerHTML = '<option value="">-- Select a match --</option>';

  // Prioritise live, then upcoming, then finished
  const ordered = [
    ...matches.filter(m => m.status === 'live'),
    ...matches.filter(m => m.status === 'upcoming'),
    ...matches.filter(m => m.status === 'finished'),
  ];

  ordered.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    const statusTag = m.status === 'live' ? '[LIVE] ' : m.status === 'finished' ? '[FT] ' : '';
    opt.textContent = `${statusTag}${m.team_a} vs ${m.team_b} — ${m.sport_type} (${m.date})`;
    sel.appendChild(opt);
  });

  // Auto-select from query string
  const params = new URLSearchParams(window.location.search);
  const preselect = params.get('match');
  if (preselect) {
    sel.value = preselect;
    sel.dispatchEvent(new Event('change'));
  }
}

document.getElementById('match-select').addEventListener('change', async function () {
  const id = this.value;
  clearInterval(pollTimer);

  if (!id) {
    currentMatch = null;
    sportConfig = null;
    document.getElementById('live-panel').style.display = 'none';
    document.getElementById('no-match-msg').style.display = 'block';
    return;
  }

  await selectMatch(Number(id));
});

async function selectMatch(id) {
  const res = await fetch(`/api/match/${id}`);
  if (!res.ok) { showToast('Failed to load match.', 'error'); return; }
  currentMatch = await res.json();

  // Load sport config
  const cfgRes = await fetch(`/api/sport-config/${currentMatch.sport_type}`);
  sportConfig = cfgRes.ok ? await cfgRes.json() : null;

  renderLivePanel();
  await loadEventLog();

  // Start polling for score sync
  pollTimer = setInterval(async () => {
    const r = await fetch(`/api/match/${currentMatch.id}`);
    if (r.ok) {
      const updated = await r.json();
      currentMatch.score_a = updated.score_a;
      currentMatch.score_b = updated.score_b;
      currentMatch.status  = updated.status;
      updateScoreDisplay();
    }
  }, 8000);
}

// ── Render live panel ─────────────────────────────────────────────────────────

function renderLivePanel() {
  document.getElementById('no-match-msg').style.display = 'none';
  document.getElementById('live-panel').style.display = 'block';

  // Team names
  document.getElementById('live-team-a').textContent = currentMatch.team_a;
  document.getElementById('live-team-b').textContent = currentMatch.team_b;
  document.getElementById('btn-team-a').textContent  = currentMatch.team_a;
  document.getElementById('btn-team-b').textContent  = currentMatch.team_b;

  updateScoreDisplay();
  renderEventButtons();

  // Reset selection
  selectedTeam = 'a';
  selectedEventType = null;
  setActiveTeam('a');
}

function updateScoreDisplay() {
  document.getElementById('live-score-a').textContent = currentMatch.score_a;
  document.getElementById('live-score-b').textContent = currentMatch.score_b;

  const badge = document.getElementById('live-status-badge');
  if (currentMatch.status === 'live') {
    badge.className = 'badge badge-live';
    badge.innerHTML = '<span class="live-dot"></span> LIVE';
  } else if (currentMatch.status === 'finished') {
    badge.className = 'badge badge-finished';
    badge.innerHTML = 'FT';
  } else {
    badge.className = 'badge badge-upcoming';
    badge.innerHTML = 'UPCOMING';
  }
}

function renderEventButtons() {
  const container = document.getElementById('event-buttons');
  container.innerHTML = '';
  selectedEventType = null;

  if (!sportConfig || !sportConfig.events) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No event config for this sport.</p>';
    return;
  }

  sportConfig.events.forEach(ev => {
    const btn = document.createElement('button');
    const isScoring = ev.scoring && ev.value > 0;
    btn.className = `event-btn${isScoring ? ' scoring' : ''}`;
    btn.dataset.key = ev.key;
    btn.textContent = ev.label + (isScoring ? ` (+${ev.value})` : '');

    btn.addEventListener('click', () => {
      container.querySelectorAll('.event-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEventType = ev.key;
    });

    container.appendChild(btn);
  });
}

// ── Team toggle ───────────────────────────────────────────────────────────────

function setActiveTeam(team) {
  selectedTeam = team;
  const btnA = document.getElementById('btn-team-a');
  const btnB = document.getElementById('btn-team-b');
  btnA.className = `team-toggle-btn${team === 'a' ? ' active-a' : ''}`;
  btnB.className = `team-toggle-btn${team === 'b' ? ' active-b' : ''}`;
}

document.getElementById('btn-team-a').addEventListener('click', () => setActiveTeam('a'));
document.getElementById('btn-team-b').addEventListener('click', () => setActiveTeam('b'));

// ── Add Event ─────────────────────────────────────────────────────────────────

document.getElementById('btn-add-event').addEventListener('click', async () => {
  if (!currentMatch) { showToast('No match selected.', 'error'); return; }
  if (!selectedEventType) { showToast('Select an event type first.', 'error'); return; }

  const playerName  = document.getElementById('player-name-input').value.trim();
  const minuteOrTime = document.getElementById('minute-input').value.trim();

  const res = await fetch('/admin/api/event/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      match_id:       currentMatch.id,
      event_type:     selectedEventType,
      team:           selectedTeam,
      player_name:    playerName,
      minute_or_time: minuteOrTime,
    }),
  });

  const d = await res.json();

  if (res.ok) {
    currentMatch.score_a = d.match.score_a;
    currentMatch.score_b = d.match.score_b;
    updateScoreDisplay();
    showToast('Event logged.', 'success');

    // Clear inputs
    document.getElementById('player-name-input').value = '';
    document.getElementById('minute-input').value = '';
    // Deselect event type
    document.querySelectorAll('.event-btn').forEach(b => b.classList.remove('selected'));
    selectedEventType = null;

    await loadEventLog();
  } else {
    showToast(d.error || 'Failed to log event.', 'error');
  }
});

// ── Event log ─────────────────────────────────────────────────────────────────

async function loadEventLog() {
  if (!currentMatch) return;
  const res = await fetch(`/admin/api/match/${currentMatch.id}/events`);
  if (!res.ok) return;
  const events = await res.json();
  renderEventLog(events);
}

function renderEventLog(events) {
  const body = document.getElementById('event-log-body');
  if (!events.length) {
    body.innerHTML = '<div class="no-log">No events yet. Start logging above.</div>';
    return;
  }

  body.innerHTML = events.map(ev => {
    const isA    = ev.team === 'a';
    const team   = isA ? currentMatch.team_a : currentMatch.team_b;
    const cls    = isA ? 'team-a' : 'team-b';
    const label  = eventLabel(ev.event_type);
    const time   = ev.minute_or_time || ev.created_at || '';
    const player = ev.player_name ? ` · ${ev.player_name}` : '';

    return `
      <div class="log-item" id="log-${ev.id}">
        <div class="log-item-left">
          <div class="log-item-type ${cls}">${label}${ev.value > 0 ? ` (+${ev.value})` : ''}</div>
          <div class="log-item-meta">${time ? time + ' — ' : ''}${team}${player}</div>
        </div>
        <button class="btn-del-event" data-id="${ev.id}" title="Remove event">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M1 1l8 8M9 1L1 9"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  // Bind delete buttons
  body.querySelectorAll('.btn-del-event').forEach(btn => {
    btn.addEventListener('click', () => deleteEvent(Number(btn.dataset.id)));
  });
}

async function deleteEvent(eventId) {
  if (!confirm('Remove this event? The score will be adjusted.')) return;

  const res = await fetch(`/admin/api/event/${eventId}/delete`, { method: 'DELETE' });
  const d = await res.json();

  if (res.ok) {
    if (d.match) {
      currentMatch.score_a = d.match.score_a;
      currentMatch.score_b = d.match.score_b;
      updateScoreDisplay();
    }
    showToast('Event removed.', 'success');
    await loadEventLog();
  } else {
    showToast('Failed to remove event.', 'error');
  }
}

// ── Status controls ───────────────────────────────────────────────────────────

document.getElementById('btn-set-live').addEventListener('click', () => updateStatus('live'));
document.getElementById('btn-set-finished').addEventListener('click', () => updateStatus('finished'));

async function updateStatus(status) {
  if (!currentMatch) { showToast('Select a match first.', 'error'); return; }

  const res = await fetch(`/admin/api/match/${currentMatch.id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (res.ok) {
    currentMatch.status = status;
    updateScoreDisplay();
    showToast(`Status updated to ${status}.`, 'success');
  } else {
    showToast('Status update failed.', 'error');
  }
}

document.getElementById('btn-reset-score').addEventListener('click', async () => {
  if (!currentMatch) { showToast('Select a match first.', 'error'); return; }
  if (!confirm('Reset score to 0 - 0? This does not delete events.')) return;

  const res = await fetch(`/admin/api/match/${currentMatch.id}/reset-score`, { method: 'POST' });
  if (res.ok) {
    const d = await res.json();
    currentMatch.score_a = d.score_a;
    currentMatch.score_b = d.score_b;
    updateScoreDisplay();
    showToast('Score reset.', 'success');
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// ── Label helper ──────────────────────────────────────────────────────────────

function eventLabel(type) {
  const labels = {
    goal:'Goal', own_goal:'Own Goal', penalty:'Penalty', yellow_card:'Yellow Card',
    red_card:'Red Card', substitution:'Substitution', injury:'Injury',
    '2pt':'2-Point Shot', '3pt':'3-Point Shot', '1pt':'Free Throw',
    foul:'Foul', timeout:'Timeout', block:'Block',
    point:'Point', ace:'Ace', error:'Opponent Error', set_win:'Set Won',
    game_win:'Game Won', double_fault:'Double Fault', break_point:'Break Point',
  };
  return labels[type] || type.replace(/_/g, ' ');
}

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
  const ok = await checkAuth();
  if (!ok) return;
  await loadMatchSelector();
})();
