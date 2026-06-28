# Tickets imprimables — Installation

## Fichiers (3)
Tous dans : C:\Users\aymen\easycaisse\app\(shop)\caisse\

1. page.tsx          -> REMPLACE l'ancien (récupère le nom de la boutique)
2. CaisseClient.tsx  -> REMPLACE l'ancien (affiche le ticket après vente)
3. Ticket.tsx        -> NOUVEAU fichier

## Installation
1. Décompressez ce zip
2. Copiez les 3 fichiers
3. Collez-les dans C:\Users\aymen\easycaisse\app\(shop)\caisse\
   (remplacez page.tsx et CaisseClient.tsx quand Windows demande)

## Tester
1. http://localhost:3000/caisse
2. Ajoutez des produits au panier, choisissez le paiement
3. Cliquez "Encaisser"
   -> une fenêtre TICKET s'ouvre automatiquement
4. Dans cette fenêtre :
   - Choisissez le format : 58mm ou 80mm (largeurs imprimante thermique)
   - Cliquez "Imprimer / PDF"
     -> la fenêtre d'impression de Windows s'ouvre
     -> choisissez votre imprimante OU "Enregistrer au format PDF"
5. "Fermer" pour revenir à la caisse

## Le ticket affiche
- Nom de la boutique
- Date et heure
- Numéro de vente
- Détail des articles (quantité x prix)
- Total
- Mode de paiement
- "Merci de votre visite"

## Note impression thermique
Pour une vraie imprimante thermique (58/80mm), choisissez-la dans la
fenêtre d'impression Windows. Le format du ticket est déjà adapté à
ces largeurs. Pour tester sans imprimante : "Enregistrer au format PDF".
