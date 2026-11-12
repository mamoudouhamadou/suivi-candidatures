# Suivi de candidatures

[![CI](https://github.com/mamoudouhamadou/suivi-candidatures/actions/workflows/ci.yml/badge.svg)](https://github.com/mamoudouhamadou/suivi-candidatures/actions/workflows/ci.yml)

Application web full-stack pour suivre des candidatures de stage ou d'emploi : entreprise, poste, statut (à envoyer → envoyée → entrevue → offre/refus), dates et notes.

**🌐 Démo en ligne : https://suivi-candidatures-3vga.onrender.com**
<sub>Hébergement gratuit : la première visite peut prendre environ une minute (réveil du serveur).</sub>

Documentation : [architecture](docs/ARCHITECTURE.md) · [déploiement](docs/DEPLOIEMENT.md)

## Fonctionnalités
- Comptes utilisateurs : inscription et connexion ; chaque utilisateur ne voit que ses candidatures
- Tableau **kanban** par statut : glisser-déposer, ou liste déroulante (clavier et tactile)
- Création et modification dans une fenêtre modale, avec les erreurs affichées sous chaque champ
- Statistiques : nombre de candidatures, candidatures envoyées, taux d'entrevue
- Thème clair/sombre automatique, affichage adapté aux téléphones

## Stack
- **Frontend :** React 19, TypeScript, Vite
- **Backend :** Node.js, TypeScript, Express, Zod
- **Base de données :** PostgreSQL 17, Prisma ORM (migrations versionnées)
- **Sécurité :** mots de passe hachés (bcrypt), jetons JWT, données isolées par utilisateur, en-têtes helmet (CSP, HSTS), limite de tentatives de connexion
- **Tests :** Vitest, Supertest, Testing Library (unitaires, intégration, composants)
- **Conteneurs :** Docker (images multi-stage, utilisateur non-root), Docker Compose, nginx
- **CI/CD :** GitHub Actions (tests, images Docker, test de bout en bout, déploiement continu), Dependabot
- **Hébergement :** Render (Docker) et Neon (PostgreSQL)

## Lancer avec Docker

Prérequis : Docker.

```bash
cp .env.example .env          # définir JWT_SECRET (commande de génération dans le fichier)
docker compose up -d --build  # http://localhost:8080
```

Docker démarre PostgreSQL, applique les migrations, puis lance l'API et l'interface (nginx).

```
navigateur ──> web (nginx, port 8080) ──/api──> api (Express) ──> db (PostgreSQL)
                                                     ▲
                                  migrate (prisma migrate deploy, au démarrage)
```

Options (`.env`) :
- `PORT_WEB` : port local de l'application (8080 par défaut) ;
- `CA_SUPPLEMENTAIRE` : certificat racine d'un proxy qui inspecte le HTTPS, utilisé uniquement pendant la construction des images.

## Développement

Prérequis : Node.js 22 ou plus récent, Docker.

```bash
docker compose up -d db       # PostgreSQL seul (port 5433)
cd backend
cp .env.example .env          # définir JWT_SECRET
npm install
npx prisma migrate deploy     # création des tables
npm run dev                   # API sur http://localhost:3000
```

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev                   # interface sur http://localhost:5173 (/api relayé vers le port 3000)
```

Sans `DATABASE_URL`, l'API fonctionne avec un stockage en mémoire.

## Tests

```bash
cd backend
npm test                      # tests unitaires (aucune base requise)
npm run test:integration      # tests d'intégration (PostgreSQL requis)
cd ../frontend
npm test                      # tests des composants
```

## API

### Authentification

| Méthode | URL | Description | Réponses |
|---|---|---|---|
| POST | `/api/auth/inscription` | `{ courriel, motDePasse (8 car. min.), nom? }` → `{ utilisateur, jeton }` | 201, 400, 409 |
| POST | `/api/auth/connexion` | `{ courriel, motDePasse }` → `{ utilisateur, jeton }` | 200, 400, 401 |
| GET | `/api/auth/moi` | Utilisateur connecté 🔒 | 200, 401 |

🔒 En-tête requis : `Authorization: Bearer <jeton>` (validité : 24 h).

### Candidatures 🔒

| Méthode | URL | Description | Réponses |
|---|---|---|---|
| GET | `/api/sante` | État de l'API et version déployée (publique) | 200 |
| GET | `/api/candidatures` | Liste (la plus récente en premier) | 200 |
| GET | `/api/candidatures/:id` | Une candidature | 200, 404 |
| POST | `/api/candidatures` | Création (`entreprise` et `poste` obligatoires) | 201, 400 |
| PATCH | `/api/candidatures/:id` | Modification des champs envoyés (`null` efface) | 200, 400, 404 |
| DELETE | `/api/candidatures/:id` | Suppression | 204, 404 |

Champs : `entreprise`, `poste`, `statut` (`a_envoyer`, `envoyee`, `entrevue`, `offre`, `refusee`), `dateEnvoi` (AAAA-MM-JJ), `lien` (URL), `notes`.

```json
{ "entreprise": "Mirego", "poste": "Stagiaire développeur", "statut": "envoyee", "dateEnvoi": "2026-11-10" }
```
