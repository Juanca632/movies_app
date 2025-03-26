from threading import Thread,Event
from custom_print import custom_print, Printing_Types
from enum import Enum
import requests

#---------------------------------------- VARIABLES --------------------------------

WAIT_TIME_RECONNECT = 2

#-----------------------------------------------------------------------------------

class API(Enum):

    DISCONNECTED = 0
    CONNECTED = 1
    RECONNECTING = 2

class API_movies(Thread):

    API_URL = 'https://api.themoviedb.org/3'
    API_KEY = "639da1a2e37a179ed3bf73f6a3ec7c8b"


    def __init__(self):
        super().__init__()
        self._stop_event = Event()
        self._event_timer = Event()
        self.event = Event()
        self.session = requests.Session() 
        self.connection_state = API.DISCONNECTED


    def on_connect(self):
        """Attempt to connect to the API by making a test request"""
        url = f"{self.API_URL}/movie/popular?api_key={self.API_KEY}"
        try:
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()  # Raise an error if the response is not 200
            self.connection_state = API.CONNECTED
            data = response.json()
            # data = data["results"][:1]
            custom_print(f"Connection successful: ",level=Printing_Types.debug)  # Show the first movie
        except requests.exceptions.RequestException as e:
            custom_print(f"Error connecting to the API: {e}",level=Printing_Types.debug)
            custom_print("Retrying to connect again in 2 seconds:",level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING
            self.event.wait(WAIT_TIME_RECONNECT)
        
    def run(self):
        while not self._stop_event.is_set():
            if self.connection_state != API.CONNECTED:
                self.on_connect()
            if self.connection_state == API.CONNECTED:
                try: 
                    pass
                    # custom_print("Successfully connected to API theMoviedb",level=Printing_Types.debug)
                    # self._event_timer.wait(5)  
                    # self._event_timer.clear()  
                except:
                    custom_print("error",level=Printing_Types.debug)
                    self.connection_state = API.RECONNECTING

    def get_movies(self, url):
        
        try:
            # Make the GET request to the API
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()  # Check if the request was successful (status 200)
            
            # Parse the response JSON and extract the list of movies
            data = response.json()
            movies = data["results"]  # List of movies that are currently playing
            return movies  # Return the list of movies
        except requests.exceptions.Timeout:
            custom_print("The request timed out. No internet connection or the server is down.", level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING  # Set to reconnecting if there's a timeout
            return []
        except requests.exceptions.RequestException as e:
            # Handle any request errors (e.g., network issues, invalid API key)
            print(f"Error fetching 'now playing' movies: {e}")
            self.connection_state = API.RECONNECTING
            return []
    
    def stop_thread(self):
        """Stop the thread."""
        self._stop_event.set()


    ####################################### MOVIES ############################################

    def get_now_playing(self):
        """Fetch movies currently playing in theaters."""
        url = f"{self.API_URL}/movie/now_playing?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)


    def get_popular_movies(self):
        """Fetch popular movies."""
        url = f"{self.API_URL}/movie/popular?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)
    
    def get_top_rated_movies(self):
        """Fetch top rated movies."""
        url = f"{self.API_URL}/movie/top_rated?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)

    def get_upcoming_movies(self):
        """Fetch upcoming movies but remove those already in theaters."""
        url = f"{self.API_URL}/movie/upcoming?api_key={self.API_KEY}&language=en-US"
        upcoming_movies = self.get_movies(url)

        # Get the list of movies currently playing in theaters
        now_playing_movies = self.get_now_playing()
        now_playing_ids = {movie["id"] for movie in now_playing_movies}  # Use a set for faster lookups

        # Filter out upcoming movies that are already in the "now playing" list
        filtered_movies = [movie for movie in upcoming_movies if movie["id"] not in now_playing_ids]

        return filtered_movies

    def get_images_movie(self, movie_id):
        """Fetch images of a movie"""
        url = f"{self.API_URL}/movie/{movie_id}/images?api_key={self.API_KEY}"
        
        try:
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()
            data = response.json()
            
            return {
                "backdrops": data.get("backdrops", []),
                "posters": data.get("posters", [])
            }
        
        except requests.exceptions.RequestException as e:
            custom_print(f"Error fetching images for movie {movie_id}: {e}", level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING
            return {"error": "Could not fetch images"}

    def get_recommended_movies(self,movie_id):
        """Fetch recommended movies based on selected movie."""
        url = f"{self.API_URL}/movie/{movie_id}/recommendations?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)

    def transform_movie_credits(self, data):
        """
        Transforms the TMDb movie credits structure to what the frontend needs.
        """
        transformed_data = []

        for actor in data.get("cast", [])[:15]:
            transformed_actor = {
                "adult": actor.get("adult"),
                "gender": actor.get("gender"),
                "id": actor.get("id"),
                "known_for_department": actor.get("known_for_department"),
                "name": actor.get("name"),
                "original_name": actor.get("original_name"),
                "popularity": actor.get("popularity"),
                "profile_path": actor.get("profile_path"),
                "known_for": []  
            }
            transformed_data.append(transformed_actor)

        return transformed_data

    def get_credits_movies(self, movie_id):
        """Fetch credits of a movie (actors & crew)."""
        url = f"{self.API_URL}/movie/{movie_id}/credits?api_key={self.API_KEY}&language=en-US"
        try:
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()
            data = response.json()
            return self.transform_movie_credits(data)  

        except requests.exceptions.RequestException as e:
            custom_print(f"Error fetching credits for movie {movie_id}: {e}", level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING
            return {"error": "Could not fetch credits"}

    def get_watch_providers(self, movie_id, country_code="FR"):
        """Fetches watch providers for a specific country."""
        url = f"{self.API_URL}/movie/{movie_id}/watch/providers?api_key={self.API_KEY}&language=en-US"
        providers = self.get_movies(url)
        
        return providers.get(country_code, {}) 

    def get_details_movies(self, movie_id):
        """Fetch detailed information of a specific movie."""
        url = f"{self.API_URL}/movie/{movie_id}?api_key={self.API_KEY}&language=en-US"

        try:
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()  # Raise an error if the request was not successful

            data = response.json()  # Parse JSON response
            return data  # Return movie details

        except requests.exceptions.RequestException as e:
            custom_print(f"Error fetching details for movie {movie_id}: {e}", level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING
            return {"error": "Could not fetch movie details"}
    
    ####################################### ACTORS/ACTRESSES ############################################

    def get_trending_people(self):
        """Fetch trending movies."""
        url = f"{self.API_URL}/person/popular?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)

    ####################################### TV SHOWS ############################################

    def get_popular_tv(self):
        """Fetch popular TV shows."""
        url = f"{self.API_URL}/tv/popular?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)

    def get_top_rated_tv(self):
        """Fetch top rated TV shows."""
        url = f"{self.API_URL}/tv/top_rated?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)

    def get_recommended_tv(self,tv_id):
        """Fetch recommended Tv Shows based on selected Tv Show."""
        url = f"{self.API_URL}/tv/{tv_id}/recommendations?api_key={self.API_KEY}&language=en-US"
        return self.get_movies(url)

    def get_credits_tv(self, tv_id):
        """Fetch credits of a movie (actors & crew)."""
        url = f"{self.API_URL}/tv/{tv_id}/aggregate_credits?api_key={self.API_KEY}&language=en-US"
        try:
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()
            data = response.json()
            return self.transform_movie_credits(data)  

        except requests.exceptions.RequestException as e:
            custom_print(f"Error fetching credits for TV show {tv_id}: {e}", level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING
            return {"error": "Could not fetch credits"}

    def get_images_tv(self, tv_id):
        """Fetch images of a Tv Show"""
        url = f"{self.API_URL}/tv/{tv_id}/images?api_key={self.API_KEY}"
        
        try:
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()
            data = response.json()
            
            return {
                "backdrops": data.get("backdrops", []),
                "posters": data.get("posters", [])
            }
        
        except requests.exceptions.RequestException as e:
            custom_print(f"Error fetching images for the TV show {tv_id}: {e}", level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING
            return {"error": "Could not fetch images"}

    def get_watch_providers_tv(self, tv_id, country_code="FR"):
        """Fetches watch providers for a specific country."""
        url = f"{self.API_URL}/tv/{tv_id}/watch/providers?api_key={self.API_KEY}&language=en-US"
        providers = self.get_movies(url)
        
        return providers.get(country_code, {}) 

    def get_details_tv(self, tv_id):
        """Fetch detailed information of a specific TV show."""
        url = f"{self.API_URL}/tv/{tv_id}?api_key={self.API_KEY}&language=en-US"

        try:
            headers = {"accept": "application/json"}
            response = self.session.get(url, headers=headers, timeout=3)
            response.raise_for_status()  # Raise an error if the request was not successful

            data = response.json()  # Parse JSON response
            return data  # Return TV show details

        except requests.exceptions.RequestException as e:
            custom_print(f"Error fetching details for TV show {tv_id}: {e}", level=Printing_Types.debug)
            self.connection_state = API.RECONNECTING
            return {"error": "Could not fetch TV show details"}











