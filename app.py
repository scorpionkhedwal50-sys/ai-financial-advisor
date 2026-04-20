import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flasgger import Swagger

from routes.user_routes import user_bp
from routes.report_routes import report_bp
from routes.chat_routes import chat_bp
from routes.goal_routes import goal_bp
from database.models import create_tables
from config import Config

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate limiter (shared across the app) ──────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "60 per hour"],
    storage_uri=Config.RATELIMIT_STORAGE_URI,
)


def create_app():
    Config.validate()          # fail fast if env vars are missing

    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Attach rate limiter
    limiter.init_app(app)

    # Init DB
    create_tables()

    # ── API key auth middleware ────────────────────────────────────────────
    @app.before_request
    def require_api_key():
        # Skip auth for Swagger UI, the home route, and preflight CORS requests
        if request.method == "OPTIONS":
            return
        open_paths = ("/", "/apidocs/", "/apispec.json", "/flasgger_static")
        if any(request.path.startswith(p) for p in open_paths):
            return
        if not request.path.startswith("/api"):
            return

        client_key = request.headers.get("X-API-Key", "")
        if client_key != Config.API_SECRET_KEY:
            logger.warning("Rejected request — bad API key from %s", request.remote_addr)
            return jsonify({"error": "Unauthorised — invalid or missing X-API-Key header"}), 401

    # ── Swagger ───────────────────────────────────────────────────────────
    swagger_config = {
        "headers": [],
        "specs": [{"endpoint": "apispec", "route": "/apispec.json",
                   "rule_filter": lambda rule: True,
                   "model_filter": lambda tag: True}],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs/",
    }
    Swagger(app, config=swagger_config)

    # ── Home ──────────────────────────────────────────────────────────────
    @app.route("/")
    def home():
        return "AI Financial Advisor Backend Running 🚀"

    # ── Blueprints ────────────────────────────────────────────────────────
    app.register_blueprint(user_bp,   url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api")
    app.register_blueprint(chat_bp,   url_prefix="/api")
    app.register_blueprint(goal_bp,   url_prefix="/api")

    logger.info("App ready — rate limiting and API-key auth active.")
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)