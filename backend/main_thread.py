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

    def stop_thread(self):
        """Stop the thread"""
        self._stop_event.set()
        self.API_movies.stop_thread()