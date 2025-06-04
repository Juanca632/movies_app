# FROM node:23-alpine as build
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

FROM node:23-alpine
RUN npm install -g serve
WORKDIR /app
COPY dist ./dist
CMD ["serve", "-s", "dist", "-l", "3000"]
