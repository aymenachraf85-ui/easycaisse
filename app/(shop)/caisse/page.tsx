import { createClient } from "@/lib/supabase/server";
import CaisseClient from "./CaisseClient";

export default async function CaissePage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("archived", false)
    .order("name", { ascending: true });

  const { data: barcodes } = await supabase
    .from("barcodes")
    .select("code, product_id, size");

  const { data: { user } } = await supabase.auth.getUser();
  let shopName = "Boutique";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("shop_id")
      .eq("id", user.id)
      .single();
    if (profile?.shop_id) {
      const { data: shop } = await supabase
        .from("shops")
        .select("name")
        .eq("id", profile.shop_id)
        .single();
      if (shop?.name) shopName = shop.name;
    }
  }

  return <CaisseClient initialProducts={products || []} barcodes={barcodes || []} shopName={shopName} />;
}