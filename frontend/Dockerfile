# Build Stage: Install dependencies and generate the `dist/` folder
FROM node:18 AS build
WORKDIR /app

# Copy the package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Build the frontend application
RUN npm run build

# Serve Stage: Use Nginx to serve the static files
FROM nginx:alpine

# Copy the generated `dist/` folder from the build stage into Nginx's default directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 for serving the application
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
