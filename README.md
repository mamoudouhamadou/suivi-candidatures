# Suivi de candidatures

Application web full-stack pour suivre ses candidatures de stage ou d'emploi : entreprise, poste, statut (à envoyer → envoyée → entrevue → offre/refus), dates et notes.

> 🚧 En construction. Voir la [feuille de route](docs/FEUILLE_DE_ROUTE.md).

## Stack
- **Backend :** Node.js, TypeScript, Express, Zod
- **Base de données :** PostgreSQL 17 (Docker), Prisma ORM
- **Sécurité :** comptes utilisateurs, mots de passe hachés (bcrypt), jetons JWT, données isolées par utilisateur
- **Tests :** Vitest, Supertest (tests unitaires et tests d'intégration)
- **À venir :** React, GitHub Actions

## Démarrer

Prérequis : Node.js 22 ou plus récent, Docker Desktop.

```bash
docker compose up -d          # démarre PostgreSQL (port 5433)
cd backend
cp .env.example .env          # puis remplace JWT_SECRET (voir la commande dans le fichier)
npm install
npx prisma migrate deploy     # crée les tables
npm run dev                   # API sur http://localhost:3000
```

Sans Docker, `npm run dev` fonctionne aussi : retire `DATABASE_URL` du `.env`, et les données seront gardées en mémoire.

## Tests

```bash
npm test                      # tests unitaires (aucune base requise)
npm run test:integration      # tests contre PostgreSQL (Docker doit tourner)
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
