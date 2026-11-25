# Finora — Personal Finance Management

**Finora** est une application web SaaS multi-utilisateurs, moderne et mobile-first (installable en **PWA**) dédiée à la gestion des finances personnelles (devise par défaut : **Dirham marocain — MAD / DH**), connectée à MongoDB.

---

## Fonctionnalités principales

- **Authentification sécurisée** : inscription, connexion, déconnexion avec révocation de session, hachage **Argon2id**, tokens **JWT** et isolation stricte des données par utilisateur.
- **Tableau de bord analytique** : KPIs en temps réel (`Solde total`, `Total des revenus`, `Total des dépenses`, `Épargne`, `Taux d'épargne`, indicateurs mensuels, variations vs mois précédent), courbes lisses mensuelles, Donut par catégorie, Top 5 des dépenses, état des budgets et alertes financières.
- **Gestion des transactions** : ajout ergonomique avec validation instantanée, recherche, filtres multicritères (période, type, catégorie), tri par date ou montant, pagination, modales d'édition et de confirmation de suppression, et cartes dédiées sur smartphone.
- **Catégories personnalisées** : catégories marocaines par défaut à l'inscription, création/modification/suppression avec choix de couleur et compteur réel de transactions associées.
- **Budgets mensuels & alertes** : suivi de consommation en temps réel sur la base MongoDB avec seuils visuels d'alerte à **75 %**, **90 %** et **100 %**.
- **Rapports & exports** : filtres par période (*Cette semaine*, *Ce mois*, *Les trois derniers mois*, *Cette année*, *Période personnalisée*), graphiques comparatifs, évolution du solde et de l'épargne, classement des catégories coûteuses, et export **CSV** & **PDF**.
- **Importation CSV** : import avec glisser-déposer, aperçu avant envoi, validation des colonnes, conversion `Id → ObjectId`, détection automatique des doublons et rapport détaillé des erreurs.
- **Expérience Mobile-First & PWA** : Topbar horizontale sur ordinateur, barre de navigation inférieure et menu mobile sur smartphone, mode clair/sombre, sélecteur de devise (`MAD`, `EUR`, `USD`), et installation sur Android/iOS via `manifest.json` + Service Worker.

---

## Technologies utilisées

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** (thème clair/sombre FinTech, responsive & safe-areas)
- **Recharts** (graphiques interactifs)
- **Lucide React** (iconographie)
- **Axios** & **React Router**

### Backend
- **Python 3.12+** + **FastAPI**
- **PyMongo** (agrégations et requêtes MongoDB)
- **Pydantic v2** (validation stricte des données)
- **PyJWT** + **Argon2 (`argon2-cffi`)**
- **ReportLab** (génération des rapports PDF)
- **Pytest** + **mongomock** (tests automatisés)

### Base de données
- **MongoDB** (compatible MongoDB local et **MongoDB Atlas**)

---

## Architecture & Structure des dossiers

```
Finora/
├── frontend/                  # Application React + Vite + TypeScript + PWA
│   ├── public/
│   │   ├── icons/             # Icônes PWA (192x192, 512x512, maskable, Apple Touch)
│   │   ├── favicon.svg        # Favicon vectoriel Finora
│   │   ├── favicon.ico        # Favicon ICO
│   │   ├── manifest.json      # Manifeste PWA
│   │   └── sw.js              # Service Worker (app shell uniquement, /api toujours réseau)
│   ├── src/
│   │   ├── components/        # FinoraLogo, StatCard, Modal, EmptyState, OfflineBanner, ProtectedRoute
│   │   ├── contexts/          # AuthContext, ThemeContext, PreferencesContext, ToastContext
│   │   ├── hooks/             # usePwaInstall
│   │   ├── layouts/           # MainLayout (Topbar horizontale + navigation mobile)
│   │   ├── pages/             # Connexion, Inscription, Dashboard, Transactions, Nouvelle transaction,
│   │   │                      # Catégories, Budgets, Rapports, Importation CSV, Paramètres
│   │   ├── services/          # Client Axios typé & intercepteurs JWT
│   │   ├── types/             # Contrats TypeScript
│   │   └── utils/             # Formatage MAD / EUR / USD & dates FR
│   ├── .env.example
│   ├── vercel.json            # Configuration de routage SPA pour Vercel
│   └── package.json
│
├── backend/                   # API REST FastAPI
│   ├── app/
│   │   ├── api/               # Dépendances JWT & routeurs REST (/api/*)
│   │   ├── core/              # Configuration Pydantic Settings, sécurité Argon2/JWT, exceptions
│   │   ├── database/          # Connexion PyMongo vers la base choaib & indexation sûre
│   │   ├── models/            # Catégories par défaut
│   │   ├── repositories/      # Accès aux collections filtré par user_id
│   │   ├── schemas/           # Schémas de validation Pydantic
│   │   ├── services/          # Logique métier (auth, transactions, budgets, dashboard, CSV, PDF)
│   │   ├── utils/             # Helpers ObjectId & formatage monétaire
│   │   └── main.py            # Point d'entrée FastAPI
│   ├── tests/                 # Suite de tests Pytest
│   ├── .env.example
│   └── requirements.txt
│
├── data/
│   └── transactions.example.csv   # Fichier d'exemple synthétique pour l'import CSV
│
├── render.yaml                # Blueprint de déploiement Render pour le backend
├── .gitignore
└── README.md
```

