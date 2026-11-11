# Mise en ligne : Neon + Render + GitHub Actions

```
git push (main)
   │
   ▼
GitHub Actions ── API ✓ ── Interface ✓ ── Docker ✓ ──► job « deploy »
                                                          │ 1. prisma migrate deploy ──► Neon (PostgreSQL)
                                                          │ 2. crochet de déploiement ──► Render construit l'image
                                                          │ 3. attend que /api/sante annonce le nouveau commit
                                                          ▼ 4. test de fumée
                                       https://suivi-candidatures-xxxx.onrender.com
```

| Service | Rôle | Gratuit ? |
|---|---|---|
| **Neon** | Base PostgreSQL | Oui : 1 Go, sans expiration, pas de carte de crédit |
| **Render** | Exécute l'image Docker (API + interface) | Oui : s'endort après 15 minutes sans visite et se réveille en environ 1 minute |
| **GitHub Actions** | Tests, migrations, puis déploiement | Oui pour un dépôt public |

> Durée : environ 20 minutes. Tu crées les comptes **toi-même**, en te connectant avec GitHub.

---

## 1. Base de données : Neon
1. Va sur **neon.com** → *Sign up* → **Continue with GitHub**.
2. Crée un projet : nom `suivi-candidatures`, version **PostgreSQL 17**, région **AWS US East (Ohio)** (proche de Render Ohio).
3. Dans *Connect* (ou *Connection string*) : laisse **Pooled connection** coché et copie l'URL. Elle ressemble à :
   `postgresql://neondb_owner:••••@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Garde-la sous la main (étapes 2 et 3). ⚠️ C'est un **secret** : ne la mets jamais dans le code.

## 2. Application : Render
1. Va sur **render.com** → *Get Started* → **GitHub**, puis autorise Render à voir le dépôt `suivi-candidatures`.
2. **New → Blueprint** → choisis `suivi-candidatures`. Render lit `render.yaml` et prépare le service.
3. Il demande la valeur de **`DATABASE_URL`** : colle l'URL Neon. `JWT_SECRET` est généré automatiquement.
4. Clique sur **Apply**. Le premier déploiement prend quelques minutes.
5. Copie l'adresse publique du service, par exemple `https://suivi-candidatures-xxxx.onrender.com`.
6. Ouvre le service → **Settings → Deploy Hook** et copie l'URL secrète (`https://api.render.com/deploy/srv-…?key=…`).

> La première fois, les tables n'existent pas encore dans Neon : le site s'affiche, mais l'inscription échoue. L'étape 3 applique les migrations.

## 3. GitHub : secrets et variables
Dépôt → **Settings → Secrets and variables → Actions** :

| Onglet | Nom | Valeur |
|---|---|---|
| *Secrets* | `DATABASE_URL` | L'URL Neon |
| *Secrets* | `RENDER_DEPLOY_HOOK_URL` | Le *deploy hook* de Render |
| *Variables* | `URL_PRODUCTION` | L'adresse Render, **sans** `/` à la fin |
| *Variables* | `DEPLOIEMENT_ACTIF` | `true` |

Les **secrets** sont chiffrés et masqués dans les journaux. Les **variables** ne sont pas secrètes.

## 4. Premier déploiement
- Fais un commit et un push sur `main`, ou va dans **Actions → CI → Run workflow**. Attention : le job *deploy* ne s'exécute que sur un **push**.
- Le job **Déploiement (Neon + Render)** applique les migrations, déclenche Render et attend la nouvelle version.
- Ouvre l'adresse publique, crée ton compte… et mets le lien sur ton CV 🎉

## Dépannage
| Symptôme | Cause probable |
|---|---|
| Le job *deploy* n'apparaît pas | `DEPLOIEMENT_ACTIF` n'est pas `true`, ou ce n'est pas un push sur `main` |
| « Can't reach database server » pendant les migrations | Le secret `DATABASE_URL` est mal copié (il doit finir par `?sslmode=require`) |
| La page met une minute à s'afficher | Normal : le service gratuit se réveille |
| Inscription → « Erreur interne du serveur » | Migrations pas encore appliquées : relance le workflow sur `main` |
