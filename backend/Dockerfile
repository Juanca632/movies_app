# Use an official Python image
FROM python:3.11

# Set the working directory
WORKDIR /app

# Copy dependencies and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose FastAPI default port
EXPOSE 8000

# Start FastAPI in development mode
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
