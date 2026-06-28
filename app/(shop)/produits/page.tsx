import { createClient } from "@/lib/supabase/server";
import ProduitsClient from "./ProduitsClient";

export default async function ProduitsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return <ProduitsClient initialProducts={products || []} />;
}
