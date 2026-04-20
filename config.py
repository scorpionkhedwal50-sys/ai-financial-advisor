import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY")
    # Secret key clients must send as X-API-Key header to reach the API.
    # Set this in your .env file. If absent, the server refuses to start.
    API_SECRET_KEY   = os.getenv("API_SECRET_KEY")
    # Rate limiting storage (use "memory://" for dev, Redis URI for prod)
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    @classmethod
    def validate(cls):
        missing = [k for k in ("GEMINI_API_KEY", "API_SECRET_KEY") if not getattr(cls, k)]
        if missing:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing)}\n"
                "Add them to your .env file."
            )