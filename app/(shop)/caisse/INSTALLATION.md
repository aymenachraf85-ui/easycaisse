# Page Caisse — Installation

## Prérequis
La fonction SQL `checkout(...)` doit être créée dans Supabase (déjà fait).

## Fichiers (2)
À placer dans : C:\Users\aymen\easycaisse\app\(shop)\caisse\

1. page.tsx          -> REMPLACE l'ancienne page caisse (la version "arrive ici")
2. CaisseClient.tsx  -> NOUVEAU fichier

## Installation
1. Décompressez ce zip
2. Copiez page.tsx et CaisseClient.tsx
3. Collez-les dans C:\Users\aymen\easycaisse\app\(shop)\caisse\
   (remplacez l'ancien page.tsx quand Windows demande)

## Tester
1. http://localhost:3000/caisse
2. Vos produits s'affichent en cartes (avec photos)
3. Cliquez un produit -> il part dans le panier (à droite)
4. Testez :
   - Changer la quantité avec + / −
   - Modifier le prix d'une ligne -> un menu "raison" apparaît
   - Choisir le mode de paiement (Espèces / Carte / Virement)
5. Cliquez "Encaisser"
   -> message vert "Vente enregistrée"
   -> le stock des produits diminue (vérifiez en cliquant à nouveau)

## Vérifier côté base (Supabase -> Table Editor)
- table `sales` : une nouvelle ligne avec le total + payment_method
- table `sale_items` : une ligne par produit vendu
- table `price_changes` : une ligne SI vous avez modifié un prix
- table `products` : quantité diminuée

## Recherche / code-barres
Le champ de recherche en haut filtre par nom OU code-barres.
Un scanner USB (qui se comporte comme un clavier) écrira le code
dans ce champ automatiquement.
