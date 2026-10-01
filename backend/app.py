from flask import Flask, send_from_directory
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')
ADMIN_DIR = os.path.join(BASE_DIR, 'admin')


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'colbios-sports-secret-key-2024'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "colbios.db")}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    from models.database import db
    db.init_app(app)

    from routes.auth import auth_bp
    from routes.api import api_bp
    from routes.admin_api import admin_api_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_api_bp, url_prefix='/admin/api')

    # --- Frontend routes ---
    @app.route('/')
    def index():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/match/<int:match_id>')
    def match_page(match_id):
        return send_from_directory(FRONTEND_DIR, 'match.html')

    @app.route('/frontend/<path:path>')
    def frontend_static(path):
        return send_from_directory(FRONTEND_DIR, path)

    # --- Admin routes ---
    @app.route('/admin/')
    @app.route('/admin/login')
    def admin_login_page():
        return send_from_directory(ADMIN_DIR, 'login.html')

    @app.route('/admin/dashboard')
    def admin_dashboard_page():
        return send_from_directory(ADMIN_DIR, 'dashboard.html')

    @app.route('/admin/live')
    def admin_live_page():
        return send_from_directory(ADMIN_DIR, 'live.html')

    @app.route('/admin/static/<path:path>')
    def admin_static(path):
        # path may be like "css/admin.css" or "js/dashboard.js"
        return send_from_directory(ADMIN_DIR, path)

    # --- DB init + seed admin ---
    with app.app_context():
        db.create_all()
        from models.database import User
        from werkzeug.security import generate_password_hash
        if not User.query.filter_by(username='admin').first():
            seed = User(
                username='admin',
                password=generate_password_hash('admin123')
            )
            db.session.add(seed)
            db.session.commit()

    return app