---

## Base de données MongoDB (`choaib`)

Finora se connecte à la base **`choaib`** et utilise **4 collections** :

1. **`utilisateurs`** : `_id`, `Id` (`U001`, `U002`, ... unique et indexé), `name`, `email` (unique), `password_hash` (Argon2id), `role`, `currency`, `created_at`.
2. **`transactions`** : collection **unique** pour tous les utilisateurs (`_id`, `user_id` → `utilisateurs._id`, `date` ISODate, `montant`, `categorie`, `type` `revenu`/`depense`, `description`, `created_at`).
3. **`categories`** : catégories propres à chaque `user_id`.
4. **`budgets`** : budgets mensuels propres à chaque `user_id`.

---

## Prérequis

- **Python 3.12+**
- **Node.js 20+** et **npm**
- **MongoDB** (local sur `mongodb://localhost:27017/` ou cluster **MongoDB Atlas**)

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

# Créer le fichier .env depuis l'exemple puis renseigner vos valeurs locales
copy .env.example .env

# Démarrer le serveur API
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentation interactive Swagger : `http://127.0.0.1:8000/docs`

### 2. Configurer et lancer le Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

Application accessible sur : `http://localhost:5173`

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable | Description | Exemple |
| --- | --- | --- |
| `MONGODB_URI` | URI MongoDB locale ou MongoDB Atlas (`mongodb+srv://...`) | `mongodb://localhost:27017/` |
| `MONGODB_DATABASE` | Nom de la base de données MongoDB | `choaib` |
| `JWT_SECRET` | Clé secrète HMAC-SHA256 (32+ caractères aléatoires en prod) | `changez_moi_avec_une_cle_longue` |
| `JWT_ALGORITHM` | Algorithme de signature JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de validité du token en minutes | `1440` |
| `CORS_ORIGINS` | Origines autorisées (séparées par des virgules) | `http://localhost:5173,https://finora.vercel.app` |

### Frontend (`frontend/.env`)

| Variable | Description | Exemple |
| --- | --- | --- |
| `VITE_API_URL` | URL de base de l'API backend (optionnelle en local grâce au proxy Vite) | `https://finora-backend.onrender.com/api` |

---

## Tests et Vérification

```powershell
# Tests Backend (Pytest + mongomock)
cd backend
.\.venv\Scripts\python.exe -m pytest -v

# Build de production Frontend (TypeScript + Vite)
cd frontend
npm run build
```

---

## Procédure de déploiement (Vercel + Render + MongoDB Atlas)

### 1. Base de données (MongoDB Atlas)
1. Créez un cluster MongoDB Atlas contenant la base **`choaib`** et les collections `utilisateurs`, `transactions`, `categories`, `budgets`.
2. Récupérez votre URI `mongodb+srv://...` et autorisez l'accès réseau depuis Render.

### 2. Backend (Render)
1. Connectez votre repository GitHub `https://github.com/Choaib-E/Finora` sur **Render** (le fichier `render.yaml` est déjà prêt).
2. Configurez les variables d'environnement : `MONGODB_URI`, `MONGODB_DATABASE=choaib`, `JWT_SECRET`, et `CORS_ORIGINS` avec l'URL finale de votre frontend Vercel.
3. Vérifiez l'état de santé via `GET /api/health`.

### 3. Frontend (Vercel)
1. Importez le repository GitHub sur **Vercel** en définissant `frontend` comme **Root Directory**.
2. Framework preset : **Vite** (`npm run build`, dossier de sortie `dist`).
3. Définissez la variable `VITE_API_URL` pointant vers `https://<votre-service>.onrender.com/api`.
4. Le fichier `frontend/vercel.json` gère automatiquement les routes React SPA et les en-têtes PWA.

---

## Sécurité

- Aucune clé, mot de passe, fichier `.env` ou export CSV privé n'est suivi par Git (`.gitignore`).
- Tous les mots de passe sont hachés avec **Argon2id**.
- Toutes les requêtes métiers identifient l'utilisateur exclusivement depuis le **token JWT** côté backend (`user_id` issu du token, jamais depuis le frontend).
- En production, utilisez **HTTPS** sur Vercel et Render ainsi qu'un `JWT_SECRET` fort et unique.
