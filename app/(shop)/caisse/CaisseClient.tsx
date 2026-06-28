"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Ticket, { TicketData } from "./Ticket";

type Product = {
  id: string;
  name: string;
  category: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  sell_price: number;
  barcode: string | null;
  photo_url: string | null;
};

type CartLine = {
  product_id: string;
  name: string;
  size: string | null;
  original_price: number;
  sold_price: number;
  quantity: number;
  max_stock: number;
  reason: string;
};

const REASONS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "promo", label: "Promo" },
  { value: "client_fidele", label: "Client fidèle" },
  { value: "defaut", label: "Défaut" },
  { value: "deal_special", label: "Deal spécial" },
];

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

export default function CaisseClient({
  initialProducts,
  shopName,
}: {
  initialProducts: Product[];
  shopName: string;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState("cash");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Ticket
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [ticketWidth, setTicketWidth] = useState<58 | 80>(80);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  function stockLeft(p: Product) {
    const inCart = cart
      .filter((c) => c.product_id === p.id)
      .reduce((s, c) => s + c.quantity, 0);
    return p.quantity - inCart;
  }

  function addToCart(p: Product) {
    if (stockLeft(p) <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === p.id);
      if (existing) {
        return prev.map((c) =>
          c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name,
          size: p.size,
          original_price: p.sell_price,
          sold_price: p.sell_price,
          quantity: 1,
          max_stock: p.quantity,
          reason: "",
        },
      ];
    });
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((c) => (c.product_id === id ? { ...c, ...patch } : c)));
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  }

  const total = cart.reduce((s, c) => s + c.sold_price * c.quantity, 0);

  async function refreshProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });
    setProducts(data || []);
  }

  async function checkout() {
    if (cart.length === 0) return;
    setProcessing(true);
    setMessage(null);

    const items = cart.map((c) => ({
      product_id: c.product_id,
      quantity: c.quantity,
      original_price: c.original_price,
      sold_price: c.sold_price,
      reason: c.reason,
    }));

    const { data: saleId, error } = await supabase.rpc("checkout", {
      p_payment_method: payment,
      p_items: items,
    });

    setProcessing(false);

    if (error) {
      setMessage({ type: "err", text: "Erreur : " + error.message });
      return;
    }

    // Préparer le ticket
    setTicket({
      shopName,
      saleId: (saleId as string) || "",
      items: cart.map((c) => ({
        name: c.name,
        size: c.size,
        quantity: c.quantity,
        sold_price: c.sold_price,
      })),
      total,
      payment,
      date: new Date(),
    });

    setMessage({ type: "ok", text: `Vente enregistrée — ${fmt(total)}` });
    setCart([]);
    refreshProducts();
  }

  return (
    <div className="flex gap-4 p-4 items-start">
      {/* Colonne produits */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          placeholder="Rechercher un produit ou scanner un code-barres…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 mb-4"
          autoFocus
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.length === 0 ? (
            <p className="text-neutral-400 col-span-full py-8 text-center">Aucun produit trouvé.</p>
          ) : (
            filtered.map((p) => {
              const left = stockLeft(p);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={left <= 0}
                  className={`text-left bg-white border border-neutral-200 rounded-xl p-3 hover:border-neutral-400 transition disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <div className="w-full aspect-square rounded-lg bg-neutral-50 mb-2 overflow-hidden flex items-center justify-center">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-neutral-300 text-xs">Pas de photo</span>
                    )}
                  </div>
                  <div className="font-medium text-sm leading-tight">{p.name}</div>
                  <div className="text-xs text-neutral-500 mb-1">
                    {[p.size, p.color].filter(Boolean).join(" · ")}
                  </div>
                  <div className="font-semibold text-sm">{fmt(p.sell_price)}</div>
                  <div className={`text-xs mt-0.5 ${left <= 0 ? "text-red-600" : "text-neutral-400"}`}>
                    {left > 0 ? `${left} en stock` : "Épuisé"}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Colonne panier */}
      <div className="w-80 shrink-0 bg-white border border-neutral-200 rounded-xl p-4 sticky top-4">
        <h2 className="font-bold text-lg mb-3">Panier</h2>

        {cart.length === 0 ? (
          <p className="text-neutral-400 text-sm py-6 text-center">Panier vide</p>
        ) : (
          <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
            {cart.map((c) => (
              <div key={c.product_id} className="border-b border-neutral-100 pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-sm font-medium leading-tight">
                    {c.name}
                    {c.size ? <span className="text-neutral-400"> · {c.size}</span> : null}
                  </div>
                  <button onClick={() => removeLine(c.product_id)} className="text-red-500 text-xs">✕</button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border border-neutral-200 rounded-lg">
                    <button
                      onClick={() => updateLine(c.product_id, { quantity: Math.max(1, c.quantity - 1) })}
                      className="px-2 py-1 text-neutral-600"
                    >−</button>
                    <span className="px-2 text-sm w-8 text-center">{c.quantity}</span>
                    <button
                      onClick={() => updateLine(c.product_id, { quantity: Math.min(c.max_stock, c.quantity + 1) })}
                      className="px-2 py-1 text-neutral-600"
                    >+</button>
                  </div>

                  <input
                    type="number"
                    value={c.sold_price}
                    onChange={(e) => updateLine(c.product_id, { sold_price: Number(e.target.value) })}
                    className="w-20 border border-neutral-200 rounded-lg px-2 py-1 text-sm"
                  />
                </div>

                {c.sold_price !== c.original_price && (
                  <div className="mt-2">
                    <select
                      value={c.reason}
                      onChange={(e) => updateLine(c.product_id, { reason: e.target.value })}
                      className="w-full border border-neutral-200 rounded-lg px-2 py-1 text-xs"
                    >
                      {REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.value === "" ? "Raison du changement de prix…" : r.label}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-neutral-400 mt-1">
                      Prix normal : {fmt(c.original_price)}
                    </div>
                  </div>
                )}

                <div className="text-right text-sm font-semibold mt-1">
                  {fmt(c.sold_price * c.quantity)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center border-t border-neutral-200 pt-3 mb-3">
          <span className="font-medium">Total</span>
          <span className="text-xl font-bold">{fmt(total)}</span>
        </div>

        <div className="mb-3">
          <label className="text-xs font-medium text-neutral-500 block mb-1">Paiement</label>
          <div className="grid grid-cols-3 gap-1">
            {[
              { v: "cash", l: "Espèces" },
              { v: "card", l: "Carte" },
              { v: "transfer", l: "Virement" },
            ].map((m) => (
              <button
                key={m.v}
                onClick={() => setPayment(m.v)}
                className={`text-xs py-2 rounded-lg border ${
                  payment === m.v
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-700 border-neutral-200"
                }`}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`text-sm rounded-lg px-3 py-2 mb-3 ${
            message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message.text}
          </div>
        )}

        <button
          onClick={checkout}
          disabled={cart.length === 0 || processing}
          className="w-full bg-neutral-900 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          {processing ? "Encaissement…" : "Encaisser"}
        </button>
      </div>

      {/* Ticket après encaissement */}
      {ticket && (
        <Ticket
          data={ticket}
          width={ticketWidth}
          onWidthChange={setTicketWidth}
          onClose={() => setTicket(null)}
        />
      )}
    </div>
  );
}
