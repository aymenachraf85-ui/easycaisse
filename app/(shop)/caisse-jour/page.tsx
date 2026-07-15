import { createClient } from "@/lib/supabase/server";
import CaisseJourClient from "./CaisseJourClient";

export default async function CaisseJourPage() {
  const supabase = await createClient();
  const { data: summary } = await supabase.rpc("cash_day_summary");
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name, active")
    .eq("active", true)
    .order("name", { ascending: true });

  return <CaisseJourClient initialSummary={summary || {}} initialEmployees={employees || []} />;
}