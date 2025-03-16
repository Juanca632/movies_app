#!/bin/bash

# Define the paths to the frontend and backend directories
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"

# Start the backend in production mode
echo "Starting backend..."
cd "$BACKEND_DIR" || exit 1  # Navigate to the backend directory; exit if it fails

# Ensure virtual environment exists, create it if necessary
if [ ! -d "myvenv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv myvenv
fi

# Activate the virtual environment
source myvenv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Run the FastAPI backend in production mode without --reload
echo "Running backend (uvicorn)..."
uvicorn main:app --host 0.0.0.0 --port $PORT &  # Use the dynamic port provided by Railway

# Move back to the root directory
cd ..

# Build and start the frontend
echo "Building frontend..."
cd "$FRONTEND_DIR" || exit 1  # Navigate to the frontend directory; exit if it fails

# Ensure frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build the frontend
echo "Building frontend (vite)..."
npm run build

# Serve the frontend using `serve`
echo "Starting frontend..."
npx serve -s dist -l $PORT &  # Use the dynamic port provided by Railway

echo "Production application started 🚀"
wait  # Keep the script running until the processes stop
