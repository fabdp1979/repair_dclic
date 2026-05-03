# Installation DCLIC Informatique sur un serveur VPS

Ce guide explique, **pas à pas**, comment installer l'application **DCLIC Informatique** (gestion d'un atelier de réparation) depuis GitHub sur votre propre serveur VPS. Aucune compétence technique poussée n'est requise : il suffit de copier-coller les commandes dans l'ordre.

> ⏱️ Temps estimé : **30 à 45 minutes** pour un débutant.

---

## 🚀 Installation rapide (script automatique — 10 min)

Si vous êtes pressé, utilisez le **script d'installation automatique** qui fait tout ce qui est décrit dans ce guide :

```bash
# Connectez-vous en root sur votre VPS, puis :
curl -fsSL https://raw.githubusercontent.com/VOTRE_COMPTE/VOTRE_DEPOT/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

Le script vous posera 5 questions (domaine, email admin, mot de passe, clé Resend, URL GitHub) puis installera tout automatiquement : Python, Node, MongoDB, Nginx, HTTPS, sauvegardes, etc.

👉 **Si vous préférez comprendre chaque étape**, suivez le guide manuel ci-dessous.

---

## 1. Ce qu'il vous faut avant de commencer

- ✅ Un **VPS** (serveur privé virtuel) chez un hébergeur comme **OVH, Hetzner, Contabo, Ionos, Infomaniak…** avec :
  - Au minimum : **2 Go de RAM**, **1 vCPU**, **20 Go de disque**
  - Système d'exploitation : **Ubuntu 22.04 LTS** (recommandé)
  - Accès **SSH** (login + mot de passe ou clé SSH)
- ✅ Un **nom de domaine** (ex : `reparation-monatelier.fr`) pointant vers l'IP de votre VPS.
- ✅ Une clé API **Resend** (gratuite) pour les emails clients → [resend.com](https://resend.com)
- ✅ Un compte **GitHub** avec le dépôt de l'application

---

## 2. Se connecter au serveur

Depuis votre ordinateur (Windows : utilisez **PowerShell** ou **MobaXterm** ; Mac/Linux : **Terminal**) :

```bash
ssh root@VOTRE_IP_VPS
```

Si c'est la première connexion, tapez `yes` pour accepter la clé.

---

## 3. Mettre à jour le système

```bash
apt update && apt upgrade -y
```

---

## 4. Installer les logiciels nécessaires

On installe Python, Node.js, MongoDB, Nginx et Git en une seule commande.

### 4.1. Dépendances de base

```bash
apt install -y python3 python3-pip python3-venv curl git nginx supervisor ufw
```

### 4.2. Node.js 20 + Yarn

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn
```

### 4.3. MongoDB 7

```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl enable mongod
systemctl start mongod
```

Vérifiez que MongoDB tourne :

```bash
systemctl status mongod
```

Vous devez voir **active (running)** en vert. Appuyez sur **q** pour quitter.

---

## 5. Récupérer le code depuis GitHub

```bash
cd /opt
git clone https://github.com/VOTRE_COMPTE/VOTRE_DEPOT.git dclic
cd dclic
```

> Remplacez `VOTRE_COMPTE/VOTRE_DEPOT` par l'adresse exacte de votre dépôt GitHub.

---

## 6. Configurer le backend (Python/FastAPI)

### 6.1. Créer un environnement Python dédié

```bash
cd /opt/dclic/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 6.2. Créer le fichier `.env` du backend

```bash
nano /opt/dclic/backend/.env
```

Collez ce contenu en **remplaçant les valeurs en MAJUSCULES** :

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=dclic_production
JWT_SECRET=UN_LONG_MOT_DE_PASSE_ALEATOIRE_DE_64_CARACTERES_MINIMUM
ADMIN_EMAIL=contact@votre-domaine.fr
ADMIN_PASSWORD=UN_MOT_DE_PASSE_FORT_POUR_VOTRE_COMPTE_ADMIN
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
SENDER_EMAIL=contact@votre-domaine.fr
FRONTEND_URL=https://votre-domaine.fr
CORS_ORIGINS=https://votre-domaine.fr
```

Pour **générer un JWT_SECRET solide** :

```bash
openssl rand -hex 32
```

Copiez la valeur obtenue dans `JWT_SECRET`.

**Sauvegardez** : `Ctrl + O`, `Entrée`, puis `Ctrl + X`.

---

## 7. Configurer le frontend (React)

### 7.1. Créer le fichier `.env` du frontend

```bash
nano /opt/dclic/frontend/.env
```

