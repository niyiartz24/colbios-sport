from flask import Blueprint, jsonify, request, session
from functools import wraps
from models.database import db, Match, Event
from services.sport_config import (
    SPORT_CONFIG, get_event_value, is_own_goal_event, get_all_sports
)

admin_api_bp = Blueprint('admin_api', __name__)


# ── Auth guard ──────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


# ── Match CRUD ───────────────────────────────────────────────────────────────

@admin_api_bp.route('/matches', methods=['GET'])
@login_required
def list_matches():
    matches = (
        Match.query
        .order_by(Match.date.desc(), Match.time.desc())
        .all()
    )
    return jsonify([m.to_dict() for m in matches])


@admin_api_bp.route('/match/create', methods=['POST'])
@login_required
def create_match():
    data = request.get_json() or {}
    required = ['sport_type', 'team_a', 'team_b', 'date', 'time']
    for field in required:
        if not data.get(field, '').strip():
            return jsonify({'error': f'Field "{field}" is required'}), 400

    if data['sport_type'] not in SPORT_CONFIG:
        return jsonify({'error': f'Unknown sport: {data["sport_type"]}'}), 400

    match = Match(
        sport_type=data['sport_type'],
        team_a=data['team_a'].strip(),
        team_b=data['team_b'].strip(),
        date=data['date'].strip(),
        time=data['time'].strip(),
        status='upcoming',
        score_a=0,
        score_b=0,
    )
    db.session.add(match)
    db.session.commit()
    return jsonify(match.to_dict()), 201


@admin_api_bp.route('/match/<int:match_id>/update', methods=['PUT'])
@login_required
def update_match(match_id):
    match = Match.query.get_or_404(match_id)
    data = request.get_json() or {}

    if 'team_a' in data and data['team_a'].strip():
        match.team_a = data['team_a'].strip()
    if 'team_b' in data and data['team_b'].strip():
        match.team_b = data['team_b'].strip()
    if 'date' in data and data['date'].strip():
        match.date = data['date'].strip()
    if 'time' in data and data['time'].strip():
        match.time = data['time'].strip()
    if 'status' in data and data['status'] in ('upcoming', 'live', 'finished'):
        match.status = data['status']

    db.session.commit()
    return jsonify(match.to_dict())


@admin_api_bp.route('/match/<int:match_id>/status', methods=['POST'])
@login_required
def update_status(match_id):
    match = Match.query.get_or_404(match_id)
    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ('upcoming', 'live', 'finished'):
        return jsonify({'error': 'Invalid status'}), 400
    match.status = new_status
    db.session.commit()
    return jsonify(match.to_dict())


@admin_api_bp.route('/match/<int:match_id>/delete', methods=['DELETE'])
@login_required
def delete_match(match_id):
    match = Match.query.get_or_404(match_id)
    db.session.delete(match)
    db.session.commit()
    return jsonify({'success': True})


@admin_api_bp.route('/match/<int:match_id>/reset-score', methods=['POST'])
@login_required
def reset_score(match_id):
    match = Match.query.get_or_404(match_id)
    match.score_a = 0
    match.score_b = 0
    db.session.commit()
    return jsonify(match.to_dict())


# ── Event system ─────────────────────────────────────────────────────────────

@admin_api_bp.route('/event/add', methods=['POST'])
@login_required
def add_event():
    data = request.get_json() or {}

    match_id = data.get('match_id')
    event_type = data.get('event_type', '').strip()
    team = data.get('team', '').strip()

    if not match_id or not event_type or team not in ('a', 'b'):
        return jsonify({'error': 'match_id, event_type, and team (a/b) are required'}), 400

    match = Match.query.get_or_404(match_id)
    val = get_event_value(match.sport_type, event_type)
    own_goal = is_own_goal_event(match.sport_type, event_type)

    event = Event(
        match_id=match_id,
        event_type=event_type,
        team=team,
        player_name=data.get('player_name', '').strip(),
        minute_or_time=data.get('minute_or_time', '').strip(),
        value=val,
    )
    db.session.add(event)

    # Update score
    if val > 0:
        if own_goal:
            # Own goal: credits the *opposite* team
            if team == 'a':
                match.score_b += val
            else:
                match.score_a += val
        else:
            if team == 'a':
                match.score_a += val
            else:
                match.score_b += val

    db.session.commit()
    return jsonify({'event': event.to_dict(), 'match': match.to_dict()}), 201


@admin_api_bp.route('/event/<int:event_id>/delete', methods=['DELETE'])
@login_required
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    match = Match.query.get(event.match_id)

    # Reverse score contribution
    if event.value > 0 and match:
        own_goal = is_own_goal_event(match.sport_type, event.event_type)
        if own_goal:
            if event.team == 'a':
                match.score_b = max(0, match.score_b - event.value)
            else:
                match.score_a = max(0, match.score_a - event.value)
        else:
            if event.team == 'a':
                match.score_a = max(0, match.score_a - event.value)
            else:
                match.score_b = max(0, match.score_b - event.value)

    db.session.delete(event)
    db.session.commit()
    return jsonify({'success': True, 'match': match.to_dict() if match else {}})


@admin_api_bp.route('/match/<int:match_id>/events', methods=['GET'])
@login_required
def get_match_events(match_id):
    Match.query.get_or_404(match_id)
    events = (
        Event.query
        .filter_by(match_id=match_id)
        .order_by(Event.created_at.desc())
        .all()
    )
    return jsonify([e.to_dict() for e in events])


# ── Utility ──────────────────────────────────────────────────────────────────

@admin_api_bp.route('/sports', methods=['GET'])
@login_required
def sports():
    return jsonify(get_all_sports())
