# Tableau de bord — Installation

## Prérequis
La fonction SQL `dashboard_stats()` doit être créée dans Supabase (déjà fait).

## Fichiers (2)
À placer dans un NOUVEAU dossier : C:\Users\aymen\easycaisse\app\(shop)\dashboard\

1. page.tsx
2. DashboardClient.tsx

## Installation
1. Décompressez ce zip
2. Dans VS Code : créez le dossier "dashboard" dans app\(shop)\
   (à côté de caisse et produits)
3. Copiez page.tsx et DashboardClient.tsx dedans

Ou en ligne de commande :
   mkdir "app\(shop)\dashboard"
   puis copiez les 2 fichiers dans ce dossier

## Tester
1. http://localhost:3000/dashboard
   (ou cliquez "Tableau de bord" dans le menu du haut)
2. Vous verrez :
   - Ventes & profit du jour
   - Ventes semaine / mois
   - Valeur du stock
   - Top 5 articles vendus (30 jours)
   - Stock faible
   - Historique des changements de prix

## Note
Les chiffres reflètent vos vraies ventes. Si vous venez de tester
quelques ventes en caisse, elles apparaîtront ici.
Pour avoir des données plus parlantes, faites 2-3 ventes test
(dont une avec un prix modifié) avant de regarder le dashboard.
