import { createClient } from "@/lib/supabase/server";
import CaisseJourClient from "./CaisseJourClient";

export default async function CaisseJourPage() {
  const supabase = await createClient();
  const { data: summary } = await supabase.rpc("cash_day_summary");
  return <CaisseJourClient initialSummary={summary || {}} />;
}