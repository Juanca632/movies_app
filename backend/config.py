from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv(".env") 

THE_MOVIE_DB_API_KEY = os.getenv("THE_MOVIE_DB_API_KEY")
THE_MOVIE_DB_API_URL = os.getenv("THE_MOVIE_DB_API_URL")