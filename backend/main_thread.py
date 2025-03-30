from threading import Thread, Event
from API_movies import API_movies

class MainThread (Thread):

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._stop_event = Event()
        self._event_timer = Event()
        self.API_movies:API_movies = None

    def run(self) -> None:
        while not self._stop_event.is_set():
            try:
                if (self.API_movies is None):
                    self.startApp()
                    print("Starting to run my app")

            except Exception as e:
                print(f"Exception message: {e}")

    def startApp(self):
        self.API_movies = API_movies()
        self.API_movies.start() 

    def now_playing(self):
        return self.API_movies.get_now_playing()

    def popular_movies(self):
        return self.API_movies.get_popular_movies()

    def top_rated_movies(self):
        return self.API_movies.get_top_rated_movies()

    def upcoming_movies(self):
        return self.API_movies.get_upcoming_movies()

    def trending_people(self):
        return self.API_movies.get_trending_people()

    def popular_tv(self):
        return self.API_movies.get_popular_tv()

    def top_rated_tv(self):
        return self.API_movies.get_top_rated_tv()

    def images_movie(self, movie_id):
        return self.API_movies.get_images_movie(movie_id)

    def recommended_movies(self,movie_id):
        return self.API_movies.get_recommended_movies(movie_id)

    def credits_movies(self, movie_id):
        return self.API_movies.get_credits_movies(movie_id)

    def watch_providers(self, movie_id):
        return self.API_movies.get_watch_providers(movie_id)

    def recommended_tv(self, tv_id):
        return self.API_movies.get_recommended_tv(tv_id)

    def credits_tv(self, tv_id):
        return self.API_movies.get_credits_tv(tv_id)

    def images_tv(self, tv_id):
        return self.API_movies.get_images_tv(tv_id)

    def watch_providers_tv(self, tv_id):
        return self.API_movies.get_watch_providers_tv(tv_id)

    def details_movies(self, movie_id):
        return self.API_movies.get_details_movies(movie_id)

    def details_tv(self, tv_id):
        return self.API_movies.get_details_tv(tv_id)

    def details_people(self, person_id):
        return self.API_movies.get_details_people(person_id)

    def movie_credits_people(self, person_id):
        return self.API_movies.get_movie_credits_people(person_id)

    def tv_credits_people(self, person_id):
        return self.API_movies.get_tv_credits_people(person_id)

    def stop_thread(self):
        """Stop the thread"""
        self._stop_event.set()
        self.API_movies.stop_thread()