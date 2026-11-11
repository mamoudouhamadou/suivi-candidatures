# Image de l'API, construite en plusieurs étapes (« multi-stage build ») :
# les outils de compilation restent dans les premières étapes,
# l'image finale ne contient que le nécessaire pour exécuter → plus petite et plus sûre.

# ---------- Étape 1 : dépendances complètes + compilation ----------
FROM node:24-alpine AS build
WORKDIR /app

# On copie d'abord package*.json seuls : tant qu'ils ne changent pas,
# Docker réutilise la couche « npm ci » en cache (constructions beaucoup plus rapides).
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# Certificat racine facultatif (antivirus ou proxy d'entreprise qui inspecte le HTTPS) :
# monté comme « secret » le temps de cette commande seulement, jamais copié dans l'image.
RUN --mount=type=secret,id=ca_supplementaire,required=false \
    if [ -s /run/secrets/ca_supplementaire ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_supplementaire; fi && \
    npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# ---------- Étape 2 : dépendances de production seulement ----------
FROM node:24-alpine AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=dev           : pas de TypeScript, Vitest…
# --legacy-peer-deps   : n'installe pas automatiquement les « dépendances pairs ». Sinon npm ajoute le CLI
#                        « prisma » (pair de @prisma/client) avec Prisma Studio, React, etc. : 341 Mo au lieu de 89 Mo.
#                        Le CLI ne sert qu'aux migrations, faites par le service « migrate ».
#                        (Mesuré : --omit=peer n'a aucun effet ici.)
# --ignore-scripts     : saute le « postinstall » (prisma generate), le client est déjà compilé dans dist/
RUN --mount=type=secret,id=ca_supplementaire,required=false \
    if [ -s /run/secrets/ca_supplementaire ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_supplementaire; fi && \
    npm ci --omit=dev --legacy-peer-deps --ignore-scripts

# ---------- Étape 3 : image finale ----------
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production PORT=3000

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Ne jamais exécuter un serveur en tant que root dans un conteneur.
USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/sante').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.js"]
