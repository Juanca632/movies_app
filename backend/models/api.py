
from backend.models.models import Star, Movie, Serie
from config import THE_MOVIE_DB_API_KEY, THE_MOVIE_DB_API_URL

class Api():

    API_URL = THE_MOVIE_DB_API_URL
    API_KEY = THE_MOVIE_DB_API_KEY

    def __init__(self):
        pass

    def get_movies(self) -> list[Movie]:
        pass

    def get_series(self) -> list[Serie]:
        pass

    def get_stars(self) -> list[Star]:
        pass

