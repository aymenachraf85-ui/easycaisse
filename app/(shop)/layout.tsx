import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavLink from "./NavLink";

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
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <header className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-40">
        <div className="px-3 sm:px-5 py-2.5">
          <div className="flex items-center gap-3">
            {/* Logo boutique */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg">
                {(shop?.name || "B").charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-sm sm:text-base hidden sm:block">{shop?.name || "Boutique"}</span>
            </div>

            {/* Navigation colorée */}
            <nav className="flex gap-1.5 sm:gap-2 ml-auto overflow-x-auto py-1">
              <NavLink href="/caisse" color="emerald" icon="🛒" label="Caisse" />
              <NavLink href="/caisse-jour" color="blue" icon="💰" label="Caisse jour" />
              <NavLink href="/produits" color="violet" icon="👕" label="Produits" />
              <NavLink href="/fournisseurs" color="orange" icon="🚚" label="Fournisseurs" />
              <NavLink href="/ventes" color="cyan" icon="🧾" label="Ventes" />
              <NavLink href="/rapports" color="rose" icon="📊" label="Rapports" />
              <NavLink href="/dashboard" color="amber" icon="📈" label="Bord" />
            </nav>

            {/* Déconnexion */}
            <form action="/auth/signout" method="post" className="shrink-0">
              <button className="text-xs sm:text-sm text-neutral-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition">
                Sortir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}