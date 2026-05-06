# DCLIC Informatique — Application de gestion

Application web complète pour la gestion d'un atelier de réparation informatique : clients, réparations, commandes, encaissements, journal de caisse.

![version](https://img.shields.io/badge/version-2026-84CC16) ![stack](https://img.shields.io/badge/stack-FastAPI%20+%20React%20+%20MongoDB-blue)

---

## 📦 Installation

Pour déployer l'application sur votre propre serveur VPS, consultez le guide **[INSTALLATION.md](./INSTALLATION.md)**.

Résumé rapide :
```bash
# Installation automatique en 10 minutes
curl -fsSL https://raw.githubusercontent.com/VOTRE_COMPTE/VOTRE_DEPOT/main/install.sh -o install.sh
chmod +x install.sh && ./install.sh
```

---

## 📖 Notice d'utilisation

Cette notice couvre **tous les cas d'usage quotidiens** de l'application, de la première connexion à la gestion avancée. Suivez les chapitres dans l'ordre lors de votre prise en main.

### Table des matières

1. [Premier démarrage](#1-premier-démarrage)
2. [Interface générale](#2-interface-générale)
3. [Gérer les clients](#3-gérer-les-clients)
4. [Créer une fiche de réparation](#4-créer-une-fiche-de-réparation)
5. [Faire signer le client (iPad)](#5-faire-signer-le-client-sur-lipad)
6. [Suivre une réparation](#6-suivre-une-réparation)
7. [Imprimer une étiquette](#7-imprimer-une-étiquette)
8. [Terminer une réparation et encaisser](#8-terminer-une-réparation--encaisser)
9. [Remettre la fiche compte-rendu au client](#9-remettre-la-fiche-compte-rendu-au-client)
10. [Gérer les commandes fournisseurs](#10-gérer-les-commandes-fournisseurs)
11. [Encaissement manuel (ventes, multi-produits)](#11-encaissement-manuel)
12. [Journal de caisse et export Excel](#12-journal-de-caisse-et-export-excel)
13. [Suivi public client (lien + QR code)](#13-suivi-public-client)
14. [Paramètres : bannière publicitaire](#14-paramètres--bannière-publicitaire)
15. [Sécurité : changer son mot de passe](#15-sécurité)
16. [FAQ et astuces](#16-faq-et-astuces)

---

## 1. Premier démarrage

### 1.1. Accéder à l'application

Dans votre navigateur, ouvrez l'URL que votre installateur vous a donnée :
```
https://votre-domaine.fr
```
Vous arrivez sur la **page de connexion**.

### 1.2. Se connecter

- **Email** : celui que vous avez fourni lors de l'installation
- **Mot de passe** : celui que vous avez saisi lors de l'installation

Cliquez sur **"Connexion"**.

> 💡 **Important** : changez votre mot de passe dès la première connexion (voir [§15](#15-sécurité)).

### 1.3. Que se passe-t-il si je perds mon mot de passe ?

Il n'y a pas de fonction "mot de passe oublié" par email (volontairement, pour la sécurité). Si vous perdez votre mot de passe, connectez-vous en SSH sur le serveur et lancez :

```bash
cd /opt/dclic/backend && source venv/bin/activate
python3 -c "
from pymongo import MongoClient
import bcrypt
c = MongoClient('mongodb://localhost:27017')['dclic_production']
pwd = 'NouveauMotDePasse123!'
h = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()
c.users.update_one({'email': 'contact@votre-domaine.fr'}, {'\$set': {'password_hash': h}})
print('OK')
"
```

---

## 2. Interface générale

### 2.1. Deux modes d'affichage

L'application détecte automatiquement votre appareil :

- **Mode PC** : interface complète d'administration (clients, réparations, caisse, paramètres…)
- **Mode iPad** : interface simplifiée pour faire **signer les clients** en boutique

Le mode actif est visible en haut de l'écran (`Mode : PC` ou `Mode : iPad`).

### 2.2. Menu latéral (PC)

- 🟢 **Tableau de bord** : vue d'ensemble (CA du mois, réparations en cours…)
- 👥 **Clients** : carnet d'adresses
- 🔧 **Réparations** : fiches de réparation (cœur de l'app)
- 🛒 **Commandes client** : pièces commandées chez les fournisseurs
- 💶 **Encaissement** : toutes les recettes (fiches payées + ventes)
- 📘 **Journal de caisse** : vue comptable + export Excel mensuel
- ⚙️ **Paramètres** : bannière publicitaire

### 2.3. Thème & couleurs

- **Vert DCLIC** (`#84CC16`) : actions principales, statuts OK
- **Vert pâle** : cartes de réparations **terminées** (visible d'un coup d'œil)
- **Ambre** : sections importantes (état du matériel à la prise en charge)
- **Rouge** : suppressions, urgences

---

## 3. Gérer les clients

### 3.1. Ajouter un client

1. Menu **"Clients"** → bouton **"Nouveau client"** (en haut à droite)
2. Remplissez :
   - Nom et prénom (obligatoires)
   - Téléphone principal et secondaire
   - Email (utile pour les notifications)
   - Adresse complète
3. Cliquez **"Enregistrer"**

### 3.2. Modifier ou supprimer un client

Dans la liste, cliquez sur l'icône crayon (✏️) pour modifier, ou l'icône poubelle (🗑️) pour supprimer.

> ⚠️ La suppression d'un client **n'efface pas** ses réparations passées — elles resteront dans l'historique avec le nom figé.

### 3.3. Fiche client détaillée

Cliquez sur le nom d'un client pour voir sa fiche complète :
- Ses coordonnées
- Toutes ses réparations passées (avec dates et statuts)
- Liens directs vers chaque fiche

### 3.4. Recherche rapide

La barre de recherche tolère les **fautes de frappe** (recherche floue via Fuse.js). Exemple : tapez `"dupon"` pour retrouver "Dupont".

---

## 4. Créer une fiche de réparation

### 4.1. Nouvelle fiche

Menu **"Réparations"** → bouton **"Nouvelle fiche"** (vert, en haut à droite).

Un formulaire en **6 étapes** s'ouvre :

### 4.2. Étape 1 — Client

- Tapez le nom du client dans la zone **recherche** (avec tolérance aux fautes)
- Sélectionnez-le dans la liste
- Si le client n'existe pas encore, cliquez sur **"Nouveau client"** (icône 👤➕) : un mini-formulaire permet de le créer **sans quitter la fiche**

### 4.3. Étape 2 — Matériel fourni

Cochez ce que le client vous laisse :
- PC fixe / PC portable
- Tour seule / Écran / Clavier / Souris
- Chargeur / Câble
- Tablette / Imprimante
- Autre (à préciser dans le champ texte)

### 4.4. Étape 3 — Forfaits & options (tarif 2026)

Cochez les forfaits appliqués. Le **total se calcule automatiquement** :

| Forfait | Prix |
|---------|------|
| Réparation standard (>30 min) | 63 € |
| Forfait urgence (24h) | 89 € |
| Forfait Apple | 89 € |
| Forfait nettoyage imprimante | 45 € |
| Récupération données — support sain | 63 € |
| Récupération données — support défectueux | 79 € |
| Option sauvegarde | 10 € |
| Devis (offert si réparation acceptée) | 15 € |

> 💡 Cliquez **"Utiliser comme prix"** pour reporter le total dans le champ prix plus bas.

### 4.5. Étape 4 — Informations techniques

- **Mot de passe** de la session (visible uniquement sur la fiche interne)
- **Description de la panne** (obligatoire, ce que le client vous raconte)
- **Observations du client** (demandes particulières)

### 4.6. Étape 5 — État du matériel à la prise en charge ⚠️ IMPORTANT

**Ce bloc ambre est votre protection juridique.** Remplissez-le **devant le client** :

- **N° de série** : pour identifier précisément le matériel
- **Observations** : tout défaut visible
  - Ex : "rayure 2 cm écran en haut à droite, coque cabossée côté gauche, pas de chargeur fourni, touche F5 manquante"

Ce constat sera :
- Imprimé sur le PDF client (avant la panne)
- Affiché sur la page iPad de signature
- Archivé avec la fiche

> ⚠️ **Ne sautez jamais cette étape** : si un client vous reproche plus tard d'avoir rayé son écran, vous avez la preuve signée que c'était déjà comme ça.

### 4.7. Étape 6 — Diagnostic & intervention

Ces 3 champs se remplissent **au fil du temps**, pas forcément à la création :
- **Diagnostic** : ce que vous avez trouvé
- **Action réalisée** : ce que vous avez fait
- **Conseils au client** : affichés sur la fiche compte-rendu (ex: "pensez à sauvegarder vos données chaque semaine")
- **Prix** : montant facturé au final
- **Statut client** : visible sur la page de suivi public (Réception / Diagnostic / En attente pièce / En réparation / Appareil prêt)
- **Statut interne** : pour votre organisation (En cours / Terminé / Réglé)

### 4.8. Enregistrer

Cliquez **"Enregistrer"**. La fiche apparaît dans la liste avec un **numéro unique** (`REP-2026-0001`).

### 4.9. Liste des réparations — à retenir

- Les fiches **terminées** apparaissent avec un **fond vert pâle** (vue d'ensemble instantanée)
- Filtres : **Toutes / En cours / Terminées**
- Badges visibles :
  - 🟢 **Signée** (client a signé sur l'iPad)
  - 🟠 **Sans signature** (fiche envoyée sans signature — rare)
  - 🟡 **URGENT** (forfait urgence activé)
  - 🟢 **Réglé** (encaissement effectué)

---

## 5. Faire signer le client sur l'iPad

### 5.1. Configuration de l'iPad

Sur votre iPad, ouvrez Safari et allez sur votre URL :
```
https://votre-domaine.fr
```
Connectez-vous (même identifiants que sur PC). L'app détecte l'iPad et bascule en **mode kiosque** :
- Pas de barre d'adresse
- Blocage du pull-to-refresh
- Liste des réparations uniquement

### 5.2. Faire signer un client

1. Sur l'iPad, la liste des réparations s'affiche
2. Cliquez sur le bouton **"Signature client"** de la fiche concernée
3. La page de signature s'ouvre avec :
   - **L'état du matériel** (bloc ambre en haut — le client le relit)
   - **Les conditions de réparation** (13 sections, à faire défiler)
   - **Zone de signature** tactile
   - **Champ "Nom du signataire"**
4. Le client signe avec son doigt ou un stylet
5. Le client tape son nom et coche "Lu et approuvé"
6. Cliquez **"Valider la signature"**

### 5.3. Après la signature

La signature est **enregistrée immédiatement** :
- Visible sur la fiche (badge vert "Signée")
- Intégrée au PDF client (15×6 cm, bien lisible)
- Horodatée (date + heure)

### 5.4. Corriger une signature

Sur PC, ouvrez la fiche et supprimez la signature existante. Le client peut re-signer sur l'iPad.

---

## 6. Suivre une réparation

### 6.1. Mettre à jour le statut

Dans la liste des réparations :
- Cliquez **"Terminer"** (vert) pour passer la fiche en statut terminé
- OU ouvrez la fiche et changez le **"Statut client"** pour communiquer au client :
  - `Réparation enregistrée`
  - `En cours de diagnostic`
  - `En attente pièce/intervention`
  - `En cours de réparation`
  - `Appareil prêt`

### 6.2. Lien de suivi public (pour le client)

Chaque fiche a un **lien public anonyme** : le client peut voir l'état d'avancement **sans compte**.

Format du lien : `https://votre-domaine.fr/suivi/F6C6758D`

### 6.3. QR code

Cliquez sur l'icône **QR code** dans la liste pour afficher un QR pointant vers la page de suivi. Pratique pour :
- L'envoyer par SMS au client
- L'imprimer sur l'étiquette (voir §7)

---

## 7. Imprimer une étiquette

### 7.1. Étiquette physique à coller sur le matériel

Chaque fiche dispose d'un bouton **"Étiquette"** (icône 🏷️). Cliquez dessus, puis choisissez :

- **1 étiquette** : pour le matériel seul
- **2 étiquettes (PC + chargeur)** : pratique pour identifier aussi le chargeur

L'étiquette fait **62×29 mm** (format standard **Dymo LabelWriter** ou **Brother QL**). Elle contient :

- **QR code à gauche** (20×20 mm, scannable au téléphone → ouvre la page de suivi)
- **Numéro de fiche** en gras (`REP-2026-0001`)
- **Nom du client**
- **Type de matériel**
- **Date de dépôt** (en petit en bas)

### 7.2. Imprimer

Le PDF s'ouvre dans un nouvel onglet. Faites **Cmd/Ctrl + P**, choisissez votre imprimante thermique, assurez-vous que l'échelle est à **100%** (pas "adapter à la page").

### 7.3. Astuce organisation

Collez l'étiquette directement sur l'appareil + sur la pochette de chargeur. En récupération : scannez le QR avec votre téléphone → la fiche s'ouvre instantanément.

---

## 8. Terminer une réparation → Encaisser

### 8.1. Préparation

Assurez-vous que la fiche a :
- ✅ Un **prix** saisi (sinon le bouton Encaisser est grisé)
- ✅ Le **diagnostic** et l'**action réalisée** remplis (pour le compte-rendu)
- ✅ Éventuellement des **conseils au client**
- ✅ Le **statut client** passé à **"Appareil prêt"**

### 8.2. Quand le client vient récupérer son appareil

1. Ouvrez la fiche dans la liste
2. Cliquez sur le bouton **"Encaisser"** (vert, icône €)
3. Un dialog s'ouvre :
   - **Client** + **Prix à encaisser** (pré-rempli depuis la fiche)
   - **Modes de paiement** : sélectionnez CB, espèces, chèque ou virement
4. Si le client **paie en plusieurs modes** (ex: 50€ CB + 13€ espèces), cliquez **"Ajouter un mode"** et répartissez
5. Le total saisi doit correspondre au prix (affichage vert si OK, gris si écart)
6. Cliquez **"Valider l'encaissement"**

### 8.3. Ce qui se passe automatiquement

- ✅ La fiche passe en statut **"Réglé"** (badge vert)
- ✅ Une entrée apparaît dans le menu **Encaissement**
- ✅ Elle sera comptabilisée dans le **Journal de caisse** du mois
- ✅ Date de paiement enregistrée

### 8.4. Annuler un encaissement

Si vous vous êtes trompé, vous pouvez annuler l'encaissement depuis le menu **Encaissement** (icône 🗑️). La fiche redevient "non payée" et vous pouvez ré-encaisser correctement.

---

## 9. Remettre la fiche compte-rendu au client

### 9.1. Générer le compte-rendu

Sur la fiche dans la liste, cliquez **"Compte rendu"** (bouton vert, icône 📄).

Un PDF A4 d'**une seule page** s'ouvre avec :
- En-tête DCLIC + coordonnées boutique
- Remerciement personnalisé (`Bonjour [Prénom Nom]`)
- Bloc infos client + matériel + N° série
- Problème signalé / Diagnostic / Intervention réalisée
- **Encart prix TTC** en vert DCLIC
- **Encart "Nos conseils"** (vos conseils au client)
- **Bandeau publicitaire** en bas (voir §14)

### 9.2. Impression

**Cmd/Ctrl + P** pour imprimer. Remettez au client en même temps que son matériel.

### 9.3. Différence avec les autres PDF

| PDF | Quand l'utiliser |
|-----|-----------------|
| **Client** | À la prise en charge — le client signe les conditions |
| **Interne** | Votre copie à garder, avec mot de passe session |
| **Compte rendu** | À la restitution — récap final + pub |

---

## 10. Gérer les commandes fournisseurs

### 10.1. Quand créer une commande ?

Si une réparation nécessite une pièce que vous n'avez pas en stock, enregistrez-la dans **Commandes client** :

1. Menu **"Commandes client"** → **"Nouvelle commande"**
2. Sélectionnez le client concerné
3. Remplissez : référence produit, désignation, fournisseur, quantité, prix d'achat, prix de vente
4. Statut initial : **"À commander"**

### 10.2. Cycle d'une commande

- `À commander` → vous n'avez pas encore passé la commande
- `Commandée` → passée chez le fournisseur
- `Reçue` → disponible en boutique, prêt à poser
- `Livrée/Posée` → donné au client

### 10.3. Purger les commandes terminées

Bouton **"Purger"** en haut à droite → supprime toutes les commandes avec statut "Livrée/Posée". Utile pour garder une liste lisible.

---

## 11. Encaissement manuel

### 11.1. Pour quoi ?

Le module **Encaissement** vous permet d'enregistrer toutes les recettes **autres que les réparations** :
- Ventes d'accessoires (souris, cartouches, câbles…)
- Prestations hors fiche (conseils rapides)
- Tout ce qui entre en caisse

### 11.2. Encaissement multi-produits (exemple concret)

Un client paie en CB :
- Forfait réparation : 63 €
- Souris sans fil : 20 €

**Total : 83 € en CB**

Procédure :
1. Menu **Encaissement** → **"Nouvel encaissement"**
2. Bloc **Lignes** :
   - Ligne 1 : Type = "Réparation standard" / Montant = 63 / Description (optionnelle)
   - Cliquez **"Ajouter une ligne"**
   - Ligne 2 : Type = "Ventes" / Montant = 20 / Description = "Souris sans fil"
   - **Total TTC : 83,00 €** affiché en bas
3. Bloc **Modes de paiement** :
   - CB : 83 €
4. **Enregistrer**

L'encaissement apparaît en **"Mixte"** avec le détail des 2 lignes sous-jacent (pour la comptabilité).

### 11.3. Lien avec les réparations

Si vous encaissez via le bouton **"Encaisser"** d'une fiche (§8), l'entrée est créée **automatiquement** avec la référence de la fiche. Pas besoin de passer par le module Encaissement.

---

## 12. Journal de caisse et export Excel

### 12.1. Vue journalière

Menu **"Journal de caisse"** : tous les encaissements regroupés par jour, avec totaux par mode de paiement (espèces, CB, chèques, virements).

### 12.2. Export Excel

Bouton **"Exporter Excel"** → fichier `.xlsx` avec :
- Un **onglet par mois** (avril 26, mars 26, etc.)
- Chaque onglet reporte automatiquement le solde caisse du mois précédent (**REPORT M-1** en I2)
- **Couleurs** :
  - 🟢 Vert pâle : cellules auto-remplies
  - 🔵 Bleu pâle : cellules à remplir à la main
  - ⬜ Gris : colonnes Règlement (O, P, Q)
  - 🟫 Beige : colonnes Facturation externe (R, S, T, U)
- **Un onglet TOTAUX** récapitulatif avec formules liées aux autres onglets
- **Légende** des couleurs sur l'onglet TOTAUX

### 12.3. Format des dates

La colonne A affiche les dates en français long : *"jeudi 4 janvier"*. Les montants sont formatés en € avec 2 décimales.

### 12.4. Fichier prêt à envoyer au comptable

Aucune retouche nécessaire : bordures, formules, polices, fusions — tout est en place. Il suffit d'envoyer le fichier tel quel à votre expert-comptable.

---

## 13. Suivi public client

### 13.1. Principe

Chaque fiche a une **URL publique anonyme** accessible **sans compte** :
```
https://votre-domaine.fr/suivi/F6C6758D
```

Le client y voit :
- Le numéro de fiche
- Son nom
- Le matériel confié
- Le **statut actuel** (mis à jour en temps réel)
- La date de dépôt
- L'état constaté à la prise en charge

### 13.2. Comment le partager ?

- **Par SMS/WhatsApp** : copiez le lien et envoyez-le
- **Par QR code** : affichez le QR code de la fiche (menu réparations → icône QR)
- **Par étiquette** (§7) : le QR est déjà dessus

### 13.3. Confidentialité

L'URL contient un **tracking_id aléatoire** (8 caractères) non devinable. Seul le client qui a reçu le lien peut y accéder. Aucune donnée sensible (mot de passe, prix) n'est exposée.

---

## 14. Paramètres — Bannière publicitaire

### 14.1. À quoi sert la bannière ?

Elle s'affiche **automatiquement en bas de chaque fiche compte-rendu** (§9) remise au client. C'est votre outil de **fidélisation** et de **communication**.

### 14.2. Recommandations

- **Format** : horizontal, 1600 × 400 px (ratio 4:1)
- **Type de fichier** : JPG, PNG ou WebP
- **Poids** : **3 Mo maximum**
- **Contenu suggéré** :
  - Promo du moment ("—10% sur les SSD en novembre")
  - Rappel des services (nettoyage imprimante, Apple…)
  - Coordonnées + QR Instagram/Facebook
  - Offre parrainage
- **À éviter** : texte trop petit (illisible à l'impression thermique si < 14pt)

### 14.3. Uploader / changer la bannière

1. Menu **"Paramètres"** (icône ⚙️ en bas de la sidebar)
2. Section **"Bannière publicitaire"**
3. **Première fois** : cliquez sur la zone pointillée et choisissez le fichier
4. **Remplacer** : bouton "Remplacer" puis choisissez le nouveau fichier
5. **Supprimer** : bouton rouge "Supprimer" (pas de pub sur les compte-rendu si absente)

### 14.4. Vérifier le résultat

Générez un compte-rendu sur n'importe quelle fiche (§9) → la nouvelle bannière apparaît en bas. Le PDF tient toujours sur **une seule page A4**.

### 14.5. Changer selon la saison

Rien ne vous empêche de la changer tous les mois : Black Friday en novembre, Rentrée en septembre, Soldes en janvier… Tous les compte-rendus générés **après** la modification utiliseront la nouvelle.

---

## 15. Sécurité

### 15.1. Changer son mot de passe

1. Cliquez sur votre **email en haut à droite** de l'écran
2. Menu déroulant → **"Changer mot de passe"**
3. Saisissez :
   - L'ancien mot de passe
   - Le nouveau (8 caractères minimum, mélange chiffres + lettres recommandé)
   - Confirmation du nouveau
4. **Enregistrer**

Vous êtes automatiquement déconnecté. Reconnectez-vous avec le nouveau mot de passe.

### 15.2. Déconnexion

Menu utilisateur (email en haut à droite) → **"Déconnexion"**.

La session expire automatiquement après **24 heures** d'inactivité.

### 15.3. Bonnes pratiques

- ❌ Ne partagez **jamais** vos identifiants
- ❌ Ne laissez pas l'iPad déverrouillé avec la session ouverte
- ✅ Verrouillez votre PC quand vous quittez la boutique
- ✅ Changez votre mot de passe tous les 6 mois
- ✅ Utilisez un **gestionnaire de mots de passe** (Bitwarden, 1Password…)

---

## 16. FAQ et astuces

### 🔹 Comment rechercher rapidement un client ?

La barre de recherche sur **"Clients"** et **"Réparations"** tolère les fautes de frappe. Tapez un bout du nom, du prénom ou du téléphone.

### 🔹 Un client me doit de l'argent — comment le noter ?

Créez la réparation normalement, saisissez le prix, **ne cliquez pas sur "Encaisser"**. La fiche restera en statut "Appareil prêt" sans badge "Réglé" — elle sera visible dans votre liste jusqu'au paiement.

### 🔹 Je me suis trompé sur une fiche signée, je peux encore modifier ?

**Oui pour les champs texte** (diagnostic, conseils, prix). La **signature est figée** — si vous voulez la changer, supprimez-la (icône poubelle à côté de la signature) et refaites signer le client.

### 🔹 Un client veut une facture officielle — comment faire ?

Le **compte-rendu** (§9) fait office de facture. Si le client demande une facture avec TVA détaillée, vous devrez passer par votre comptable ou un module de facturation externe (non fourni).

### 🔹 Je veux sauvegarder mes données manuellement

Sur le serveur, lancez :
```bash
/opt/dclic/backup.sh
```
Les sauvegardes sont dans `/opt/dclic/backups/YYYY-MM-DD/`.

### 🔹 Je veux changer le logo "DCLIC"

Éditez `/opt/dclic/frontend/src/modes/PcMode.jsx` (cherchez `DCLIC`). Puis `cd /opt/dclic/frontend && yarn build`.

### 🔹 Je veux envoyer un email au client depuis une fiche

Bouton **"Email"** sur chaque fiche (icône ✉️). Nécessite une clé **Resend** valide (§Installation).

### 🔹 Comment voir le chiffre d'affaires du mois en cours ?

Menu **"Tableau de bord"** — widget "CA du mois" en haut.

### 🔹 Mon iPad est tombé en panne pendant une signature — la fiche est perdue ?

Non. La fiche existe côté PC avec un badge "Non signée". Rechargez la page iPad, sélectionnez à nouveau la fiche, le client peut re-signer.

### 🔹 Combien de temps les données sont-elles conservées ?

**Aussi longtemps que vous voulez.** Vous êtes le seul propriétaire de votre base MongoDB. Aucune donnée n'est envoyée à un tiers (hors Resend pour l'envoi d'emails).

### 🔹 L'app est-elle RGPD ?

Oui. Les conditions de réparation signées par le client incluent une clause RGPD. Vous pouvez supprimer les données d'un client à sa demande (menu Clients → poubelle).

### 🔹 Puis-je avoir plusieurs comptes utilisateurs ?

La version actuelle est **mono-utilisateur** (un seul compte admin). Pour ajouter des comptes, c'est un développement à demander à votre prestataire.

---

## 🆘 Besoin d'aide ?

- 📄 **Documentation technique** : [PRD.md](./memory/PRD.md)
- 🐛 **Signaler un bug** : créez une **issue** sur GitHub
- 📧 **Contactez votre installateur**

---

## 📄 Licence

Application propriétaire DCLIC Informatique. Tous droits réservés.

---

**Bon travail ! 🛠️**
