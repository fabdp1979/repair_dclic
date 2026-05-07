#!/bin/bash
#
# DCLIC Informatique — Installation automatique sur VPS Ubuntu 22.04
#
# Usage (en root) :
#   curl -fsSL https://raw.githubusercontent.com/VOTRE_COMPTE/VOTRE_DEPOT/main/install.sh | bash
# OU après clone :
#   chmod +x install.sh && ./install.sh
#

set -e

# === Couleurs ===
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

say()  { echo -e "${BLUE}▶${NC} $1"; }
ok()   { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✖${NC} $1" >&2; }

if [ "$EUID" -ne 0 ]; then
  err "Ce script doit être exécuté en root (sudo)."
  exit 1
fi

clear
cat <<'BANNER'
╔═══════════════════════════════════════════════════════════════╗
║       DCLIC INFORMATIQUE — Installation automatique           ║
║       Temps estimé : 10 à 15 minutes                          ║
╚═══════════════════════════════════════════════════════════════╝
BANNER
echo ""

# =============================================================================
# 1. Questions à l'utilisateur
# =============================================================================
say "Quelques questions avant de commencer :"
echo ""

read -rp "🌐 Nom de domaine (ex: reparation-monatelier.fr) : " DOMAIN
[ -z "$DOMAIN" ] && { err "Domaine requis"; exit 1; }

read -rp "📬 Clé API Resend (commence par 're_', laissez vide si plus tard) : " RESEND_API_KEY

read -rp "📦 URL du dépôt GitHub (ex: https://github.com/compte/repo.git) : " GIT_REPO
[ -z "$GIT_REPO" ] && { err "URL GitHub requise"; exit 1; }

read -rp "📧 Email Let's Encrypt pour HTTPS (certif SSL gratuit) : " LE_EMAIL
[ -z "$LE_EMAIL" ] && LE_EMAIL="admin@$DOMAIN"

read -rp "📨 Email expéditeur des notifications (laissez vide pour utiliser '$LE_EMAIL') : " SENDER_EMAIL
[ -z "$SENDER_EMAIL" ] && SENDER_EMAIL="$LE_EMAIL"

echo ""
say "Récapitulatif :"
echo "   Domaine     : $DOMAIN"
echo "   Dépôt       : $GIT_REPO"
echo "   Resend      : $([ -z "$RESEND_API_KEY" ] && echo "(vide)" || echo "fournie")"
echo ""
warn "Le compte administrateur sera créé directement depuis le navigateur,"
warn "lors du premier accès à l'application — aucun mot de passe ici."
echo ""
read -rp "Continuer l'installation ? [o/N] : " CONFIRM
[[ ! "$CONFIRM" =~ ^[oOyY]$ ]] && { warn "Installation annulée."; exit 0; }

# =============================================================================
# 2. Mise à jour système
# =============================================================================
say "Mise à jour du système (peut prendre 2-3 min)…"
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq
ok "Système à jour"

# =============================================================================
# 3. Dépendances de base
# =============================================================================
say "Installation des dépendances (Python, Nginx, Supervisor, Git, UFW)…"
apt install -y -qq python3 python3-pip python3-venv curl git nginx supervisor ufw gnupg ca-certificates lsb-release
ok "Dépendances de base installées"

# =============================================================================
# 4. Node.js 20 + Yarn
# =============================================================================
if ! command -v node >/dev/null 2>&1; then
  say "Installation de Node.js 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt install -y -qq nodejs
fi
if ! command -v yarn >/dev/null 2>&1; then
  npm install -g yarn --silent
fi
ok "Node.js $(node -v) / Yarn $(yarn -v)"

# =============================================================================
# 5. MongoDB 7
# =============================================================================
if ! systemctl is-active --quiet mongod 2>/dev/null; then
  say "Installation de MongoDB 7…"
  curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
    > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt update -qq
  apt install -y -qq mongodb-org
  systemctl enable mongod >/dev/null 2>&1
  systemctl start mongod
  sleep 3
fi
ok "MongoDB actif"

# =============================================================================
# 6. Récupération du code
# =============================================================================
APP_DIR="/opt/dclic"
if [ -d "$APP_DIR/.git" ]; then
  say "Mise à jour du code existant…"
  cd "$APP_DIR" && git pull -q
else
  say "Clone du dépôt GitHub…"
  rm -rf "$APP_DIR"
  git clone -q "$GIT_REPO" "$APP_DIR"
fi
ok "Code récupéré dans $APP_DIR"

# =============================================================================
# 7. Configuration Backend
# =============================================================================
say "Configuration du backend…"
cd "$APP_DIR/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
deactivate

JWT_SECRET=$(openssl rand -hex 32)

cat > "$APP_DIR/backend/.env" <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=dclic_production
JWT_SECRET=$JWT_SECRET
RESEND_API_KEY=$RESEND_API_KEY
SENDER_EMAIL=$SENDER_EMAIL
FRONTEND_URL=https://$DOMAIN
CORS_ORIGINS=https://$DOMAIN
EOF
chmod 600 "$APP_DIR/backend/.env"
ok "Backend configuré"

# =============================================================================
# 8. Configuration + build Frontend
# =============================================================================
say "Build du frontend (React) — 2-3 min…"
cd "$APP_DIR/frontend"

cat > .env <<EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

yarn install --silent
yarn build
ok "Frontend compilé dans $APP_DIR/frontend/build"

# =============================================================================
# 9. Supervisor
# =============================================================================
say "Configuration de Supervisor (auto-start backend)…"
cat > /etc/supervisor/conf.d/dclic-backend.conf <<EOF
[program:dclic-backend]
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=$APP_DIR/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/dclic-backend.err.log
stdout_logfile=/var/log/dclic-backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin:%(ENV_PATH)s"
stopasgroup=true
killasgroup=true
EOF

supervisorctl reread >/dev/null
supervisorctl update >/dev/null
supervisorctl restart dclic-backend >/dev/null 2>&1 || supervisorctl start dclic-backend
sleep 2
if supervisorctl status dclic-backend | grep -q RUNNING; then
  ok "Backend démarré"
else
  err "Backend ne démarre pas. Logs : tail -n 50 /var/log/dclic-backend.err.log"
  exit 1
fi

# =============================================================================
# 10. Nginx
# =============================================================================
say "Configuration de Nginx…"
cat > /etc/nginx/sites-available/dclic <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 10M;

    root $APP_DIR/frontend/build;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/dclic /etc/nginx/sites-enabled/dclic
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || { err "Erreur config nginx"; nginx -t; exit 1; }
systemctl reload nginx
ok "Nginx configuré"

# =============================================================================
# 11. Pare-feu
# =============================================================================
say "Configuration du pare-feu…"
ufw allow OpenSSH >/dev/null 2>&1
ufw allow 'Nginx Full' >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1
ok "Pare-feu actif"

# =============================================================================
# 12. HTTPS (Let's Encrypt)
# =============================================================================
say "Installation du certificat HTTPS gratuit (Let's Encrypt)…"
apt install -y -qq certbot python3-certbot-nginx

if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$LE_EMAIL" --redirect 2>/dev/null; then
  ok "HTTPS actif sur https://$DOMAIN"
else
  warn "HTTPS non configuré — vérifiez que le domaine $DOMAIN pointe bien sur cette IP, puis relancez :"
  echo "   certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# =============================================================================
# 13. Sauvegarde automatique MongoDB
# =============================================================================
say "Mise en place des sauvegardes automatiques MongoDB (quotidiennes 3h)…"
cat > "$APP_DIR/backup.sh" <<'BACKUP'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
mkdir -p /opt/dclic/backups
mongodump --quiet --db=dclic_production --out=/opt/dclic/backups/$DATE
find /opt/dclic/backups/* -maxdepth 0 -type d -mtime +30 -exec rm -rf {} \;
BACKUP
chmod +x "$APP_DIR/backup.sh"

(crontab -l 2>/dev/null | grep -v "dclic/backup.sh"; echo "0 3 * * * $APP_DIR/backup.sh >> /var/log/dclic-backup.log 2>&1") | crontab -
ok "Sauvegardes quotidiennes programmées"

# =============================================================================
# 14. Script de mise à jour
# =============================================================================
cat > "$APP_DIR/update.sh" <<EOF
#!/bin/bash
set -e
cd $APP_DIR
git pull
cd backend && source venv/bin/activate && pip install -q -r requirements.txt && deactivate
supervisorctl restart dclic-backend
cd ../frontend && yarn install --silent && yarn build
systemctl reload nginx
echo "✔ Mise à jour terminée"
EOF
chmod +x "$APP_DIR/update.sh"
ok "Script de mise à jour : $APP_DIR/update.sh"

# =============================================================================
# 15. Fin
# =============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✔  INSTALLATION TERMINÉE                                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  🌐 Application : https://$DOMAIN"
echo ""
echo -e "${YELLOW}  ⚠  Première étape :${NC} ouvrez https://$DOMAIN dans votre navigateur."
echo "  Vous serez automatiquement redirigé vers une page de configuration"
echo "  pour créer votre compte administrateur (email + mot de passe)."
echo ""
echo "  🔧 Commandes utiles :"
echo "     • Redémarrer le backend  : supervisorctl restart dclic-backend"
echo "     • Voir les logs          : tail -f /var/log/dclic-backend.err.log"
echo "     • Mettre à jour          : $APP_DIR/update.sh"
echo "     • Sauvegarder à la main  : $APP_DIR/backup.sh"
echo ""
echo "  📚 Documentation complète : $APP_DIR/INSTALLATION.md"
echo ""
