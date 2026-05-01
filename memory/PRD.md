# DCLIC Informatique - Application de Gestion v2

## Résumé du projet
Application web de gestion pour vendeur réparateur informatique avec modules complets.

## Date de mise à jour
01 Mai 2026 — Validation des 4 dernières modifs UX (ClientCombobox, dates FR, signature PDF 15×6 cm, scroll natif iPad) — 100% OK (iteration_9.json)

## Coordonnées entreprise
- **Nom**: DCLIC INFORMATIQUE
- **Adresse**: 30 AVENUE DU GENERAL DE GAULLE, 19140 UZERCHE
- **Téléphone**: 05.55.73.57.20
- **Email**: contact@d-clic-informatique.fr

## Architecture technique
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Design**: Vert pomme (#84CC16) - fond blanc/gris clair (fond jaune proscrit)
- **PDF**: ReportLab avec QR Code
- **Export Excel**: OpenPyXL (onglets mensuels, format user)
- **Email**: Resend (à configurer via RESEND_API_KEY)

## Fonctionnalités implémentées

### Module 1: Clients ✅
- [x] CRUD complet (créer, modifier, supprimer)
- [x] Champ **telephone2** (téléphone secondaire)
- [x] Recherche fuzzy (Fuse.js)
- [x] Page détail client avec historique
- [x] Bouton direct "Nouvelle réparation" depuis la liste (lien `?newFor=clientId`)

### Module 2: Réparations ✅
- [x] Numérotation auto REP-YYYY-XXXX
- [x] Bloc Identité/Dépôt (Date, heure, client)
- [x] Matériel fourni : 18 cases à cocher
- [x] Option urgence (+25€)
- [x] Technique (mot de passe, description panne, observations)
- [x] Diagnostic/Intervention (action, prix, statuts)
- [x] PDF Client (QR code + conditions)
- [x] PDF Interne (mot de passe visible)
- [x] Lien de suivi unique
- [x] Envoi email automatique (Resend)
- [x] Export Excel
- [x] Auto-ouverture du formulaire avec client pré-sélectionné via `?newFor=clientId`
- [x] Dialog "Nouveau client rapide" avec telephone2

### Module 3: Commandes client ✅
- [x] Numérotation cmd-DD-MM-YYYY-XXXX
- [x] 7 statuts, boutons de changement rapide
- [x] **Bouton "Purger terminées"** (supprime Livré/Récupéré + Réglé)

### Module 4: Encaissement ✅ (REFONTE COMPLÈTE)
- [x] Types exacts demandés: "Forfait réparation 63€", "Réparation rapide 30€", "Réparation express 10€", "Devis 15€", "Ventes", "Autre"
- [x] Auto-remplissage TTC/HT selon le type sélectionné (TVA 20%)
- [x] **Montant HT** visible et modifiable
- [x] **Paiements multiples** : CB + Espèces + Chèque + Virement combinés (avec validation somme = TTC)
- [x] Résumé: Total TTC, Total HT, répartition par mode
- [x] Filtre par date + bouton "Aujourd'hui"

### Module 5: Journal de caisse ✅
- [x] Entrées et sorties
- [x] Export Excel avec onglets mensuels (DATE, ESPECES, CHEQUES, CB, PNF, TOTAL, CA ENCAISSEM, DEPENSES, SOLDE CAISSE, …)
- [x] Prise en charge du nouveau schéma `paiements[]` côté encaissements
- [x] Colonnes manuelles préservées (non écrasées)

### Module 6: Suivi client public ✅
- [x] Page publique via tracking_id unique
- [x] QR code dans le PDF client
- [x] Aucune donnée sensible affichée

### Dashboard ✅
- [x] Stats globales, caisse jour (compatible nouveau schéma encaissement)

## Corrections récentes (18 avril 2026)

### 🔴 P0 — Feedback utilisateur (msg 138) — Tous traités
- [x] **Fond jaune éradiqué** : variables CSS status-in-progress (jaune → bleu), badges amber-100 → blue/slate, PDF interne background FEF08A → E5E7EB, autofill override navigateur
- [x] **Client telephone2** : backend + frontend + formulaire rapide
- [x] **Création client depuis Réparation** : bug de sauvegarde corrigé + telephone2
- [x] **PDFs & lien suivi** : endpoints validés, boutons UI fonctionnels (testé via curl → 200 + contenu valide)
- [x] **Encaissement** : refonte complète (types exacts, paiements multiples, HT visible)
- [x] **Purge commandes** : bouton rouge "Purger terminées" avec confirmation
- [x] **Export Excel caisse** : gère ancien + nouveau schéma, virement intégré au TOTAL

### Tests
- Backend : 22/22 tests pytest ✅ (100%)
- Frontend : Flows principaux validés via testing agent ✅
- Fichier de test : `/app/backend/tests/test_dclic_api.py`

## Itération 9 — 01 mai 2026 (Validation UX récente)
- [x] ClientCombobox (Fuse.js) : recherche fuzzy tolère fautes de frappe — intégré dans le formulaire Réparation (remplace l'ancien `<Select>`)
- [x] Dates au format `jj/mm/aaaa` partout (liste réparations, détail client, suivi public, page iPad)
- [x] Signature PDF agrandie 15×6 cm (était 5×2 cm) — pas d'erreur ReportLab, PDF +31 KB confirme intégration
- [x] Scroll natif unique sur `/signer/:id` (suppression du `max-h-[520px] overflow-y-auto` résiduel)
- Tests : 8/8 backend + 4/4 frontend (100%) — `/app/test_reports/iteration_9.json`

## Itération 10 — 01 mai 2026 (Mise en forme Excel — msg 181)
- [x] Colonne N (REMARQUES) laissée **vide** dans l'export Caisse (plus d'auto-remplissage)
- [x] **Bordures** sur toutes les cellules (data rows, TOTAL MOIS, HT/TVA, TOTAUX, légende)
- [x] **Couleurs distinctes** :
  - Vert pâle `#ECFCCB` = cellule auto-remplie (A, B, C, D, F, I, L, M)
  - Bleu pâle `#DBEAFE` = cellule à remplir manuellement (E, G, H, J, K, N)
  - Gris `#E5E7EB` = colonnes Règlement (O, P, Q) — O1="Virements", O2 vide ; P1="N° facture", P2 vide
  - Beige `#F5E6CA` = colonnes Facturation externe (R, S, T, U) ; T="Nom", U="Facture/échéancier"
- [x] **Légende** sur l'onglet TOTAUX (4 couleurs)
- [x] **Format nombre** `#,##0.00` sur toutes les colonnes monétaires
- [x] **Date colonne A** : format français long `[$-40C]dddd d mmmm` (ex : "jeudi 4 janvier")
- [x] **I2 (REPORT M-1)** : format monétaire `#,##0.00 €`, aligné à droite, en gras

## Itération 11 — 01 mai 2026 (Protection juridique fiche réparation)
- [x] Nouveaux champs : `numero_serie` (N° de série) + `etat_depot` (état/observations à la prise en charge)
- [x] Section dédiée dans le formulaire Réparation (bordure ambre pour attirer l'attention)
- [x] Affichage sur **PDF client** (section "ÉTAT DU MATÉRIEL À LA PRISE EN CHARGE") — constat annexé à la signature
- [x] Affichage sur **PDF interne** (N° série dans les infos techniques + bloc état)
- [x] Affichage sur **page iPad /signer** (bloc ambre en haut, avant les conditions) pour acknowledgment client
- [x] Endpoint public `/api/reparations/{id}/public` expose numero_serie + etat_depot

## Configuration email Resend (P0 Setup restant)
1. Créer un compte sur https://resend.com
2. Générer une clé API
3. Ajouter `RESEND_API_KEY=re_xxxxx` dans `/app/backend/.env`
4. `sudo supervisorctl restart backend`

## URLs
- **Application**: https://fiche-repair.preview.emergentagent.com
- **API**: https://fiche-repair.preview.emergentagent.com/api
- **Suivi**: https://fiche-repair.preview.emergentagent.com/suivi/{tracking_id}

## Prochaines étapes

### P1 — Améliorations
- [ ] Accents PDF : validation visuelle approfondie (reportlab + Helvetica)
- [ ] Gestion utilisateurs (admin/employé) + auth
- [ ] Photos/pièces jointes sur réparations
- [ ] Impression directe sans téléchargement

### P2 — Évolutions futures
- [ ] Facturation électronique (Factur-X)
- [ ] Gestion stock pièces
- [ ] Planning interventions
- [ ] Graphiques & statistiques mensuelles avancées
