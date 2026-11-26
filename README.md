# Finora — Personal Finance Management

**Finora** est une application web SaaS multi-utilisateurs, moderne et mobile-first (installable en **PWA**) dédiée à la gestion des finances personnelles (devise par défaut : **Dirham marocain — MAD / DH**), propulsée par **React + Vite**, **FastAPI** et **MongoDB Atlas**.

---

## Déploiement en ligne (Production)

- **Application Web (Frontend — Vercel)** : [https://finora-hazel-nine.vercel.app](https://finora-hazel-nine.vercel.app)
- **API REST (Backend FastAPI — Vercel)** : [https://finora-backend-xi.vercel.app](https://finora-backend-xi.vercel.app)
- **Documentation interactive Swagger (`/docs`)** : [https://finora-backend-xi.vercel.app/docs](https://finora-backend-xi.vercel.app/docs)
- **Healthcheck API & MongoDB (`/api/health`)** : [https://finora-backend-xi.vercel.app/api/health](https://finora-backend-xi.vercel.app/api/health)
- **Base de données** : **MongoDB Atlas** (`Cluster0`, base `choaib`)
- **Dépôt GitHub & déploiement continu** : [https://github.com/Choaib-E/Finora](https://github.com/Choaib-E/Finora) — chaque `git push` sur la branche `main` redéploie automatiquement le backend et le frontend sur Vercel.

---

## Fonctionnalités principales

- **Authentification sécurisée** : inscription, connexion, modification du profil et du mot de passe dans les paramètres, déconnexion, hachage **Argon2id**, tokens **JWT** et isolation stricte des données par utilisateur.
- **Tableau de bord analytique** : KPIs en temps réel (`Solde total`, `Total des revenus`, `Total des dépenses`, `Épargne`, `Taux d'épargne`, indicateurs mensuels, variations vs mois précédent), courbes lisses mensuelles, Donut par catégorie, Top 5 des dépenses, état des budgets et alertes financières.
- **Gestion des transactions** : ajout ergonomique avec validation instantanée, recherche, filtres multicritères (période, type, catégorie), tri par date ou montant, pagination, modales d'édition et de confirmation de suppression, et cartes dédiées sur smartphone.
- **Catégories personnalisées** : catégories marocaines par défaut à l'inscription, création/modification/suppression avec choix de couleur et compteur réel de transactions associées.
- **Budgets mensuels & alertes** : suivi de consommation en temps réel sur MongoDB avec seuils visuels d'alerte à **75 %**, **90 %** et **100 %**.
- **Rapports & exports** : filtres par période (*Cette semaine*, *Ce mois*, *Les trois derniers mois*, *Cette année*, *Période personnalisée*), graphiques comparatifs, évolution du solde et de l'épargne, classement des catégories coûteuses, et export **CSV** & **PDF**.
- **Importation CSV** : import avec glisser-déposer, aperçu avant envoi, validation des colonnes, correspondance `Id → ObjectId`, détection automatique des doublons et rapport détaillé des erreurs.
- **Expérience Mobile-First & PWA** : Topbar horizontale sur ordinateur, barre de navigation inférieure et menu mobile sur smartphone, mode clair/sombre, sélecteur de devise (`MAD`, `EUR`, `USD`), et installation sur Android/iOS via `manifest.json` + Service Worker.

---

## Conformité avec le cahier des charges P35

Le projet **Finora** répond aux objectifs du sujet **P35** : *« Développement d'une application d'analyse et de suivi des dépenses personnelles »*.

| Exigence | Réalisation dans Finora |
| --- | --- |
| Gestion des utilisateurs | Authentification Argon2id + JWT et isolation stricte des données par `user_id` |
| Stockage MongoDB | MongoDB Atlas (base `choaib`) avec 4 collections (`utilisateurs`, `transactions`, `categories`, `budgets`) |
| Gestion des opérations financières | CRUD complet des revenus et dépenses avec recherche, tri et pagination |
| Classification par catégorie | Catégories par défaut et personnalisables (nom, type, couleur, compteur d'opérations) |
| Gestion des budgets | Budgets mensuels par catégorie ou `Global` avec suivi du montant consommé et restant |
| Filtres temporels | Semaine, mois, trois derniers mois, année en cours et période personnalisée |
| Agrégations et regroupements | Pipelines MongoDB (`$match`, `$group`, `$sum`) et regroupements par catégorie et par mois |
| Calculs statistiques | KPIs temps réel, épargne nette, taux d'épargne (%) et variations vs mois précédent |
| Bilan mensuel | Tableau de bord mensuel interactif et page Rapports avec export CSV / PDF |
| Identification des principales dépenses | Classement des **5 principales catégories de dépenses** et des postes les plus coûteux |
| Alertes de dépassement | Seuils visuels et notifications d'alerte à **75 %**, **90 %** et **100 %** |
| Gestion des transactions fictives | Jeu de données de **731 transactions** sur MongoDB Atlas + exemple CSV (`data/transactions.example.csv`) |

### Respect des objectifs du projet

Finora permet de centraliser les opérations financières multi-utilisateurs, d'analyser la répartition des dépenses par catégorie et dans le temps, de suivre la consommation des budgets mensuels et d'identifier immédiatement les catégories présentant un risque de dépassement budgétaire.

---

## Technologies utilisées

### Frontend
- **React 18** + **Vite 5** + **TypeScript**
- **Tailwind CSS** (thème clair/sombre FinTech, responsive & safe-areas)
- **Recharts** (graphiques interactifs)
- **Lucide React** (iconographie)
- **Axios** & **React Router v6**

### Backend
- **Python 3.12+** + **FastAPI**
- **PyMongo (`pymongo[srv]` + `dnspython`)** pour MongoDB local et MongoDB Atlas
- **Pydantic v2** & **pydantic-settings** (validation stricte et configuration par variables d'environnement)
- **PyJWT** + **Argon2 (`argon2-cffi`)**
- **ReportLab** (génération en mémoire des rapports PDF)
- **Pytest** + **mongomock** (tests automatisés sans toucher à la base réelle)

### Base de données & Hébergement
- **MongoDB Atlas** (`Cluster0`, base **`choaib`**) / compatible MongoDB local
- **Vercel** (deux projets séparés reliés au même dépôt GitHub : `finora-backend` et `finora`)

---

## Choix technologiques

Le cahier des charges propose la pile **Python, FastAPI, Pandas et Streamlit**. Pour concevoir Finora dans une logique de produit FinTech moderne déployé en ligne, les choix suivants ont été retenus :

| Technologie proposée | Technologie utilisée dans Finora |
| --- | --- |
| Python | **Python 3.12+** |
| FastAPI | **FastAPI** (API REST typée + documentation OpenAPI `/docs`) |
| MongoDB | **MongoDB Atlas** (compatible MongoDB local) |
| Streamlit | **React 18 + Vite + TypeScript** (Tailwind CSS + Recharts) |
| Pandas | **Non utilisé** — remplacé par des **pipelines d'agrégation PyMongo** et la **bibliothèque standard Python** (`csv`, `collections`, `datetime`) |

- **Pourquoi React + Vite + TypeScript au lieu de Streamlit** : le choix de React permet d'offrir une interface utilisateur FinTech moderne, réactive, entièrement responsive (Mobile-First + PWA installable) et fluide avec des graphiques interactifs Recharts, tout en maintenant une séparation nette entre le frontend, le backend FastAPI (API REST) et la couche de données MongoDB.
- **Pourquoi PyMongo + Python standard au lieu de Pandas** : les agrégations côté base de données (`$match`, `$group`, `$sum`) et les modules natifs Python (`csv`, `io`, `collections.defaultdict`, `datetime`) couvrent l'ensemble des calculs financiers, imports et exports CSV sans alourdir le backend ni dépasser les contraintes de taille des fonctions serverless Vercel.

---

## Architecture & Structure des dossiers

```
Finora/
├── frontend/                  # Projet Vercel "finora" (React + Vite + TypeScript + PWA)
│   ├── public/
│   │   ├── icons/             # Icônes PWA (192x192, 512x512, maskable, Apple Touch)
│   │   ├── favicon.svg        # Favicon vectoriel Finora
│   │   ├── favicon.ico        # Favicon ICO
│   │   ├── manifest.json      # Manifeste PWA
│   │   └── sw.js              # Service Worker (app shell uniquement, appels API toujours réseau)
│   ├── src/
│   │   ├── components/        # FinoraLogo, StatCard, Modal, EmptyState, OfflineBanner, ProtectedRoute
│   │   ├── contexts/          # AuthContext, ThemeContext, PreferencesContext, ToastContext
│   │   ├── hooks/             # usePwaInstall
│   │   ├── layouts/           # MainLayout (Topbar horizontale + navigation mobile)
│   │   ├── pages/             # Connexion, Inscription, Dashboard, Transactions, Nouvelle transaction,
│   │   │                      # Catégories, Budgets, Rapports, Importation CSV, Paramètres
│   │   ├── services/          # Client Axios typé (VITE_API_URL || '/api') & intercepteurs JWT
│   │   ├── types/             # Contrats TypeScript
│   │   └── utils/             # Formatage MAD / EUR / USD & dates FR
│   ├── .env.example
│   ├── vercel.json            # Rewrites SPA React (/index.html) et en-têtes PWA
│   └── package.json
│
├── backend/                   # Projet Vercel "finora-backend" (API REST FastAPI)
│   ├── app/
│   │   ├── api/               # Dépendances JWT & routeurs REST (/api/*)
│   │   ├── core/              # Configuration Pydantic Settings, sécurité Argon2/JWT, exceptions
│   │   ├── database/          # Connexion PyMongo vers la base choaib & indexation sûre
│   │   ├── models/            # Catégories par défaut
│   │   ├── repositories/      # Accès aux collections isolé par user_id
│   │   ├── schemas/           # Schémas de validation Pydantic
│   │   ├── services/          # Logique métier (auth, transactions, budgets, dashboard, CSV, PDF)
│   │   ├── utils/             # Helpers ObjectId & formatage monétaire
│   │   └── main.py            # Point d'entrée FastAPI (variable `app`, CORS, /api/health)
│   ├── tests/                 # Suite de tests Pytest + mongomock
│   ├── .env.example
│   └── requirements.txt
│
├── data/
│   └── transactions.example.csv   # Fichier d'exemple synthétique pour l'import CSV
│
├── render.yaml                # Blueprint alternatif conservé pour déploiement Render
├── .gitignore
└── README.md
```

---

## Base de données MongoDB (`choaib`)

Finora se connecte à la base **`choaib`** (hébergée sur **MongoDB Atlas** en production ou sur `mongodb://localhost:27017/` en local) et conserve strictement les **4 collections** existantes :

1. **`utilisateurs`** : `_id`, `Id` (`U001`, `U002`, ... unique et indexé), `name`, `email` (unique), `password_hash` (Argon2id), `role`, `currency`, `created_at`.
2. **`transactions`** : collection **unique** pour tous les utilisateurs (`_id`, `user_id` → `utilisateurs._id`, `date` ISODate, `montant`, `categorie`, `type` `revenu`/`depense`, `description`, `created_at`).
3. **`categories`** : catégories propres à chaque `user_id`.
4. **`budgets`** : budgets mensuels propres à chaque `user_id`.

> Les requêtes backend (`user_id_match`) tolèrent à la fois les anciens documents ayant `user_id` stocké en chaîne hexadécimale et les nouveaux documents stockés en `ObjectId`, tout en maintenant une isolation stricte entre utilisateurs.

---

## Analyse et agrégations MongoDB

Finora exploite les pipelines d'agrégation et les opérateurs de requête de **MongoDB** via **PyMongo** afin de transformer les transactions financières en indicateurs exploitables côté backend.

Les opérations d'analyse comprennent :
- **Filtrage temporel et multicritère** : sélection des transactions selon une plage de dates (`$gte`, `$lte`, `$lt`), le type (`revenu` / `depense`), la catégorie ou une recherche textuelle insensible à la casse (`$or`, `$regex`, `$options: "i"`).
- **Regroupement par catégorie et comptage** : agrégation du nombre de transactions par couple `(categorie, type)` via `$match` et `$group` (`$sum: 1`) pour alimenter la gestion des catégories (`TransactionRepository.count_by_category`).
- **Calcul des totaux filtrés** : somme des revenus et des dépenses sur un périmètre donné via un pipeline `$match` → `$group` → `$sum` (`TransactionRepository.summarize_filtered_totals`).
- **Suivi budgétaire mensuel** : pipeline d'agrégation (`$match` sur `user_id`, `type: "depense"` et bornes mensuelles `$gte` / `$lt`, suivi de `$group` + `$sum: "$montant"`) comparant les dépenses réalisées aux plafonds définis et déclenchant les seuils d'alerte à 75 %, 90 % et 100 % (`BudgetService._compute_consumed_for_period`).
- **Analyse mensuelle et évolution du solde** : tris chronologiques PyMongo (`.sort(...)`), séries mensuelles (revenus, dépenses, épargne), solde cumulé quotidien, variations en pourcentage par rapport au mois précédent et calcul du taux d'épargne (`DashboardService` & `ReportService`).
- **Classement des dépenses** : tri décroissant des catégories les plus coûteuses (Top 5 sur le tableau de bord et classement complet dans les rapports).

**Opérateurs MongoDB / PyMongo utilisés dans le code source :**
- **Pipeline d'agrégation (`aggregate`)** : `$match`, `$group`, `$sum`
- **Filtres, mises à jour et curseurs** : `$in` (`user_id_match`), `$gte`, `$lte`, `$lt`, `$or`, `$regex`, `$options`, `$set`, `.sort()`, `.skip()`, `.limit()`, `count_documents()` et projections ciblées (`{"_id": 1}`, `{"Id": 1}`)

Les traitements sont réalisés exclusivement côté backend avec **Python** et **MongoDB**, puis exposés à l'interface React via l'API REST FastAPI.

---

## Jeu de données

Pour valider les fonctionnalités d'analyse financière en conditions réalistes, Finora s'appuie sur un jeu de données synthétique comprenant **731 transactions fictives** stockées dans **MongoDB Atlas** (`choaib.transactions`), complété par un fichier d'exemple [data/transactions.example.csv](data/transactions.example.csv) pour tester l'importation CSV.

Ces données permettent de vérifier et démontrer :
- La classification des transactions par catégorie et l'isolation multi-utilisateurs.
- Le calcul exact des revenus, des dépenses, du solde et du taux d'épargne.
- Les analyses financières mensuelles et l'évolution chronologique du solde.
- L'identification et le classement des **5 principales catégories de dépenses**.
- Le suivi en temps réel de la consommation des budgets.
- La détection des avertissements et dépassements budgétaires (75 %, 90 %, 100 %).

Les données sont organisées dans MongoDB Atlas à travers les quatre collections : `utilisateurs`, `transactions`, `categories` et `budgets`.

---

## Prérequis (développement local)

- **Python 3.12+**
- **Node.js 20+** et **npm**
- **MongoDB** (instance locale sur `mongodb://localhost:27017/` ou accès à un cluster **MongoDB Atlas**)

---

## Installation et Lancement en local

### 1. Configurer et lancer le Backend (FastAPI)

```powershell
cd backend

# Créer et activer l'environnement virtuel
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Installer les dépendances Python
pip install -r requirements.txt

# Créer le fichier .env depuis l'exemple puis renseigner vos valeurs
copy .env.example .env

# Démarrer le serveur API (port 8000, ou 8001 si occupé)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentation interactive locale : `http://127.0.0.1:8000/docs`

### 2. Configurer et lancer le Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

Application locale accessible sur : `http://localhost:5173` (en local, Vite redirige automatiquement `/api` vers `http://127.0.0.1:8000`).

---

## Variables d'environnement

### Backend (`backend/.env` en local ou paramètres Vercel `finora-backend`)

| Variable | Description | Valeur locale / exemple |
| --- | --- | --- |
| `MONGO_URI` | URI MongoDB locale ou Atlas (`mongodb+srv://...`, alias `MONGODB_URI` accepté) | `mongodb://localhost:27017/` |
| `MONGODB_DATABASE` | Nom de la base de données MongoDB | `choaib` |
| `JWT_SECRET` | Clé secrète HMAC-SHA256 (32+ caractères aléatoires en prod) | `remplacez_par_une_cle_secrete_longue` |
| `JWT_ALGORITHM` | Algorithme de signature JWT (défaut : `HS256`) | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de validité du token en minutes (défaut : `1440`) | `1440` |
| `CORS_ORIGINS` | Origines autorisées séparées par des virgules (sans `/` final) | `https://finora-hazel-nine.vercel.app` |

### Frontend (`frontend/.env` optionnel en local ou paramètres Vercel `finora`)

| Variable | Description | Valeur en production |
| --- | --- | --- |
| `VITE_API_URL` | URL de base de l'API FastAPI (optionnelle en local grâce au proxy Vite) | `https://finora-backend-xi.vercel.app/api` |

---

## Tests et Vérification

```powershell
# Tests Backend (Pytest + mongomock — 6 tests d'intégration et d'isolation)
cd backend
.\.venv\Scripts\python.exe -m pytest -v

# Vérification TypeScript et Build de production Frontend
cd frontend
npx tsc --noEmit
npm run build
```

---

## Architecture de déploiement (Vercel + MongoDB Atlas)

Le projet est hébergé sur **Vercel** sous forme de **2 projets distincts** connectés au repository GitHub `Choaib-E/Finora` (branche `main`) et connectés au cluster **MongoDB Atlas**.

### 1. Base de données — MongoDB Atlas
- Cluster **MongoDB Atlas** hébergeant la base **`choaib`** et les 4 collections (`utilisateurs`, `transactions`, `categories`, `budgets`).
- Accès réseau autorisé pour les fonctions serverless Vercel (`Network Access` configuré dans Atlas) et utilisateur dédié avec droits lecture/écriture sur `choaib`.

### 2. Projet Backend Vercel — `finora-backend`
- **URL** : `https://finora-backend-xi.vercel.app`
- **Root Directory** : `backend`
- **Point d'entrée** : `app/main.py` (instance FastAPI `app` détectée automatiquement par Vercel, routes sous `/api/*` + `/docs`)
- **Variables d'environnement Vercel** :
  - `MONGO_URI` : chaîne de connexion `mongodb+srv://...` vers MongoDB Atlas
  - `MONGODB_DATABASE` : `choaib`
  - `JWT_SECRET` : clé secrète forte générée pour la production
  - `CORS_ORIGINS` : `https://finora-hazel-nine.vercel.app`

### 3. Projet Frontend Vercel — `finora`
- **URL** : `https://finora-hazel-nine.vercel.app`
- **Root Directory** : `frontend`
- **Framework Preset** : `Vite`
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Routage SPA & PWA** : géré par `frontend/vercel.json` (rewrites vers `/index.html`, cache désactivé sur `/sw.js`, type MIME `application/manifest+json` sur `/manifest.json`)
- **Variable d'environnement Vercel** :
  - `VITE_API_URL` : `https://finora-backend-xi.vercel.app/api`

### 4. Mises à jour automatiques
Chaque `git push origin main` sur `Choaib-E/Finora` déclenche automatiquement le redéploiement des deux projets Vercel (`finora-backend` et `finora`).

---

## Sécurité

- Aucune clé, mot de passe, URI réelle, fichier `.env` ou export CSV privé n'est suivi par Git (`.gitignore`).
- Tous les mots de passe sont hachés avec **Argon2id**.
- Toutes les requêtes métiers identifient l'utilisateur exclusivement depuis le **token JWT** côté backend (`user_id` extrait du token, jamais envoyé ou imposé par le frontend).
- Les exports CSV/PDF sont générés entièrement en mémoire (`io.StringIO` / `io.BytesIO`), sans écriture sur le système de fichiers serverless.
- En production, toutes les communications transitent en **HTTPS** entre Vercel Frontend, Vercel Backend et MongoDB Atlas.
