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
      <header className="bg-white border-b border-neutral-200 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="font-bold text-base sm:text-lg truncate max-w-[25%] sm:max-w-none">{shop?.name || "Boutique"}</span>
          <nav className="flex gap-0.5 sm:gap-1 ml-auto sm:ml-2 overflow-x-auto">
            <Link href="/caisse" className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-neutral-100 whitespace-nowrap">Caisse</Link>
            <Link href="/caisse-jour" className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-neutral-100 whitespace-nowrap">Caisse jour</Link>
            <Link href="/produits" className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-neutral-100 whitespace-nowrap">Produits</Link>
            <Link href="/ventes" className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-neutral-100 whitespace-nowrap">Ventes</Link>
            <Link href="/dashboard" className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium hover:bg-neutral-100 whitespace-nowrap">Bord</Link>
          </nav>
          <form action="/auth/signout" method="post" className="ml-auto sm:ml-0 shrink-0">
            <button className="text-xs sm:text-sm text-neutral-500 hover:text-neutral-900">Déconnexion</button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}