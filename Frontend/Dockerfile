# Build del frontend operativo (React + Vite) → nginx sirviendo estáticos.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
# La API va por el mismo dominio vía nginx /api/ → relativo.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback: todas las rutas sirven index.html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / { try_files $uri $uri/ /index.html; }\n\
  location /assets/ { expires 30d; add_header Cache-Control "public, immutable"; }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
