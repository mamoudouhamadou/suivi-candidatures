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

---

## Étape 3 : comptes utilisateurs et JWT

### Ordre de lecture
1. `prisma/schema.prisma`, puis la migration `…_utilisateurs` : la table `Utilisateur` et la **clé étrangère** `utilisateurId`.
2. `src/utilisateur.ts` : la validation de l'inscription et de la connexion.
3. `src/auth/jetons.ts`, puis `src/auth/middleware.ts`.
4. `src/routes/auth.ts` : l'inscription, la connexion et `/moi`.
5. `src/app.ts` : les routes publiques et les routes protégées.
6. `src/depots/` : chaque méthode reçoit maintenant `utilisateurId`.
7. `tests/unit/auth.test.ts`, puis le bloc « Isolation » de `candidatures.test.ts`.

### Notions clés
- **Authentification et autorisation :** l'*authentification*, c'est « qui es-tu ? » (connexion, jeton → `401` si absent ou invalide). L'*autorisation*, c'est « as-tu le droit ? » (une candidature d'un autre utilisateur).
- **Hachage du mot de passe (bcrypt) :** on ne stocke **jamais** le mot de passe, seulement un hachage. C'est une fonction à sens unique : on peut vérifier un mot de passe, mais pas le retrouver.
  - **Sel :** une valeur aléatoire ajoutée avant le hachage. Deux personnes avec le même mot de passe ont des hachages différents, ce qui rend les tables précalculées (*rainbow tables*) inutiles.
  - **Coût (12) :** bcrypt est lent **exprès**, environ 0,25 s par essai. Un utilisateur ne le remarque pas, mais un attaquant qui teste des milliards de mots de passe est bloqué. Dans les tests, le coût est de 4 pour aller vite.
  - Dans la base, on voit `$2b$12$…` : `2b` est la version de bcrypt, `12` le coût, puis viennent le sel et le hachage.
- **JWT :** `en-tête.contenu.signature`. Le serveur signe `{ sub: id, exp: expiration }` avec `JWT_SECRET`. Le contenu est **lisible** (essaie de coller un jeton sur jwt.io), mais **infalsifiable** sans le secret. Le serveur n'a rien à stocker : on dit que c'est *sans état* (*stateless*).
- **Middleware `exigerAuthentification` :** il lit `Authorization: Bearer <jeton>`, vérifie la signature et l'expiration, puis range l'id dans `res.locals`. Sans jeton valide → `401`, et la route n'est jamais exécutée.
- **Isolation des données :** chaque requête SQL filtre par `utilisateurId`. Si on demande la candidature d'un autre, on obtient `404` et non `403`, pour ne même pas révéler qu'elle existe.
- **Clé étrangère et `ON DELETE CASCADE` :** PostgreSQL garantit que chaque candidature pointe vers un utilisateur qui existe. Supprimer l'utilisateur supprime ses candidatures.

### Détails de sécurité (excellents en entrevue)
| Détail | Pourquoi |
|---|---|
| Même message pour « courriel inconnu » et « mauvais mot de passe » | Ne pas permettre de deviner quels courriels ont un compte (énumération) |
| Comparaison avec un hachage factice quand le courriel est inconnu | La réponse prend le même temps dans les deux cas (attaque temporelle) |
| `algorithms: ["HS256"]` imposé à la vérification | Bloque les jetons `alg: none` non signés (une faille connue des JWT) |
| Le serveur refuse de démarrer sans `JWT_SECRET` de 32 caractères ou plus | Un secret faible ou absent permettrait de fabriquer des jetons |
| `motDePasseHache` jamais renvoyé (`versPublic`) | Ne jamais exposer de données sensibles |
| Courriel en minuscules et sans espaces | « Ana@X.ca » et « ana@x.ca » sont le même compte |
| `409` si le courriel existe déjà | Code HTTP précis pour un conflit |
| Limite de 72 caractères pour le mot de passe | bcrypt ignore ce qui dépasse 72 octets |
| `express.json({ limit: "100kb" })` et `x-powered-by` désactivé | Refuser les corps énormes et ne pas annoncer la technologie utilisée |

**Le test a trouvé un vrai bogue :** « Ana@Exemple.ca » avec une espace à la fin était refusé, parce que le format était vérifié avant le nettoyage. La correction : `trim().toLowerCase().pipe(z.email())`. C'est un bon exemple à raconter avec la méthode C.A.R.

### Questions possibles en entrevue
- *Comment stockez-vous les mots de passe ?* → Hachés avec bcrypt (sel et coût de 12), jamais en clair ni chiffrés de façon réversible.
- *Quelle différence entre hachage et chiffrement ?* → Le hachage est à sens unique ; le chiffrement est réversible avec une clé.
- *Qu'y a-t-il dans votre JWT ? Peut-on le lire ?* → L'id de l'utilisateur et l'expiration. Oui, on peut le lire, mais pas le modifier sans le secret.
- *Où le client garde-t-il le jeton ?* → On en parlera à l'étape 4 : en mémoire ou dans `localStorage` (risque XSS), ou dans un cookie `HttpOnly` (risque CSRF). Chaque option a ses compromis.
- *Limite de votre approche ?* → On ne peut pas révoquer un JWT avant son expiration. Solutions : une durée courte avec un jeton de rafraîchissement, ou une liste de révocation. Il manque aussi une limite de tentatives de connexion (*rate limiting*).

### Exercices pour toi
1. Avec l'extension REST Client ou Postman : inscris-toi, copie le jeton, puis appelle `GET /api/candidatures` avec et sans l'en-tête.
2. Colle ton jeton sur **jwt.io** et lis son contenu. Change un caractère du jeton et rappelle l'API : tu obtiens `401`.
3. Ajoute une limite de tentatives sur `/api/auth/connexion` avec le paquet `express-rate-limit` (par exemple 5 essais par 15 minutes), avec son test.
