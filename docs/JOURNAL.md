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

---

## Étape 4 : interface React

### Ordre de lecture
1. `frontend/index.html`, puis `src/main.tsx` : React prend le contrôle de `<div id="racine">`.
2. `src/types.ts` : les mêmes formes de données que l'API.
3. `src/api.ts` : une seule fonction pour tous les appels HTTP.
4. `src/auth.tsx` : le **contexte** d'authentification.
5. `src/App.tsx` : connecté ou non ?
6. `src/composants/PageConnexion.tsx`.
7. `src/useCandidatures.ts`, puis `TableauDeBord.tsx`, `TableauKanban.tsx` et `FormulaireCandidature.tsx`.
8. `vite.config.ts` (le proxy), puis `src/tests/`.

### Notions clés
- **Composant :** une fonction qui retourne du JSX (du « HTML » dans du TypeScript). L'interface est un arbre de composants : `App` → `TableauDeBord` → `TableauKanban` → les cartes.
- **Props :** les paramètres qu'un parent passe à un enfant, par exemple `candidatures` et `onSupprimer`. Les données descendent, et les événements remontent par des fonctions (`onChangerStatut`).
- **État (`useState`) :** une valeur qui, quand elle change, fait **redessiner** le composant. On ne modifie jamais l'état directement : on crée une nouvelle liste (`liste.map(...)`, `[nouvelle, ...liste]`).
- **Effet (`useEffect`) :** du code qui s'exécute *après* l'affichage, par exemple pour charger les données au démarrage. La variable `annule` évite de mettre à jour un composant qui a disparu entre-temps.
- **Contexte (`createContext`, `useContext`) :** rend l'utilisateur connecté et la fonction `api` accessibles partout, sans les passer de parent en enfant à chaque niveau (*prop drilling*).
- **Hook personnalisé (`useCandidatures`) :** regroupe l'état et la logique réutilisables. Les composants restent simples et ne font qu'afficher.
- **Formulaire contrôlé :** la valeur de chaque `<input>` vient de l'état (`value={entreprise}`) et chaque frappe le met à jour (`onChange`). React est la seule « source de vérité ».
- **Proxy Vite :** en développement, le navigateur appelle `localhost:5173/api/…` et Vite transmet à `localhost:3000`. Pour le navigateur, c'est la même origine, donc pas de problème de **CORS**.
- **Accessibilité :** des `<label htmlFor>` reliés aux champs ; `aria-invalid` et `aria-describedby` pour les erreurs ; `role="alert"` pour que les lecteurs d'écran annoncent les messages. Le statut peut se changer au clavier avec la liste déroulante, pas seulement au glisser-déposer. Le `<dialog>` natif gère la touche Échap et le focus.
- **Sécurité côté client :**
  - React échappe automatiquement le texte affiché, donc une note qui contient `<script>` s'affiche comme du texte (protection XSS) ;
  - `rel="noopener noreferrer"` sur les liens externes ;
  - un `401` reçu déconnecte automatiquement.
- **Où garder le jeton ?** Ici dans `localStorage` : c'est simple, et la session survit au rechargement de la page. Le risque : un script malveillant injecté (XSS) pourrait le lire. L'alternative pro est un cookie `HttpOnly` (illisible par JavaScript), mais il faut alors se protéger contre le CSRF. C'est un compromis à savoir expliquer.

### Tests de composants
- **Testing Library** teste comme un utilisateur : on cherche par **rôle et texte** (`getByRole("button", { name: "Se connecter" })`), pas par classe CSS. Bonus : si le test trouve l'élément, il est accessible.
- **`vi.spyOn(globalThis, "fetch")`** remplace le réseau par une fausse API : on contrôle chaque réponse (succès, 401, 400 avec des détails).
- **`vi.fn()`** est un « espion » qui enregistre ses appels : `expect(onChangerStatut).toHaveBeenCalledWith(2, "offre")`.
- Un test a révélé que jsdom (le faux navigateur) ne connaît pas `dialog.showModal()`. On a ajouté une solution de repli dans le composant.

