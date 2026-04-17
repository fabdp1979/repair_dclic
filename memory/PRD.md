# DCLIC Informatique - Application de Gestion v2

## Résumé du projet
Application web de gestion pour vendeur réparateur informatique avec modules complets.

## Date de mise à jour
17 Avril 2026

## Coordonnées entreprise
- **Nom**: DCLIC INFORMATIQUE
- **Adresse**: 30 AVENUE DU GENERAL DE GAULLE, 19140 UZERCHE
- **Téléphone**: 05.55.73.57.20
- **Email**: contact@d-clic-informatique.fr

## Architecture technique
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Design**: Vert pomme technique (#84CC16) - fond blanc/gris clair
- **PDF**: ReportLab avec QR Code
- **Export Excel**: OpenPyXL (avec onglets mensuels)
- **Email**: Resend (à configurer)

## Fonctionnalités implémentées

### Module 1: Clients ✅
- [x] CRUD complet (créer, modifier, supprimer)
- [x] Recherche fuzzy
- [x] Page détail client avec historique
- [x] Création rapide depuis fiche réparation

### Module 2: Réparations ✅ (REFONTE COMPLÈTE)
- [x] Numérotation auto REP-YYYY-XXXX
- [x] **Bloc 1 - Identité/Dépôt**: Date, heure, client
- [x] **Bloc 2 - Matériel fourni**: 18 cases à cocher (PC portable, PC fixe, sacoche, imprimante, etc.)
- [x] **Bloc 3 - Option urgence**: +25€ réparation prioritaire
- [x] **Bloc 4 - Technique**: Mot de passe, description panne, observations client
- [x] **Bloc 5 - Diagnostic/Intervention**: Diagnostic, action, prix, statuts
- [x] PDF Client (avec QR code et conditions de réparation)
- [x] PDF Interne (avec mot de passe visible)
- [x] Lien de suivi unique + QR code
- [x] Envoi email automatique
- [x] Export Excel
- [x] Filtres par statut

### Module 3: Commandes client ✅ (NOUVEAU)
- [x] Numérotation cmd-DD-MM-YYYY-XXXX
- [x] Champs: désignation, référence, fournisseur, quantité, prix achat/vente
- [x] 7 statuts: En attente, Commandé, En attente réception, Reçu, Livré, Réglé, Annulé
- [x] Boutons de changement rapide de statut
- [x] Liaison client

### Module 4: Encaissement ✅ (NOUVEAU)
- [x] Vue quotidienne des recettes uniquement
- [x] Types: Vente, Réparation, Autre recette
- [x] Modes: Espèces, CB, Chèque, Virement
- [x] Résumé par mode de paiement
- [x] Filtre par date

### Module 5: Journal de caisse ✅
- [x] Entrées et sorties
- [x] Export Excel avec onglets mensuels
- [x] Colonnes A-Q selon le format existant
- [x] Filtres par dates

### Module 6: Suivi client public ✅ (NOUVEAU)
- [x] Page publique accessible via lien unique
- [x] QR code sur le PDF client
- [x] 5 statuts visibles: Enregistrée, Diagnostic, En attente, Réparation, Prêt
- [x] Aucune donnée sensible affichée

### Dashboard ✅
- [x] Statistiques globales
- [x] Réparations en cours
- [x] Commandes en attente
- [x] Caisse du jour

## Conditions de réparation intégrées
- Prise en charge du matériel
- Délais
- Devis (15€ si refusé)
- Tarifs (forfait 60€ TTC)
- Règlement au comptant
- Garantie (3 mois MO, 1 an pièces)
- Abandon (6 mois + 1 jour)
- Contestations (Tribunal de Brive)

## Configuration email Resend
1. Créer un compte sur https://resend.com
2. Générer une clé API
3. Ajouter `RESEND_API_KEY=re_xxxxx` dans `/app/backend/.env`
4. Redémarrer le backend

## URLs
- **Application**: https://fiche-repair.preview.emergentagent.com
- **API**: https://fiche-repair.preview.emergentagent.com/api
- **Suivi client**: https://fiche-repair.preview.emergentagent.com/suivi/{tracking_id}

## Prochaines étapes (P0-P2)

### P0 - Configuration
- [ ] Configurer Resend pour l'envoi d'emails

### P1 - Améliorations
- [ ] Gestion utilisateurs (admin/employé)
- [ ] Photos/pièces jointes sur réparations
- [ ] Impression directe

### P2 - Évolutions futures
- [ ] Facturation électronique
- [ ] Gestion stock pièces
- [ ] Planning interventions
- [ ] Graphiques avancés
