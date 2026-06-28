# Page Produits avec images — Mise à jour

## Ce qui change
On remplace UNIQUEMENT le fichier `ProduitsClient.tsx` par cette nouvelle version.
Le fichier `page.tsx` ne change pas (gardez l'ancien).

## Installation
1. Décompressez ce zip
2. Copiez `ProduitsClient.tsx`
3. Collez-le dans `C:\Users\aymen\easycaisse\app\(shop)\produits\`
   en REMPLAÇANT l'ancien fichier (cliquez "Remplacer" quand Windows demande)

## Prérequis Supabase (déjà fait normalement)
- Bucket `product-images` créé en PUBLIC
- Les 3 politiques de storage exécutées

## Tester
1. http://localhost:3000/produits
2. "+ Ajouter un produit"
3. Deux façons d'ajouter une photo :
   - Cliquer "Choisir un fichier" et sélectionner une image depuis le PC/téléphone
   - OU coller un lien d'image (URL) dans le champ prévu
4. L'aperçu s'affiche dans le formulaire (carré à gauche)
5. Enregistrer -> une vignette apparaît dans le tableau

## Si les images ne s'affichent pas
Next.js bloque parfois les images de domaines externes.
Si une image collée par URL ne s'affiche pas, dites-le moi : il faudra
ajouter le domaine dans next.config.ts. Les images uploadées vers
Supabase Storage devraient fonctionner directement.
