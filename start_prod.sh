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

# Run the FastAPI backend in production mode
uvicorn main:app --reload &  # Adjust the number of workers as needed

# Move back to the root directory
cd ..

# Start the frontend in production mode
echo "Building frontend..."
cd "$FRONTEND_DIR" || exit 1  # Navigate to the frontend directory; exit if it fails

# Ensure serve is installed
if ! npx serve --version &> /dev/null; then
    echo "Installing serve..."
    npm install -g serve
fi

# Serve the frontend using `serve`
echo "Starting frontend..."
npx serve -s dist -l 3000 &  # Serves the static files from `dist` on port 3000

echo "Production application started 🚀"
wait  # Keep the script running until the processes stop
