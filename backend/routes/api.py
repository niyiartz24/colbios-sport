from flask import Blueprint, jsonify, request
from models.database import Match, Event
from services.sport_config import get_all_sports, get_sport_config

api_bp = Blueprint('api', __name__)


@api_bp.route('/matches', methods=['GET'])
def get_matches():
    status = request.args.get('status')
    query = Match.query
    if status:
        query = query.filter_by(status=status)
    matches = query.order_by(Match.date.asc(), Match.time.asc()).all()
    return jsonify([m.to_dict() for m in matches])


@api_bp.route('/match/<int:match_id>', methods=['GET'])
def get_match(match_id):
    match = Match.query.get_or_404(match_id)
    events = (
        Event.query
        .filter_by(match_id=match_id)
        .order_by(Event.created_at.asc())
        .all()
    )
    data = match.to_dict()
    data['events'] = [e.to_dict() for e in events]
    return jsonify(data)


@api_bp.route('/sports', methods=['GET'])
def get_sports():
    return jsonify(get_all_sports())


@api_bp.route('/sport-config/<string:sport_type>', methods=['GET'])
def sport_config(sport_type):
    config = get_sport_config(sport_type)
    if not config:
        return jsonify({'error': 'Sport not found'}), 404
    return jsonify(config)
