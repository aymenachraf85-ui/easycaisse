"use client";

type TopProduct = { name: string; qty: number };
type LowStock = { name: string; quantity: number; low_stock_threshold: number };
type PriceChange = {
  name: string;
  original_price: number;
  new_price: number;
  difference: number;
  reason: string | null;
  created_at: string;
};

type Stats = {
  today_revenue?: number;
  today_count?: number;
  today_profit?: number;
  today_expenses?: number;
  week_revenue?: number;
  month_revenue?: number;
  month_profit?: number;
  month_expenses?: number;
  suppliers_due?: number;
  stock_value?: number;
  top_products?: TopProduct[];
  low_stock?: LowStock[];
  price_changes?: PriceChange[];
};

function fmt(n: number | undefined) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

const REASON_LABELS: Record<string, string> = {
  promo: "Promo",
  client_fidele: "Client fidèle",
  defaut: "Défaut",
  deal_special: "Deal spécial",
};

export default function DashboardClient({ stats }: { stats: Stats }) {
  const topProducts = stats.top_products || [];
  const lowStock = stats.low_stock || [];
  const priceChanges = stats.price_changes || [];
  const maxQty = topProducts.length ? Math.max(...topProducts.map((t) => t.qty)) : 1;

  // Bénéfices nets = profit brut - dépenses
  const todayNet = (stats.today_profit || 0) - (stats.today_expenses || 0);
  const monthNet = (stats.month_profit || 0) - (stats.month_expenses || 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

      {/* Aujourd'hui */}
      <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-2">Aujourd&apos;hui</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Ventes" value={fmt(stats.today_revenue)} sub={`${stats.today_count || 0} vente(s)`} />
        <StatCard label="Profit brut" value={fmt(stats.today_profit)} />
        <StatCard label="Dépenses" value={fmt(stats.today_expenses)} negative />
        <StatCard label="Bénéfice net" value={fmt(todayNet)} highlight={todayNet >= 0} danger={todayNet < 0} />
      </div>

      {/* Ce mois */}
      <h2 className="text-sm font-semibold text-neutral-500 uppercase mb-2">Ce mois</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Ventes" value={fmt(stats.month_revenue)} />
        <StatCard label="Profit brut" value={fmt(stats.month_profit)} />
        <StatCard label="Dépenses" value={fmt(stats.month_expenses)} negative />
        <StatCard label="Bénéfice net" value={fmt(monthNet)} highlight={monthNet >= 0} danger={monthNet < 0} />
      </div>

      {/* Situation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500">Valeur du stock (prix d&apos;achat)</div>
          <div className="text-2xl font-bold mt-1">{fmt(stats.stock_value)}</div>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-5">
          <div className="text-xs text-neutral-500">Total dû aux fournisseurs</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{fmt(stats.suppliers_due)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top produits */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Articles les plus vendus <span className="text-xs text-neutral-400 font-normal">(30 j)</span></h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-neutral-400">Aucune vente sur la période.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t.name}</span>
                    <span className="font-medium">{t.qty}</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-900 rounded-full" style={{ width: `${(t.qty / maxQty) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock faible */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h2 className="font-semibold mb-3">Stock faible</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-neutral-400">Aucun produit en stock faible. 👍</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-neutral-100 pb-2 last:border-0">
                  <span>{p.name}</span>
                  <span className={`font-medium ${p.quantity === 0 ? "text-red-600" : "text-orange-500"}`}>
                    {p.quantity} restant(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique changements de prix */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Changements de prix récents</h2>
          {priceChanges.length === 0 ? (
            <p className="text-sm text-neutral-400">Aucun changement de prix enregistré.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {priceChanges.map((pc, i) => (
                <div key={i} className="text-sm border-b border-neutral-100 pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="font-medium">{pc.name}</span>
                    <span className={pc.difference < 0 ? "text-red-600" : "text-green-600"}>
                      {pc.difference > 0 ? "+" : ""}{fmt(pc.difference)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {fmt(pc.original_price)} → {fmt(pc.new_price)}
                    {pc.reason ? ` · ${REASON_LABELS[pc.reason] || pc.reason}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, highlight, negative, danger }: {
  label: string; value: string; sub?: string; highlight?: boolean; negative?: boolean; danger?: boolean;
}) {
  let cls = "bg-white border-neutral-200";
  let valCls = "";
  if (highlight) { cls = "bg-emerald-600 border-emerald-600 text-white"; }
  if (danger) { cls = "bg-red-600 border-red-600 text-white"; }
  if (negative) { valCls = "text-red-600"; }
  return (
    <div className={`rounded-xl p-4 border ${cls}`}>
      <p className={`text-xs ${highlight || danger ? "text-white/80" : "text-neutral-500"}`}>{label}</p>
      <p className={`text-xl font-bold mt-1 ${valCls}`}>{value}</p>
      {sub ? <p className={`text-xs mt-0.5 ${highlight || danger ? "text-white/70" : "text-neutral-400"}`}>{sub}</p> : null}
    </div>
  );
}