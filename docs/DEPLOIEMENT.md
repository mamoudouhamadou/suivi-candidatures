# Déploiement : Neon, Render et GitHub Actions

```
git push (main)
   │
   ▼
GitHub Actions ── API ✓ ── Interface ✓ ── Docker ✓ ──► job « deploy »
                                                          │ 1. prisma migrate deploy ──► Neon (PostgreSQL)
                                                          │ 2. crochet de déploiement ──► Render construit l'image
                                                          │ 3. attente de la nouvelle version (/api/sante)
                                                          ▼ 4. test de fumée
                                       https://suivi-candidatures-xxxx.onrender.com
```

| Service | Rôle |
|---|---|
| **Neon** | Base PostgreSQL (offre gratuite : 1 Go, sans expiration) |
| **Render** | Exécution de l'image Docker (API et interface) ; l'offre gratuite se met en veille après 15 minutes d'inactivité |
| **GitHub Actions** | Tests, migrations, puis déploiement |

Render n'exécute pas de commande avant un déploiement dans son offre gratuite : les migrations sont donc appliquées par la CI avant de déclencher Render. Le déploiement automatique de Render est désactivé (`autoDeployTrigger: off`) afin qu'aucune version ne soit publiée sans que tous les tests aient réussi.

## 1. Base de données (Neon)
1. Créer un projet : PostgreSQL 17, région AWS US East 2 (Ohio).
2. Dans *Connect*, conserver le *connection pooling* et copier la chaîne de connexion :
   `postgresql://<utilisateur>:<mot de passe>@<hôte>-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`

## 2. Application (Render)
1. **New → Blueprint**, puis sélectionner ce dépôt : Render lit `render.yaml`.
2. Renseigner `DATABASE_URL` avec la chaîne de connexion Neon. `JWT_SECRET` est généré par Render.
3. Après le premier déploiement, relever l'adresse publique du service et son **Deploy Hook** (*Settings → Deploy Hook*).

## 3. Secrets et variables GitHub
*Settings → Secrets and variables → Actions* :

| Type | Nom | Valeur |
|---|---|---|
| Secret | `DATABASE_URL` | Chaîne de connexion Neon |
| Secret | `RENDER_DEPLOY_HOOK_URL` | Deploy Hook de Render |
| Variable | `URL_PRODUCTION` | Adresse publique, sans `/` final |
| Variable | `DEPLOIEMENT_ACTIF` | `true` |

## 4. Déploiement
Chaque push sur `main` déclenche le job **Déploiement** une fois les autres jobs réussis.

## Dépannage
| Symptôme | Cause probable |
|---|---|
| Le job *deploy* est ignoré | `DEPLOIEMENT_ACTIF` ne vaut pas `true`, ou l'événement n'est pas un push sur `main` |
| « Can't reach database server » pendant les migrations | Secret `DATABASE_URL` incorrect |
| Première réponse lente | Réveil de l'instance gratuite (environ 1 minute) |
