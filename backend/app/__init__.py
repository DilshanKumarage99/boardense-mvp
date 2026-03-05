from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import os
from dotenv import load_dotenv
from datetime import timedelta

# Load .env from the same directory as this package (backend/)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///boardense.db')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    # Access token expiry (seconds or timedelta). Default to 1 hour for development.
    # You can override with env var JWT_ACCESS_TOKEN_EXPIRES (in seconds).
    try:
        ttl = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
        app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(seconds=ttl)
    except Exception:
        app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r'/api/*': {'origins': os.getenv('CORS_ORIGINS', '*')}}, supports_credentials=True)
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.companies import companies_bp
    from app.routes.documents import documents_bp
    from app.routes.analysis import analysis_bp
    from app.routes.reports import reports_bp
    from app.routes.sparring import sparring_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(companies_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(sparring_bp)
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    return app
