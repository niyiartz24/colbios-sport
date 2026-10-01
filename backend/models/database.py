from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)


class Match(db.Model):
    __tablename__ = 'matches'
    id = db.Column(db.Integer, primary_key=True)
    sport_type = db.Column(db.String(50), nullable=False)
    team_a = db.Column(db.String(100), nullable=False)
    team_b = db.Column(db.String(100), nullable=False)
    score_a = db.Column(db.Integer, default=0, nullable=False)
    score_b = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(db.String(20), default='upcoming', nullable=False)  # upcoming | live | finished
    date = db.Column(db.String(20), nullable=False)
    time = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    events = db.relationship('Event', backref='match', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'sport_type': self.sport_type,
            'team_a': self.team_a,
            'team_b': self.team_b,
            'score_a': self.score_a,
            'score_b': self.score_b,
            'status': self.status,
            'date': self.date,
            'time': self.time,
        }


class Event(db.Model):
    __tablename__ = 'events'
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    team = db.Column(db.String(10), nullable=False)  # 'a' or 'b'
    player_name = db.Column(db.String(100), default='')
    minute_or_time = db.Column(db.String(20), default='')
    value = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'event_type': self.event_type,
            'team': self.team,
            'player_name': self.player_name or '',
            'minute_or_time': self.minute_or_time or '',
            'value': self.value,
            'created_at': self.created_at.strftime('%H:%M:%S') if self.created_at else '',
        }
