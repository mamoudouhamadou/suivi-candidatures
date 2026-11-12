# Image de DÉPLOIEMENT : un seul conteneur qui sert l'API ET l'interface React.
# (Hébergement gratuit = un seul service. En local, docker-compose.yml garde nginx + API séparés.)
# Construire :  docker build -t suivi-candidatures .

# ---------- Étape 1 : compiler l'interface React ----------
FROM node:26-alpine AS interface
WORKDIR /interface
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=ca_supplementaire,required=false \
    if [ -s /run/secrets/ca_supplementaire ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_supplementaire; fi && \
    npm ci
COPY frontend/ ./
RUN npm run build

# ---------- Étape 2 : compiler l'API ----------
FROM node:26-alpine AS api
WORKDIR /app
COPY backend/package.json backend/package-lock.json backend/prisma.config.ts ./
COPY backend/prisma ./prisma
RUN --mount=type=secret,id=ca_supplementaire,required=false \
    if [ -s /run/secrets/ca_supplementaire ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_supplementaire; fi && \
    npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx prisma generate && npm run build

# ---------- Étape 3 : dépendances de production (voir backend/Dockerfile pour les options) ----------
FROM node:26-alpine AS deps-prod
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=secret,id=ca_supplementaire,required=false \
    if [ -s /run/secrets/ca_supplementaire ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_supplementaire; fi && \
    npm ci --omit=dev --legacy-peer-deps --ignore-scripts

# ---------- Étape 4 : image finale ----------
FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DOSSIER_STATIQUE=/app/public \
    DERRIERE_PROXY=1

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=api /app/dist ./dist
COPY --from=interface /interface/dist ./public
COPY backend/package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/sante').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