Collez (en adaptant l'URL) :

```env
REACT_APP_BACKEND_URL=https://votre-domaine.fr
```

### 7.2. Installer les dépendances et compiler

```bash
cd /opt/dclic/frontend
yarn install
yarn build
```

L'étape `yarn build` génère le site optimisé dans `/opt/dclic/frontend/build` (ça prend 2–3 minutes).

---

## 8. Configurer Supervisor (démarrage auto du backend)

Supervisor démarre automatiquement le backend au démarrage du serveur et le relance en cas de crash.

```bash
nano /etc/supervisor/conf.d/dclic-backend.conf
```

Collez :

```ini
[program:dclic-backend]
command=/opt/dclic/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/opt/dclic/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/dclic-backend.err.log
stdout_logfile=/var/log/dclic-backend.out.log
environment=PATH="/opt/dclic/backend/venv/bin:%(ENV_PATH)s"
```

Rechargez Supervisor :

```bash
supervisorctl reread
supervisorctl update
supervisorctl start dclic-backend
supervisorctl status
```

Vous devez voir `dclic-backend    RUNNING`.

---

## 9. Configurer Nginx (serveur web)

Nginx sert le frontend et redirige `/api/...` vers le backend.

```bash
nano /etc/nginx/sites-available/dclic
```

Collez **en remplaçant `votre-domaine.fr`** :

```nginx
server {
    listen 80;
    server_name votre-domaine.fr www.votre-domaine.fr;

    # Taille max upload (pour les bannières pub et signatures)
    client_max_body_size 10M;

    # Frontend React
    root /opt/dclic/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Activez le site :

```bash
ln -s /etc/nginx/sites-available/dclic /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Si `nginx -t` affiche **syntax is ok** / **test is successful**, tout va bien.

---

## 10. Activer HTTPS gratuitement (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d votre-domaine.fr -d www.votre-domaine.fr
```

Suivez les étapes à l'écran :
- Saisissez votre email
- Acceptez les conditions (tapez `A`)
- Choisissez `2` pour la redirection automatique HTTP → HTTPS

Le certificat se renouvelle tout seul tous les 90 jours.

---

## 11. Sécuriser le serveur (pare-feu)

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

Seuls les ports **22 (SSH)**, **80 (HTTP)** et **443 (HTTPS)** sont ouverts.

---

## 12. Premier démarrage et vérifications

Ouvrez votre navigateur : **https://votre-domaine.fr**

Vous devez arriver sur la page de connexion. Identifiants :
- **Email** : celui que vous avez mis dans `ADMIN_EMAIL`
- **Mot de passe** : celui de `ADMIN_PASSWORD`

### Vérification rapide

```bash
# Backend répond ?
curl https://votre-domaine.fr/api/health

# Réponse attendue : {"status":"ok"} (ou équivalent)
```

---

## 13. Paramètres à configurer dans l'app

Une fois connecté, allez dans **Paramètres** (sidebar gauche) :

1. **Bannière publicitaire** : uploadez votre logo/pub qui apparaîtra sur chaque compte rendu remis au client.
2. Changez le mot de passe admin depuis le menu **utilisateur** (haut droite).

---

## 14. Sauvegardes automatiques (fortement recommandé)

Créez un script de sauvegarde MongoDB quotidien :

```bash
nano /opt/dclic/backup.sh
```

Collez :

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
mkdir -p /opt/dclic/backups
mongodump --db=dclic_production --out=/opt/dclic/backups/$DATE
# Garde uniquement les 30 derniers jours
find /opt/dclic/backups/* -maxdepth 0 -type d -mtime +30 -exec rm -rf {} \;
```

Rendez-le exécutable :

```bash
chmod +x /opt/dclic/backup.sh
```

Programmez-le tous les jours à 3 h du matin :

```bash
crontab -e
```

Ajoutez à la fin :

```
0 3 * * * /opt/dclic/backup.sh >> /var/log/dclic-backup.log 2>&1
```

---

## 15. Mettre à jour l'application plus tard

Quand une nouvelle version est publiée sur GitHub :

```bash
cd /opt/dclic
git pull

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
supervisorctl restart dclic-backend

# Frontend
cd ../frontend
yarn install
yarn build

# (Nginx recharge tout seul)
```

---

## 16. Dépannage rapide

| Symptôme | Solution |
|----------|----------|
| La page de connexion ne s'affiche pas | `systemctl restart nginx` puis `supervisorctl restart dclic-backend` |
| Erreur 502 Bad Gateway | Le backend ne tourne pas : `supervisorctl status` et voir `/var/log/dclic-backend.err.log` |
| "Identifiants incorrects" à la 1ère connexion | Vérifiez `ADMIN_EMAIL` / `ADMIN_PASSWORD` dans `/opt/dclic/backend/.env` puis `supervisorctl restart dclic-backend` |
| Les emails ne partent pas | Vérifiez `RESEND_API_KEY` et que `SENDER_EMAIL` est bien vérifié dans votre espace Resend |
| PDF ne se téléchargent pas | Vérifiez `client_max_body_size 10M;` dans la conf nginx |

### Consulter les logs en direct

```bash
# Backend
tail -f /var/log/dclic-backend.err.log

# Nginx
tail -f /var/log/nginx/error.log

# MongoDB
tail -f /var/log/mongodb/mongod.log
```

---

## 17. Besoin d'aide ?

- 📧 Contactez votre installateur
- 📄 Documentation technique : `/app/memory/PRD.md` dans le dépôt
- 🐛 Signaler un bug : créez une **issue** sur GitHub

---

**Félicitations, votre application DCLIC est en ligne ! 🎉**
