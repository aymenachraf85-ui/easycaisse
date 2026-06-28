import { createClient } from "@/lib/supabase/server";
import VentesClient from "./VentesClient";

export default async function VentesPage() {
  const supabase = await createClient();
  const { data: sales } = await supabase
    .from("sales")
    .select("id, total, payment_method, created_at, sale_items(id, name:product_id, quantity, sold_price)")
    .order("created_at", { ascending: false })
    .limit(200);

  // On récupère aussi les noms des produits pour l'affichage
  const { data: salesWithItems } = await supabase
    .from("sales")
    .select(`
      id, total, payment_method, created_at,
      sale_items ( id, quantity, sold_price, products ( name, size ) )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  return <VentesClient sales={salesWithItems || sales || []} />;
}