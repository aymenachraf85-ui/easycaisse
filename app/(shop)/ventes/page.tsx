import { createClient } from "@/lib/supabase/server";
import VentesClient from "./VentesClient";

export default async function VentesPage() {
  const supabase = await createClient();

  const { data: sales } = await supabase
    .from("sales")
    .select(`
      id, total, payment_method, created_at,
      sale_items ( id, quantity, sold_price, size, products ( name ) )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  return <VentesClient sales={sales || []} />;
}