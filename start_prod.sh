#!/bin/bash

# Define the paths to the frontend and backend directories
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"

# Start the backend in production mode
echo "Starting backend..."
cd "$BACKEND_DIR" || exit 1  # Navigate to the backend directory; exit if it fails

# Ensure virtual environment is activated
# if [ -d "myvenv" ]; then
#     source myvenv/bin/activate
# else
#     echo "Error: Virtual environment not found. Make sure to create and activate it."
#     exit 1
# fi

# Run the FastAPI backend in production mode
uvicorn main:app --reload &  # Adjust the number of workers as needed

# Start the frontend in production mode
echo "Building frontend..."
cd "../$FRONTEND_DIR" || exit 1  # Navigate to the frontend directory; exit if it fails

# Ensure dependencies are installed
# if [ ! -d "node_modules" ]; then
#     echo "Installing frontend dependencies..."
#     npm install
# fi

# Build the frontend
# npm run build

# Serve the frontend using `serve`
echo "Starting frontend..."
npx serve -s dist -l 3000 &  # Serves the static files from `dist` on port 3000

echo "Production application started 🚀"
wait  # Keep the script running until the processes stop
