import { createClient } from "@/lib/supabase/server";
import FournisseursClient from "./FournisseursClient";

export default async function FournisseursPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase.rpc("suppliers_with_balance");
  return <FournisseursClient initialSuppliers={suppliers || []} />;
}