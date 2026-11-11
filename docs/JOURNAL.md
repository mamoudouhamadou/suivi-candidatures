# Journal d'apprentissage

Pour chaque étape : ce qui a été fait, les notions à comprendre, et les questions qu'un recruteur pourrait poser. Lis le code fichier par fichier dans l'ordre indiqué.

---

## Étape 1 : API minimale

### Ordre de lecture
1. `backend/package.json` : les dépendances et les scripts (`npm run dev`, `npm test`).
2. `backend/src/candidature.ts` : le modèle de données.
3. `backend/src/routes/candidatures.ts` : les routes.
4. `backend/src/app.ts`, puis `backend/src/server.ts`.
5. `backend/tests/candidatures.test.ts` : les tests.

### Notions clés
- **API REST :** le client demande une *ressource* (`/api/candidatures`) avec un *verbe* HTTP. `GET` lit, `POST` crée ; `PUT`/`PATCH` modifient et `DELETE` supprime (à l'étape 2).
- **Codes HTTP :** `200` OK, `201` créé, `400` données invalides (la faute du client), `404` introuvable, `500` erreur du serveur.
- **Express :** une bibliothèque qui associe une URL et un verbe à une fonction `(req, res) => …`. `req.body` contient les données envoyées et `req.params.id` la partie variable de l'URL.
- **Middleware :** une fonction qui s'exécute avant les routes. `express.json()` transforme le texte JSON reçu en objet.
- **TypeScript ou Zod ?** TypeScript vérifie les types *avant* l'exécution, mais ne voit pas ce que le client envoie vraiment. Zod valide les données *pendant* l'exécution. `z.infer` déduit le type TypeScript du schéma : la règle n'est écrite qu'une fois.
- **Pourquoi séparer `app.ts` et `server.ts` ?** Les tests utilisent l'app directement avec Supertest, sans ouvrir de port réseau. C'est plus rapide et plus fiable.
- **Indépendance des tests :** `beforeEach` recrée une app vide avant chaque test. Un test ne dépend jamais d'un autre.
- **Limite connue :** les données sont stockées en mémoire, donc perdues au redémarrage. L'étape 2 corrige ça avec PostgreSQL.

### Questions possibles en entrevue
- *Quelle est la différence entre 400 et 404 ?* → 400 : la requête est mal formée ; 404 : la ressource n'existe pas.
- *Pourquoi valider côté serveur si le formulaire valide déjà ?* → N'importe qui peut appeler l'API directement (curl, Postman). Le serveur ne doit jamais faire confiance au client.
- *Comment avez-vous testé votre API ?* → Tests d'intégration avec Vitest et Supertest : un cas valide, des cas invalides et un cas « introuvable ».

### Exercices pour toi (avant l'étape 2)
1. Lance `npm run dev` et appelle l'API avec `curl` ou l'extension *REST Client* de VS Code.
2. Ajoute un champ facultatif `ville` au schéma, puis un test qui le vérifie.
3. Ajoute la route `GET /api/candidatures?statut=envoyee`, qui filtre par statut (indice : `req.query.statut`), avec son test.

---

## Étape 2 : PostgreSQL, Prisma, modifier et supprimer

### Ordre de lecture
1. `docker-compose.yml` : PostgreSQL dans un conteneur.
2. `backend/prisma/schema.prisma`, puis `prisma/migrations/…_init/migration.sql` : le SQL généré à partir du schéma.
3. `backend/src/depots/depot.ts` : l'interface (le « contrat »).
4. `depot-memoire.ts`, puis `depot-prisma.ts` : deux façons de respecter ce contrat.
5. `backend/src/routes/candidatures.ts` : les nouvelles routes `PATCH` et `DELETE`.
6. `backend/src/server.ts` : le choix entre PostgreSQL et la mémoire.
7. `tests/unit/` et `tests/integration/`.

### Notions clés
- **Docker :** un conteneur fait tourner PostgreSQL sans l'installer sur Windows. `docker compose up -d` le démarre et `docker compose down` l'arrête. Le *volume* `donnees_pg` garde les données entre deux démarrages.
- **ORM (Prisma) :** on décrit les tables dans `schema.prisma`. Prisma génère le SQL et un client TypeScript **typé** : `prisma.candidature.findMany()` au lieu de `SELECT * FROM "Candidature"`.
- **Migration :** un fichier SQL versionné qui fait évoluer la base. On ne modifie jamais une table à la main : on change le schéma, puis `npm run db:migrate` crée une nouvelle migration. Toute l'équipe applique les mêmes migrations dans le même ordre.
- **Patron « dépôt » (repository) et injection de dépendance :** les routes reçoivent un `DepotCandidatures` sans savoir s'il est en mémoire ou dans PostgreSQL. Avantages :
  1. les tests des routes restent rapides, sans base de données ;
  2. on pourrait changer de base (MySQL, MongoDB…) sans toucher aux routes.
- **CRUD et verbes HTTP :** Create = `POST`, Read = `GET`, Update = `PATCH` (modification partielle ; `PUT` remplacerait tout l'objet), Delete = `DELETE`. `204 No Content` signifie « réussi, rien à renvoyer ».
- **`null` ou absent dans un PATCH :** si un champ est absent, on n'y touche pas ; s'il vaut `null`, on l'efface. C'est pourquoi `versDate` traite trois cas : `undefined`, `null` et une date.
- **Tests unitaires ou tests d'intégration :** les tests unitaires vérifient la logique des routes de façon isolée (mémoire). Les tests d'intégration vérifient que le code fonctionne avec la vraie base. Ils utilisent une **base de test séparée**, parce qu'ils vident la table avant chaque test.
- **Gestionnaire d'erreurs :** une erreur imprévue (base de données arrêtée) donne un `500` générique. On ne renvoie jamais la trace de l'erreur au client, parce qu'elle donnerait des informations utiles à un attaquant.
- **`.env` :** la configuration (URL de la base) vit hors du code. Le fichier `.env` n'est jamais commité ; `.env.example` montre quoi y mettre.

### Questions possibles en entrevue
- *Pourquoi un ORM plutôt que du SQL direct ?* → Typage, protection contre l'injection SQL (requêtes paramétrées), migrations. Limite : pour des requêtes complexes, on écrit parfois du SQL brut.
- *Qu'est-ce qu'une injection SQL ?* → Du texte envoyé par l'utilisateur qui est interprété comme du SQL. Prisma passe les valeurs en paramètres, jamais collées dans la requête.
- *PATCH ou PUT ?* → PATCH modifie partiellement, PUT remplace la ressource entière.
- *Comment testez-vous le code qui parle à la base ?* → Avec des tests d'intégration sur une base PostgreSQL de test dans Docker, remise à zéro avant chaque test.
- *Pourquoi le patron dépôt ?* → Pour découpler la logique HTTP du stockage, ce qui la rend testable et facile à changer.

### Exercices pour toi
1. `npm run db:studio` ouvre Prisma Studio : regarde la table après avoir créé des candidatures avec l'API.
2. Ajoute un champ `ville String?` au schéma, lance `npm run db:migrate`, puis lis le SQL de la nouvelle migration.
3. Le filtre `?statut=` de l'étape 1 : ajoute une méthode `lister(statut?)` au dépôt et implémente-la dans **les deux** versions (mémoire et Prisma).
