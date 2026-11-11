# Suivi de candidatures

[![CI](https://github.com/mamoudouhamadou/suivi-candidatures/actions/workflows/ci.yml/badge.svg)](https://github.com/mamoudouhamadou/suivi-candidatures/actions/workflows/ci.yml)

Application web full-stack pour suivre ses candidatures de stage ou d'emploi : entreprise, poste, statut (à envoyer → envoyée → entrevue → offre/refus), dates et notes.

**🌐 Démo en ligne : https://suivi-candidatures-3vga.onrender.com**
<sub>Hébergement gratuit : la première visite peut prendre environ 1 minute (le serveur se réveille).</sub>

> 🚧 En construction. Voir la [feuille de route](docs/FEUILLE_DE_ROUTE.md).

## Fonctionnalités
- Comptes utilisateurs : inscription et connexion ; chacun ne voit que ses candidatures
- Tableau **kanban** par statut : glisser-déposer, ou liste déroulante pour le clavier et le tactile
- Création et modification dans une fenêtre modale, avec les erreurs affichées sous chaque champ
- Statistiques : nombre de candidatures, envoyées, taux d'entrevue
- Thème clair/sombre automatique et affichage adapté au téléphone

## Stack
- **Frontend :** React 19, TypeScript, Vite
- **Backend :** Node.js, TypeScript, Express, Zod
- **Base de données :** PostgreSQL 17 (Docker), Prisma ORM
- **Sécurité :** mots de passe hachés (bcrypt), jetons JWT, données isolées par utilisateur
- **Tests :** Vitest, Supertest, Testing Library (tests unitaires, d'intégration et de composants)
- **Conteneurs :** Docker (images multi-stage, utilisateur non-root), Docker Compose, nginx (reverse proxy et en-têtes de sécurité)
- **CI/CD :** GitHub Actions (types, tests unitaires, tests d'intégration avec PostgreSQL, build Docker et test de bout en bout à chaque push, puis déploiement continu), Dependabot
- **Hébergement :** Render (Docker) et Neon (PostgreSQL serverless) ; voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md)
- **Sécurité en production :** en-têtes helmet (CSP, anti-clickjacking), limite de tentatives de connexion (429)

## Lancer avec Docker (le plus simple)

Prérequis : Docker Desktop.

```bash
cp .env.example .env          # puis remplace JWT_SECRET (voir la commande dans le fichier)
docker compose up -d --build
```

Ouvre **http://localhost:8080**. Docker démarre PostgreSQL, applique les migrations, puis lance l'API et l'interface (nginx).

- Port 8080 déjà pris ? Ajoute `PORT_WEB=8081` dans `.env`.
- `npm ci` échoue avec `UNABLE_TO_VERIFY_LEAF_SIGNATURE` ? Un antivirus ou un proxy inspecte le HTTPS : indique son certificat racine dans `CA_SUPPLEMENTAIRE` (voir `.env.example`). Il sert seulement pendant la construction et n'est jamais copié dans les images.

Tailles des images : API ≈ 92 Mo, interface ≈ 26 Mo.

```
navigateur ──> web (nginx, port 8080) ──/api──> api (Express) ──> db (PostgreSQL)
                                                     ▲
                                  migrate (prisma migrate deploy, une fois au démarrage)
```

## Développer (rechargement automatique)

Prérequis : Node.js 22 ou plus récent, Docker Desktop.

```bash
docker compose up -d db       # démarre seulement PostgreSQL (port 5433)
cd backend
cp .env.example .env          # puis remplace JWT_SECRET (voir la commande dans le fichier)
npm install
npx prisma migrate deploy     # crée les tables
npm run dev                   # API sur http://localhost:3000
```

Dans un deuxième terminal :

```bash
cd frontend
npm install
npm run dev                   # interface sur http://localhost:5173
```

Ouvre http://localhost:5173 et crée un compte. En développement, Vite redirige `/api` vers l'API (port 3000).

Sans Docker, l'API fonctionne aussi : retire `DATABASE_URL` du `.env`, et les données seront gardées en mémoire.

## Tests

```bash
cd backend
npm test                      # tests unitaires de l'API (aucune base requise)
npm run test:integration      # tests contre PostgreSQL (Docker doit tourner)
cd ../frontend
npm test                      # tests des composants React
```

### Dépannage (Windows)
Si Docker Desktop affiche « The file cannot be accessed by the system » à propos d'un fichier `.sock` : quitte Docker Desktop et renomme le dossier qui contient ce fichier, par exemple `%LOCALAPPDATA%\Docker\run`. Docker en recréera un neuf au démarrage suivant.

## API

### Authentification

| Méthode | URL | Description | Réponses |
|---|---|---|---|
| POST | `/api/auth/inscription` | `{ courriel, motDePasse (8 car. min.), nom? }` → `{ utilisateur, jeton }` | 201, 400, 409 |
| POST | `/api/auth/connexion` | `{ courriel, motDePasse }` → `{ utilisateur, jeton }` | 200, 400, 401 |
| GET | `/api/auth/moi` | L'utilisateur connecté 🔒 | 200, 401 |

🔒 Envoyer l'en-tête `Authorization: Bearer <jeton>`. Le jeton est valide pendant 24 h.

### Candidatures 🔒 (chacun ne voit que les siennes)

| Méthode | URL | Description | Réponses |
|---|---|---|---|
| GET | `/api/sante` | Vérifie que l'API répond (publique) | 200 |
| GET | `/api/candidatures` | Liste (la plus récente en premier) | 200 |
| GET | `/api/candidatures/:id` | Une candidature | 200, 404 |
| POST | `/api/candidatures` | Crée (`entreprise` et `poste` obligatoires) | 201, 400 |
| PATCH | `/api/candidatures/:id` | Modifie les champs envoyés (`null` efface) | 200, 400, 404 |
| DELETE | `/api/candidatures/:id` | Supprime | 204, 404 |

Champs : `entreprise`, `poste`, `statut` (`a_envoyer`, `envoyee`, `entrevue`, `offre`, `refusee`), `dateEnvoi` (AAAA-MM-JJ), `lien` (URL), `notes`.

```json
{ "entreprise": "Mirego", "poste": "Stagiaire développeur", "statut": "envoyee", "dateEnvoi": "2026-11-10" }
```
