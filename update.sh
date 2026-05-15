#!/bin/bash
set -e
cd /opt/dclic
git pull
cd backend && source venv/bin/activate && pip install -q -r requirements.txt && deactivate
supervisorctl restart dclic-backend
cd ../frontend && yarn install --silent && yarn build
systemctl reload nginx
echo "✔ Mise à jour terminée"
