# Image de l'interface : on compile React avec Node, puis on sert les fichiers statiques avec nginx.
# Node n'est donc PAS présent dans l'image finale (seulement nginx + HTML/CSS/JS).

# ---------- Étape 1 : compilation ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Certificat racine facultatif (voir backend/Dockerfile)
RUN --mount=type=secret,id=ca_supplementaire,required=false \
    if [ -s /run/secrets/ca_supplementaire ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_supplementaire; fi && \
    npm ci
COPY . .
RUN npm run build

# ---------- Étape 2 : serveur web ----------
FROM nginx:1.31-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
