# Use a lightweight Nginx image
FROM nginx:alpine

# Copy the pre-built static files into Nginx's default directory
COPY dist /usr/share/nginx/html

# Expose port 80 for serving the application
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
