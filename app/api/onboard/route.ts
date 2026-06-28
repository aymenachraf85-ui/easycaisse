import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Client "admin" : utilise la clé secrète, contourne la RLS.
// Vit uniquement côté serveur, jamais exposé au navigateur.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, shopName } = await request.json();

    if (!userId || !shopName) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. Créer la boutique
    const { data: shop, error: shopErr } = await admin
      .from("shops")
      .insert({ name: shopName })
      .select("id")
      .single();

    if (shopErr || !shop) {
      return NextResponse.json({ error: "Création boutique échouée" }, { status: 500 });
    }

    // 2. Lier le profil de l'utilisateur à cette boutique comme shop_admin
    const { error: profErr } = await admin
      .from("profiles")
      .update({ shop_id: shop.id, role: "shop_admin", can_see_cost: true })
      .eq("id", userId);

    if (profErr) {
      return NextResponse.json({ error: "Liaison profil échouée" }, { status: 500 });
    }

    // 3. Créer un abonnement actif par défaut
    await admin.from("subscriptions").insert({ shop_id: shop.id, status: "active" });

    return NextResponse.json({ success: true, shopId: shop.id });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}