# Stage 1: Use Nginx to serve the static files
FROM nginx:alpine

# Copy the custom Nginx configuration (optional, if you have custom settings)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the pre-built static files (dist folder) from the local directory or GitHub
COPY dist/ /usr/share/nginx/html

# Expose port 80 (default HTTP port)
EXPOSE 80

# Start Nginx in the foreground (daemon off)
CMD ["nginx", "-g", "daemon off;"]
