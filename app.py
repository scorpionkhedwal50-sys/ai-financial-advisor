from flask import Flask
from flask_cors import CORS
from flasgger import Swagger

# Import routes
from routes.user_routes import user_bp
from routes.report_routes import report_bp
from routes.chat_routes import chat_bp
from routes.goal_routes import goal_bp

# Import DB setup
from database.models import create_tables


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Initialize DB
    create_tables()

    # Swagger config
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec',
                "route": '/apispec.json',
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs/"
    }

    Swagger(app, config=swagger_config)

    # Home route
    @app.route('/')
    def home():
        return "AI Financial Advisor Backend Running 🚀"

    # Register routes
    app.register_blueprint(user_bp, url_prefix='/api')
    app.register_blueprint(report_bp, url_prefix='/api')
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(goal_bp, url_prefix='/api')

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)