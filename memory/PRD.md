# DCLIC Informatique - Application de Gestion

## Résumé du projet
Application web de gestion pour vendeur réparateur informatique avec 3 modules principaux.

## Date de création
31 Mars 2026

## Coordonnées entreprise
- **Nom**: DCLIC INFORMATIQUE
- **Adresse**: 30 AVENUE DU GENERAL DE GAULLE, 19140 UZERCHE
- **Téléphone**: 05.55.73.57.20
- **Email**: contact@d-clic-informatique.fr

## Architecture technique
- **Backend**: FastAPI (Python)
- **Base de données**: MongoDB (pas SQLite comme initialement prévu - plus scalable)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Design**: Vert pomme technique (#84CC16)
- **PDF**: ReportLab
- **Export Excel**: OpenPyXL
- **Email**: Resend (à configurer)

## Fonctionnalités implémentées

### Module 1: Clients ✅
- [x] Création de client (nom, prénom, téléphone, email, adresse)
- [x] Modification de client
- [x] Suppression de client
- [x] Recherche intelligente avec tolérance aux fautes (Fuse.js + Levenshtein)
- [x] ID client auto-généré

### Module 2: Réparations ✅
- [x] Création de fiche (numéro auto type REP-2026-XXXX)
- [x] Modification de fiche
- [x] Suppression de fiche
- [x] Liaison client
- [x] Champs: marque, modèle, mot de passe, problème, diagnostic, action, prix, statut
- [x] Génération PDF Client (sans mot de passe)
- [x] Génération PDF Interne (avec mot de passe)
- [x] Envoi email automatique (configuration Resend requise)
- [x] Filtrage par statut (En cours / Terminé)
- [x] Recherche par nom client ou numéro
- [x] Export Excel

### Module 3: Journal de caisse ✅
- [x] Entrées de caisse (encaissements)
- [x] Sorties de caisse (dépenses)
- [x] Mode de paiement (espèces, CB, chèque, virement)
- [x] Filtrage par dates
- [x] Calcul automatique du solde
- [x] Export Excel

### Dashboard ✅
- [x] Statistiques globales (clients, réparations, en cours, terminées)
- [x] Résumé caisse du jour
- [x] Liste des réparations récentes
- [x] Actions rapides

## Configuration requise

### Variables d'environnement Backend (.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
RESEND_API_KEY=<votre_clé_resend>
SENDER_EMAIL=onboarding@resend.dev
```

### Configuration Email (Resend)
1. Créer un compte sur https://resend.com
2. Générer une clé API (commence par `re_...`)
3. Ajouter la clé dans RESEND_API_KEY
4. Optionnel: vérifier un domaine pour l'envoi

## Backlog / Prochaines fonctionnalités

### P0 - Configuration email
- [ ] Configurer Resend avec une vraie clé API
- [ ] Vérifier domaine email pour production

### P1 - Améliorations fonctionnelles
- [ ] Gestion utilisateurs (admin/employé)
- [ ] Historique des modifications
- [ ] Photos/pièces jointes sur les réparations

### P2 - Évolutions futures
- [ ] Facturation électronique
- [ ] Gestion du stock de pièces
- [ ] Planning des interventions
- [ ] Tableau de bord avancé avec graphiques
- [ ] Sauvegarde automatique
- [ ] Impression directe des fiches

## URLs de l'application
- **Frontend**: https://fiche-repair.preview.emergentagent.com
- **API**: https://fiche-repair.preview.emergentagent.com/api

## Endpoints API principaux
- `GET /api/dashboard/stats` - Statistiques dashboard
- `GET/POST /api/clients` - Liste/Création clients
- `GET/PUT/DELETE /api/clients/{id}` - Détail/Modification/Suppression client
- `GET/POST /api/reparations` - Liste/Création réparations
- `GET/PUT/DELETE /api/reparations/{id}` - Détail/Modification/Suppression réparation
- `GET /api/reparations/{id}/pdf/client` - PDF client
- `GET /api/reparations/{id}/pdf/interne` - PDF interne
- `POST /api/reparations/{id}/send-email` - Envoi email
- `GET/POST /api/caisse` - Journal de caisse
- `GET /api/export/reparations/excel` - Export réparations
- `GET /api/export/caisse/excel` - Export caisse
