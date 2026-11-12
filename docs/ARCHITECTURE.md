# Architecture

Application web de suivi de candidatures (stages et emplois) : une API REST en TypeScript, une interface React et une base PostgreSQL.

## Vue d'ensemble

```
Navigateur (React) ──HTTP/JSON──> API Express ──Prisma──> PostgreSQL
```

| Environnement | Composition |
|---|---|
| Développement local | Vite (port 5173) relaie `/api` vers l'API Express (port 3000) ; PostgreSQL dans Docker |
| Docker Compose | `db` (PostgreSQL) → `migrate` (migrations Prisma) → `api` (Express) → `web` (nginx : interface + relais `/api`) |
| Production | Un seul conteneur (`Dockerfile` à la racine) : Express sert l'API et l'interface compilée ; base PostgreSQL hébergée chez Neon |

## Structure du dépôt

```
suivi-candidatures/
├── backend/                 API REST : Node.js, TypeScript, Express
│   ├── prisma/
│   │   ├── schema.prisma    modèle de données
│   │   └── migrations/      migrations SQL versionnées
│   ├── src/
│   │   ├── app.ts           construction de l'application Express (testable sans serveur)
│   │   ├── server.ts        démarrage et choix du stockage (PostgreSQL ou mémoire)
│   │   ├── candidature.ts   modèle et validation (Zod)
│   │   ├── utilisateur.ts   validation de l'inscription et de la connexion
│   │   ├── auth/            émission et vérification des jetons JWT, middleware
│   │   ├── depots/          couche d'accès aux données : interface, mémoire, Prisma
│   │   └── routes/          routes HTTP
│   └── tests/
│       ├── unit/            tests des routes (stockage en mémoire)
│       └── integration/     tests de la couche Prisma sur PostgreSQL
├── frontend/                Interface : React, TypeScript, Vite
│   └── src/
│       ├── api.ts           client HTTP (jeton, JSON, erreurs)
│       ├── auth.tsx         contexte d'authentification
│       ├── useCandidatures.ts état et opérations sur les candidatures
│       ├── composants/      connexion, tableau de bord, kanban, formulaire
│       └── tests/           tests des composants (Vitest, Testing Library)
├── docker/                  initialisation de la base de test
├── docker-compose.yml       application complète en local
├── Dockerfile               image de production (un seul conteneur)
├── render.yaml              infrastructure Render (Blueprint)
└── .github/                 intégration continue et Dependabot
```

## Choix techniques

| Sujet | Choix | Raison |
|---|---|---|
| Accès aux données | Interface `DepotCandidatures` avec deux implémentations (mémoire, Prisma) | Routes indépendantes du stockage ; tests unitaires rapides sans base |
| Validation | Zod, côté serveur | Les données reçues sont vérifiées à l'exécution ; les types TypeScript en sont déduits |
| Schéma | Migrations Prisma versionnées | Évolution du schéma reproductible dans tous les environnements |
| Authentification | JWT (HS256, 24 h), mots de passe hachés avec bcrypt | API sans état ; aucun mot de passe stocké en clair |
| Autorisation | Filtre par utilisateur dans chaque requête | Un utilisateur n'accède qu'à ses propres candidatures (404 sinon) |
| Sécurité HTTP | helmet (CSP, HSTS, anti-clickjacking), limite de tentatives sur `/api/auth` | Protection contre le XSS, le clickjacking et la force brute |
| Erreurs | Réponses JSON homogènes, sans détails internes | Aucune fuite d'information en cas d'erreur serveur |
| Interface | React 19, contexte d'authentification, hook de données | Composants simples, logique regroupée et testable |

## Tests

| Niveau | Outil | Portée |
|---|---|---|
| Unitaires (API) | Vitest, Supertest | Routes, validation, authentification, sécurité HTTP |
| Intégration (API) | Vitest, PostgreSQL | Couche Prisma, contraintes et isolation des données |
| Composants (interface) | Vitest, Testing Library | Connexion, session, kanban, formulaire |
| Bout en bout | Docker Compose, curl | Application complète : inscription, création, autorisations, en-têtes |

## Intégration et déploiement continus

À chaque push et pull request, GitHub Actions exécute :
1. **API** : vérification des types, tests unitaires, migrations puis tests d'intégration, compilation ;
2. **Interface** : tests des composants et compilation ;
3. **Docker** : construction des images, démarrage complet et test de bout en bout ;
4. **Déploiement** (branche `main` seulement) : migrations sur la base de production, déclenchement de Render, attente de la nouvelle version (`/api/sante`) et test de fumée.

Dependabot propose les mises à jour des dépendances (versions mineures regroupées, images Docker sur une version LTS de Node).

Voir [DEPLOIEMENT.md](DEPLOIEMENT.md) pour la configuration de l'hébergement.
