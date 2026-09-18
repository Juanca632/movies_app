from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from main_thread import MainThread

App = MainThread()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:    
        print("Application is beginning...")
        App.start()  # Start the thread
        print("Application is starting up...")
        yield  # This is where the app runs
    finally:
        print("Application is shutting down...")
        App.stop_thread()


app = FastAPI(lifespan=lifespan)

# Shared state accessible to all routers via request.app.state
app.state.App = App

# CORS configuration
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
from routers.movies import router as movies_router
from routers.series import router as series_router
from routers.stars import router as stars_router

app.include_router(movies_router)
app.include_router(series_router)
app.include_router(stars_router)