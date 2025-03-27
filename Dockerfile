# Use a Python base image for the backend
FROM python:3.11 AS backend

# Set the working directory for the backend
WORKDIR /app

# Copy backend dependencies and install them
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the rest of the backend application code
COPY backend/ ./backend

# Expose the default port for the backend (8000)
EXPOSE 8000

# Use a Node.js base image for the frontend
FROM node:18 AS frontend

# Set the working directory for the frontend
WORKDIR /app

# Copy frontend dependencies and install them
COPY frontend/package.json ./frontend/package.json
COPY frontend/package-lock.json ./frontend/package-lock.json
RUN npm install --prefix ./frontend

# Copy the rest of the frontend application code
COPY frontend/ ./frontend

# Build the frontend using Vite
RUN npm run build --prefix ./frontend

# Expose the default port for the frontend (3000)
EXPOSE 3000

# Final command to run both backend and frontend using the start script
CMD ["./start_prod.sh"]
