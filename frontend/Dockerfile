# Build Stage: Install dependencies and generate the `dist/` folder
FROM node:20 AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve Stage: Use Nginx to serve the static files
FROM nginx:alpine

# Copiar la configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar la app frontend
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