### Vérifié en vrai
Inscription, ajout avec le formulaire, rechargement de la page (la session est restaurée), changement de statut (enregistré dans PostgreSQL), affichage sur téléphone (sans débordement : le kanban défile de colonne en colonne). Quand on supprime le compte, l'application revient seule à la connexion. Deux bogues d'affichage sur téléphone ont été trouvés et corrigés : la carte de connexion débordait, et le bouton « Se déconnecter » passait sur deux lignes.

### Questions possibles en entrevue
- *Différence entre props et état ?* → Les props viennent du parent et sont en lecture seule ; l'état appartient au composant et peut changer.
- *Pourquoi un `key` dans les listes ?* → Pour que React reconnaisse chaque élément d'un affichage à l'autre (on utilise l'`id`, jamais l'index si la liste peut changer d'ordre).
- *Comment avez-vous géré l'authentification côté client ?* → Un contexte React qui garde l'utilisateur et le jeton, restaure la session au démarrage avec `/auth/moi` et déconnecte sur un `401`.
- *`localStorage` ou cookie `HttpOnly` ?* → Voir le compromis XSS/CSRF ci-dessus.
- *Comment testez-vous un composant qui appelle une API ?* → En remplaçant `fetch` par un mock (Vitest), puis en vérifiant ce qui s'affiche et ce qui a été envoyé.

### Exercices pour toi
1. Lance l'application (README, section « Démarrer »), crée ton compte et ajoute tes **vraies** candidatures de stage.
2. Ajoute un champ de recherche au-dessus du kanban, qui filtre par entreprise (indice : un `useState` et un `.filter()` avant de passer la liste au `TableauKanban`), avec son test.
3. Ajoute une confirmation plus jolie que `window.confirm` pour la suppression, en réutilisant `<dialog>`.

---

## Étape 5 : toute l'application dans Docker

### Ordre de lecture
1. `docker-compose.yml` : les 4 services et leur ordre de démarrage.
2. `backend/Dockerfile` et `backend/.dockerignore`.
3. `frontend/Dockerfile`, puis `frontend/nginx.conf`.
4. `.env.example` à la racine.

### Notions clés
- **Image ou conteneur :** une *image* est un modèle figé (comme une classe) ; un *conteneur* est une image en cours d'exécution (comme un objet). Le `Dockerfile` est la recette de l'image.
- **Couches et cache :** chaque instruction du Dockerfile crée une couche. On copie `package.json` **avant** le code source : tant que les dépendances ne changent pas, Docker réutilise la couche `npm ci` déjà construite, et les constructions suivantes prennent quelques secondes au lieu de quelques minutes.
- **Construction en plusieurs étapes (*multi-stage*) :**
  - l'API compile TypeScript dans l'étape `build`, puis l'image finale ne garde que `dist/` et les dépendances de **production** (pas TypeScript, Vitest ni le CLI Prisma) ;
  - l'interface est compilée avec Node, puis servie par **nginx** : Node n'est même pas dans l'image finale ;
  - résultat : des images plus petites, avec moins de code exposé aux failles.
- **Orchestration (`depends_on` + `condition`) :**
  `db` (en santé, `pg_isready`) → `migrate` (`prisma migrate deploy`, puis s'arrête) → `api` (en santé, `/api/sante`) → `web`.
  Sans ces conditions, l'API démarrerait avant que la base soit prête, ou avant que les tables existent.
- **Service de migration séparé :** il réutilise l'étape `build` (qui contient le CLI Prisma). L'image de l'API reste légère, et les migrations s'exécutent une seule fois, même si on lance plusieurs copies de l'API.
- **Réseau Docker :** dans Compose, les services se trouvent par leur **nom** : l'API joint `db:5432` et nginx joint `api:3000`. Seuls `web` (8080) et `db` (5433, sur `127.0.0.1` seulement) sont accessibles depuis ta machine. **L'API n'est pas exposée directement.**
- **nginx comme *reverse proxy* :** une seule adresse pour le navigateur. Les fichiers statiques sont servis directement, et `/api/…` est relayé vers le conteneur `api`. Comme c'est la même origine, il n'y a pas de CORS, comme avec le proxy de Vite en développement.
- **Configuration par variables d'environnement :** `JWT_SECRET` vient du `.env` à la racine (jamais commité). La syntaxe `${JWT_SECRET:?message}` fait **échouer** `docker compose` si la variable manque, plutôt que de démarrer sans sécurité.
- **Bonnes pratiques de sécurité :**
  - l'API tourne avec l'utilisateur `node`, pas `root` ;
  - `.dockerignore` empêche `.env` et `node_modules` d'entrer dans l'image ;
  - nginx envoie des en-têtes de sécurité (`Content-Security-Policy`, `X-Frame-Options: DENY` contre le *clickjacking*, `nosniff`) et cache sa version (`server_tokens off`) ;
  - PostgreSQL n'écoute que sur `127.0.0.1`.
- **`HEALTHCHECK` :** Docker appelle `/api/sante` toutes les 10 s. `docker compose ps` affiche `healthy` ou `unhealthy`, et `restart: unless-stopped` relance un conteneur qui plante.
- **Cache HTTP :** les fichiers `/assets/` ont une empreinte dans leur nom (`index-BX89VYhy.js`), donc on peut les garder en cache un an. `index.html` est toujours revérifié, ce qui fait voir immédiatement les nouvelles versions.

### Commandes utiles
| Commande | Effet |
|---|---|
| `docker compose up -d --build` | Construit et démarre tout → http://localhost:8080 |
| `docker compose ps` | État des services (`healthy`, etc.) |
| `docker compose logs -f api` | Suivre les journaux de l'API |
| `docker compose down` | Arrête tout (les données sont gardées) |
| `docker compose down -v` | Arrête **et efface** la base de données |
| `docker compose up -d db` | Seulement la base, pour développer avec `npm run dev` |
| `docker image ls suivi-candidatures*` | Taille des images |

### Problèmes rencontrés et résolus (excellentes histoires C.A.R.)
1. **`UNABLE_TO_VERIFY_LEAF_SIGNATURE` pendant `npm ci` dans Docker.**
   - *Diagnostic :* le certificat reçu dans le conteneur était émis par « Avast Web/Mail Shield Root ». L'antivirus inspecte le HTTPS. Windows lui fait confiance (Avast a configuré `NODE_EXTRA_CA_CERTS`), mais pas les conteneurs.
   - *Solution :* ne **pas** désactiver la vérification TLS. On passe plutôt le certificat comme **secret de build** (`RUN --mount=type=secret`), utilisé seulement pendant `npm ci` et jamais copié dans l'image. C'est configurable avec `CA_SUPPLEMENTAIRE`, et sans effet sur un ordinateur sans antivirus.
2. **`npm ci` : « package.json and package-lock.json are not in sync » (interface).**
   - *Cause :* un verrou créé sous Windows auquel il manquait des paquets optionnels pour Linux (Vite 8). C'est un bogue connu de npm.
   - *Solution :* régénérer le verrou en partant de zéro (supprimer `node_modules` et `package-lock.json`, puis `npm install`).
3. **Port 8080 déjà utilisé** par un autre projet Docker.
   - *Solution :* rendre le port configurable (`${PORT_WEB:-8080}`) au lieu d'arrêter l'autre projet.
4. **Image de l'API trop lourde (158 Mo, dont 341 Mo de `node_modules`).**
   - *Diagnostic :* npm installait automatiquement le CLI `prisma` (une « dépendance pair » de `@prisma/client`) avec Prisma Studio et React. `--omit=peer` n'avait **aucun effet**, ce que j'ai vérifié par une mesure.
   - *Solution :* `npm ci --omit=dev --legacy-peer-deps`. Résultat : 89 Mo de `node_modules` et une image de **92 Mo**, avec l'application toujours fonctionnelle (*healthcheck* vert, tests en vrai).

### Vérifié en vrai
- Les 4 services démarrent dans l'ordre : `db` en santé, puis `migrate` (code 0), puis `api` en santé, puis `web`.
- La page, les routes de l'application (une URL inconnue renvoie `index.html`), l'API via nginx, l'inscription et la création fonctionnent.
- Les en-têtes de sécurité sont présents, `Server: nginx` n'affiche pas de version, et il n'y a pas de `X-Powered-By`.
- Les fichiers `/assets/` sont gardés en cache un an.
- Dans le navigateur, aucune erreur de console, donc la politique CSP ne bloque rien.

### Questions possibles en entrevue
- *Pourquoi Docker ?* → Le même environnement partout (mon PC, celui d'un collègue, le serveur) : « ça marche sur ma machine » n'est plus un problème.
- *Qu'est-ce qu'un build multi-stage ?* → Compiler dans une image complète, puis ne copier que le résultat dans une image minimale.
- *Comment gérez-vous l'ordre de démarrage et les migrations ?* → Avec des *healthchecks*, `depends_on` avec conditions, et un service de migration qui s'exécute une fois.
- *Pourquoi ne pas exécuter en root ?* → Si l'application est compromise, l'attaquant a moins de droits dans le conteneur.
- *Comment passez-vous les secrets ?* → Par des variables d'environnement venant d'un `.env` non versionné. En production, on utiliserait un gestionnaire de secrets (Azure Key Vault, AWS Secrets Manager).

### Exercices pour toi
1. Lance `docker compose up -d --build` et ouvre http://localhost:8081 (le port de ton `.env`).
2. Lance `docker image ls` et compare la taille de l'image de l'API à celle de l'étape `build` (`docker build --target build -t essai ./backend`).
3. Lance `docker compose stop api` : que montre l'interface ? Relance-la avec `docker compose start api`.

---

## Étape 6 : intégration continue avec GitHub Actions

### Ordre de lecture
1. `.github/workflows/ci.yml` : les 3 jobs.
2. `.github/dependabot.yml`.
3. Le badge en haut du `README.md`.

### Notions clés
- **CI (intégration continue) :** à chaque `push` ou *pull request*, GitHub démarre des machines Linux **neuves** et refait tout depuis zéro : installation, types, tests, construction. Si quelque chose casse, le commit est marqué ❌. Ça prouve aussi que le projet ne dépend pas de « ma machine ».
- **Workflow → jobs → étapes :** les jobs `backend` et `frontend` tournent **en parallèle**. Le job `docker` attend qu'ils réussissent (`needs`), parce qu'il ne sert à rien de construire des images si les tests échouent.
- **Conteneur de service :** le job `backend` démarre un vrai PostgreSQL à côté de lui (`services: postgres`). Il utilise le même port qu'en local (5433), donc les tests d'intégration et les migrations tournent sans changer `.env.test`.
- **Test de bout en bout (*E2E*) :** le job `docker` lance les 4 conteneurs, puis simule un utilisateur avec `curl` : page, santé, inscription, création, liste, `401` sans jeton, en-tête de sécurité. C'est le niveau de test le plus proche de la réalité.
- **Pyramide des tests :** beaucoup de tests unitaires (rapides), moins de tests d'intégration (base réelle), et quelques tests de bout en bout (lents, mais très réalistes). Le projet a les trois.
- **Cache npm** (`cache: npm`) : les dépendances téléchargées sont réutilisées d'une exécution à l'autre, ce qui rend la CI plus rapide.
- **Sécurité du workflow :**
  - `permissions: contents: read` : le workflow ne peut que **lire** le dépôt (principe du moindre privilège) ;
  - aucun vrai secret : le `JWT_SECRET` du job est jetable et ne sert qu'à la CI.
- **`concurrency` :** un nouveau push annule l'exécution précédente encore en cours sur la même branche, pour ne pas gaspiller de minutes de CI.
- **Dependabot :** il ouvre des *pull requests* de mise à jour (npm, images Docker, actions). La CI les teste automatiquement, et on fusionne seulement si tout est vert. Les mises à jour mineures sont regroupées.
- **Badge :** l'image en haut du README montre l'état de la CI de la branche `main`. Un recruteur voit tout de suite que le projet est testé.

### Premier passage sur GitHub : la CI a trouvé un vrai bogue
- **Contexte :** au premier push, le job API échouait aux *tests d'intégration*, alors que tout passait sur mon PC.
- **Diagnostic :** j'ai reproduit la CI dans Docker (Linux, installation neuve, PostgreSQL vide). Le message `Usage: dotenv run …` montrait que **deux paquets fournissaient la même commande `dotenv`** : `dotenv-cli` (celui que j'utilisais) et `dotenv` (qui a ajouté sa propre commande dans ses versions récentes). Sur mon PC, `dotenv-cli` prenait le dessus par hasard (ordre d'installation). Sur une installation neuve, c'était l'autre, qui ne comprend pas `-e`.
- **Action :** supprimer la dépendance ambiguë. Une configuration Vitest dédiée (`vitest.integration.config.ts`) lit `.env.test` avec Node lui-même (`util.parseEnv`), et `tests/integration/preparer-base.ts` applique les migrations avant les tests.
- **Résultat :** le job complet passe dans un Linux neuf : types, 20 tests unitaires, migrations sur une base vide, 9 tests d'intégration et compilation.
- **Leçon :** « ça marche sur ma machine » ne prouve rien. C'est exactement pour ça qu'on a une CI qui part de zéro.

### Vérifié localement
- **actionlint** (le vérificateur officieux de référence pour GitHub Actions, avec shellcheck pour les scripts) : 0 erreur.
- Le script de bout en bout du job `docker` a été exécuté contre la version Docker locale : `✅ Application complète fonctionnelle`.
- ⚠️ Le workflow lui-même ne tournera qu'une fois le projet poussé sur GitHub.

### Questions possibles en entrevue
- *Qu'est-ce que la CI/CD ?* → **CI** : intégrer et tester automatiquement chaque changement. **CD** : livrer ou déployer automatiquement ce qui a passé la CI (la prochaine étape).
- *Que vérifie votre pipeline ?* → Les types, 20 tests unitaires, 9 tests d'intégration sur un vrai PostgreSQL, 10 tests de composants, la compilation, la construction Docker et un test de bout en bout.
- *Pourquoi tester dans Docker en CI ?* → Pour vérifier exactement ce qui sera déployé, pas seulement le code.
- *Comment gérez-vous les dépendances vulnérables ?* → Avec Dependabot et la CI : chaque mise à jour est testée avant d'être fusionnée.

### Exercices pour toi
1. Pousse le projet sur GitHub (voir ci-dessous), puis regarde l'onglet **Actions** : clique sur l'exécution et ouvre les étapes.
2. Casse volontairement un test (change `"ok"` en `"ko"` dans `tests/unit/candidatures.test.ts`), puis pousse : la CI devient rouge ❌. Annule ensuite le changement.
3. Crée une branche et ouvre une *pull request* : la CI s'exécute dessus avant la fusion.

---

## Étape 7 : mise en ligne (déploiement continu)

### Ordre de lecture
1. `docs/DEPLOIEMENT.md` : le schéma et la marche à suivre.
2. `Dockerfile` (à la racine) : l'image de déploiement en un seul conteneur.
3. `backend/src/app.ts` : `helmet`, `rateLimit`, `dossierStatique`, `derriereProxy`, `version`.
4. `render.yaml`, puis le job `deploy` de `.github/workflows/ci.yml`.
5. `backend/tests/unit/deploiement.test.ts`.

### Choix d'architecture (et pourquoi)
| Choix | Raison |
|---|---|
| **Neon** pour PostgreSQL | Gratuit **sans expiration**. La base gratuite de Render est supprimée après 30 jours. Neon est *serverless* : la base s'arrête après 5 minutes sans requête et redémarre toute seule. |
| **Render** pour l'application | Exécute une image Docker gratuitement. Contrepartie : le service s'endort après 15 minutes sans visite. |
| **Un seul conteneur** (l'API sert aussi l'interface) | L'offre gratuite donne un service. En local, Compose garde nginx et l'API séparés : deux façons valables, chacune adaptée à son contexte. |
| **Migrations lancées par la CI** | La commande de pré-déploiement de Render est réservée aux offres payantes. La CI applique donc les migrations sur Neon *avant* de déclencher Render. |
| **`autoDeployTrigger: off` + crochet de déploiement** | Render ne déploie que si **tous** les tests sont passés. Un commit qui casse les tests n'arrive jamais en production. |
| **`render.yaml`** (*Blueprint*) | L'infrastructure est décrite dans un fichier versionné (*Infrastructure as Code*), pas en cliquant dans une console. |

### Notions clés
- **CD (déploiement continu) :** chaque commit sur `main` qui passe la CI est mis en production automatiquement.
- **Vérifier que le bon code est en ligne :** `/api/sante` renvoie la `version`, c'est-à-dire le commit Git, fourni par Render dans `RENDER_GIT_COMMIT`. Le job attend que la production annonce **son** commit, puis lance un **test de fumée** (*smoke test*) : la page s'affiche et l'API répond `401` sans jeton.
- **Secrets ou variables GitHub :** `DATABASE_URL` et le crochet Render sont des **secrets** (chiffrés, masqués dans les journaux). L'adresse publique est une **variable**. `JWT_SECRET` est généré par Render et n'apparaît nulle part.
- **Environnement GitHub `production` :** le déploiement apparaît dans l'onglet *Environments* avec son URL. Un `concurrency` assure qu'il n'y a qu'un déploiement à la fois et qu'il n'est jamais interrompu.
- **Sécurité d'une application publique :**
  - **helmet** ajoute les en-têtes de sécurité (CSP, `X-Frame-Options`, `nosniff`, HSTS), comme nginx en local ;
  - **limite de tentatives** (`express-rate-limit`) : 20 requêtes par 15 minutes et par IP sur `/api/auth`, puis `429 Too Many Requests`. Ça freine la force brute sur les mots de passe ;
  - **`trust proxy`** : derrière Render, l'IP vue par Express est celle du proxy. On fait confiance à **un** proxy pour lire la vraie IP dans `X-Forwarded-For`, mais pas plus : sinon un attaquant pourrait inventer son IP pour échapper à la limite.

### Vérifié localement
- 27 tests unitaires (7 nouveaux : limite 429, en-têtes, version, service de l'interface, cache, route `/api` inconnue, refus de démarrer sans `index.html`) et 9 tests d'intégration.
- L'image de déploiement (92 Mo) a été lancée comme sur Render (port 10000, PostgreSQL) : santé et version, interface, routes de l'application, cache, création, limite par IP (le 21e essai donne `429`, une autre IP passe), utilisateur `node`, *healthcheck* `healthy`, et aucune erreur de console dans le navigateur.
- actionlint : 0 erreur.
- ⚠️ **Pas encore vérifié :** le vrai déploiement. Il faut d'abord créer les comptes Neon et Render (voir `docs/DEPLOIEMENT.md`).

### Questions possibles en entrevue
- *Comment déployez-vous ?* → Par GitHub Actions : tests, puis migrations, puis déploiement par crochet, puis vérification de la version et test de fumée. Rien n'arrive en production sans tests verts.
- *Et si une migration casse la production ?* → On garde les migrations **compatibles avec l'ancienne version** (ajouter avant de supprimer), parce qu'elles s'appliquent avant le nouveau code. On peut revenir au déploiement précédent dans Render.
- *Pourquoi limiter les tentatives de connexion ?* → Contre la force brute et le *credential stuffing* (essayer des mots de passe volés ailleurs).
- *Limites de votre hébergement ?* → Le démarrage à froid (environ 1 minute) et un seul conteneur. Pour un vrai produit, on prendrait une offre payante sans mise en veille, plusieurs instances et une sauvegarde de la base.
