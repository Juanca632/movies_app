#!/bin/bash

# Define the paths to the frontend and backend directories
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"

# Start the backend
echo "Starting backend..."
cd "$BACKEND_DIR" || exit 1  # Navigate to the backend directory; exit if it fails
source myvenv/bin/activate  # Activate the Python virtual environment
uvicorn main:app --reload &  # Run the FastAPI backend in development mode

# Start the frontend
echo "Starting frontend..."
cd "../$FRONTEND_DIR" || exit 1  # Navigate to the frontend directory; exit if it fails
npm run dev &  # Run the frontend development server

echo "Application started 🚀"
wait  # Keep the script running until the processes stop
