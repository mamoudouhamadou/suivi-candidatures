# Feuille de route : Suivi de candidatures

## Objectif
Une application web pour suivre ses candidatures de stage : entreprise, poste, statut, dates, relances et statistiques.

## Architecture

```
suivi-candidatures/
├── backend/          API REST : Node.js + TypeScript + Express
│   ├── prisma/
│   │   ├── schema.prisma   description des tables
│   │   └── migrations/     historique SQL des changements de la base
│   ├── src/
│   │   ├── app.ts          crée l'application Express (sans démarrer le serveur → testable)
│   │   ├── server.ts       démarre le serveur ; choisit PostgreSQL ou la mémoire
│   │   ├── candidature.ts  modèle de données + validation (Zod)
│   │   ├── utilisateur.ts  comptes : validation de l'inscription et de la connexion
│   │   ├── auth/           jetons JWT + middleware qui protège les routes
│   │   ├── depots/         stockage : interface + version mémoire + version PostgreSQL
│   │   └── routes/         une route = un groupe d'URL
│   └── tests/
│       ├── unit/           routes testées avec le stockage en mémoire (rapide)
│       └── integration/    stockage testé contre un vrai PostgreSQL
├── docker/           script qui crée la base de test
├── frontend/         (étape 4) React + TypeScript + Vite
├── docker-compose.yml PostgreSQL (étape 2) ; toute l'application (étape 5)
└── .github/workflows/ (étape 6) intégration continue
```

```
Navigateur (React) ──HTTP/JSON──> API Express ──Prisma──> PostgreSQL
```

## Étapes

| # | Étape | Ce que tu apprends | État |
|---|---|---|---|
| 1 | API minimale : `/api/sante`, liste et création de candidatures en mémoire, tests | Express, TypeScript, REST, validation, tests | ✅ |
| 2 | Base de données PostgreSQL avec Prisma (Docker) ; modifier et supprimer | ORM, migrations, SQL, CRUD | ✅ |
| 3 | Comptes utilisateurs : inscription, connexion, JWT, mots de passe hachés | Authentification, sécurité | ✅ |
| 4 | Interface React : liste, formulaire, tableau kanban par statut | React, état, appels API | ⬜ |
| 5 | Docker Compose : toute l'application en une commande | Conteneurs | ⬜ |
| 6 | GitHub Actions : tests à chaque push | CI/CD | ⬜ |
| 7 | Statistiques, rappels de relance, déploiement en ligne | Finition, cloud | ⬜ |

Après chaque étape : lire le journal (`docs/JOURNAL.md`), refaire les commandes soi-même, faire un commit.
