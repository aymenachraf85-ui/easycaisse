import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("dashboard_stats");

  return <DashboardClient stats={stats || {}} />;
}
