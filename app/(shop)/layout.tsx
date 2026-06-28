import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, shop_id")
    .eq("id", user.id)
    .single();
  if (!profile?.shop_id) redirect("/login");

  const { data: shop } = await supabase
    .from("shops")
    .select("name")
    .eq("id", profile.shop_id)
    .single();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center gap-4">
        <span className="font-bold text-lg">{shop?.name || "Boutique"}</span>
        <nav className="flex gap-1 ml-2">
          <Link href="/caisse" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-100">Caisse</Link>
          <Link href="/produits" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-100">Produits</Link>
          <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-100">Tableau de bord</Link>
        </nav>
        <span className="ml-auto text-sm text-neutral-500">{profile.full_name}</span>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-neutral-500 hover:text-neutral-900">Déconnexion</button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}