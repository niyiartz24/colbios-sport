// dashboard.js — Colbios Sports Admin Dashboard

// ── Auth guard ────────────────────────────────────────────────────────────────

async function checkAuth() {
  const res = await fetch('/auth/check');
  const d = await res.json();
  if (!d.authenticated) {
    window.location.href = '/admin/login';
    return false;
  }
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

// ── Sport helpers ─────────────────────────────────────────────────────────────

let sportsData = {};

async function loadSports() {
  const res = await fetch('/admin/api/sports');
  if (res.status === 401) { window.location.href = '/admin/login'; return; }
  sportsData = await res.json();

  const sel = document.getElementById('sport-select');
  sel.innerHTML = '<option value="">Select sport...</option>';
  Object.entries(sportsData).forEach(([key, info]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = info.display_name || key;
    sel.appendChild(opt);
  });
}

function sportBadge(sport) {
  const known = ['football','basketball','volleyball','tennis','badminton'];
  const cls = known.includes(sport) ? `badge-sport-${sport}` : 'badge-sport-default';
  const name = sportsData[sport]?.display_name || sport;
  return `<span class="badge ${cls}">${name}</span>`;
}

function statusBadge(status) {
  const map = {
    live:     `<span class="badge badge-live"><span class="live-dot"></span>Live</span>`,
    upcoming: `<span class="badge badge-upcoming">Upcoming</span>`,
    finished: `<span class="badge badge-finished">FT</span>`,
  };
  return map[status] || status;
}

// ── Matches table ─────────────────────────────────────────────────────────────

async function loadMatches() {
  const res = await fetch('/admin/api/matches');
  if (res.status === 401) { window.location.href = '/admin/login'; return; }
  const matches = await res.json();
  renderMatchesTable(matches);
}

function renderMatchesTable(matches) {
  const tbody = document.getElementById('matches-tbody');
  if (matches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">No matches created yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = matches.map(m => `
    <tr data-id="${m.id}">
      <td>${sportBadge(m.sport_type)}</td>
      <td class="cell-primary">${m.team_a} vs ${m.team_b}</td>
      <td>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;letter-spacing:0.04em;">
          ${m.score_a} : ${m.score_b}
        </span>
      </td>
      <td>${m.date} &nbsp; ${m.time}</td>
      <td>${statusBadge(m.status)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-ghost btn-sm btn-edit" data-id="${m.id}">Edit</button>
          <button class="btn btn-success btn-sm btn-live-ctrl" data-id="${m.id}">Live Control</button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${m.id}">Delete</button>
        </div>
      </td>
    </tr>`).join('');

  // Bind edit
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(Number(btn.dataset.id), matches));
  });

  // Bind live control redirect
  tbody.querySelectorAll('.btn-live-ctrl').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `/admin/live?match=${btn.dataset.id}`;
    });
  });

  // Bind delete
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteMatch(Number(btn.dataset.id)));
  });
}

// ── Create match ──────────────────────────────────────────────────────────────

document.getElementById('btn-create-match').addEventListener('click', async () => {
  const sport   = document.getElementById('sport-select').value;
  const teamA   = document.getElementById('team-a-input').value.trim();
  const teamB   = document.getElementById('team-b-input').value.trim();
  const date    = document.getElementById('date-input').value;
  const time    = document.getElementById('time-input').value;

  if (!sport || !teamA || !teamB || !date || !time) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  const res = await fetch('/admin/api/match/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sport_type: sport, team_a: teamA, team_b: teamB, date, time }),
  });

  const d = await res.json();
  if (res.ok) {
    showToast('Match created successfully.', 'success');
    document.getElementById('team-a-input').value = '';
    document.getElementById('team-b-input').value = '';
    loadMatches();
  } else {
    showToast(d.error || 'Failed to create match.', 'error');
  }
});

// ── Edit Modal ────────────────────────────────────────────────────────────────

function openEditModal(id, matches) {
  const m = matches.find(x => x.id === id);
  if (!m) return;

  document.getElementById('edit-match-id').value = id;
  document.getElementById('edit-team-a').value   = m.team_a;
  document.getElementById('edit-team-b').value   = m.team_b;
  document.getElementById('edit-date').value     = m.date;
  document.getElementById('edit-time').value     = m.time;
  document.getElementById('edit-status').value   = m.status;

  document.getElementById('edit-modal').style.display = 'flex';
}

document.getElementById('edit-modal-close').addEventListener('click', closeModal);
document.getElementById('edit-cancel').addEventListener('click', closeModal);
function closeModal() { document.getElementById('edit-modal').style.display = 'none'; }

document.getElementById('edit-save').addEventListener('click', async () => {
  const id = Number(document.getElementById('edit-match-id').value);
  const body = {
    team_a: document.getElementById('edit-team-a').value.trim(),
    team_b: document.getElementById('edit-team-b').value.trim(),
    date:   document.getElementById('edit-date').value,
    time:   document.getElementById('edit-time').value,
    status: document.getElementById('edit-status').value,
  };

  const res = await fetch(`/admin/api/match/${id}/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    showToast('Match updated.', 'success');
    closeModal();
    loadMatches();
  } else {
    const d = await res.json();
    showToast(d.error || 'Update failed.', 'error');
  }
});

// ── Delete match ──────────────────────────────────────────────────────────────

async function deleteMatch(id) {
  if (!confirm('Delete this match and all its events? This cannot be undone.')) return;

  const res = await fetch(`/admin/api/match/${id}/delete`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Match deleted.', 'success');
    loadMatches();
  } else {
    showToast('Delete failed.', 'error');
  }
}

// ── Refresh button ────────────────────────────────────────────────────────────

document.getElementById('btn-refresh-matches').addEventListener('click', loadMatches);

// ── Logout ────────────────────────────────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
  const ok = await checkAuth();
  if (!ok) return;
  await loadSports();
  await loadMatches();
})();
