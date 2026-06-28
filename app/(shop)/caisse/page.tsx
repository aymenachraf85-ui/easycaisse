import { createClient } from "@/lib/supabase/server";
import CaisseClient from "./CaisseClient";

export default async function CaissePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  return <CaisseClient initialProducts={products || []} />;
}
