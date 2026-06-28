"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Ticket, { TicketData } from "./Ticket";

type Sizes = Record<string, number>;

type Product = {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
  sell_price: number;
  barcode: string | null;
  photo_url: string | null;
  sizes: Sizes;
};

type CartLine = {
  key: string;            // product_id + size (unique par taille)
  product_id: string;
  name: string;
  size: string;
  original_price: number;
  sold_price: number;
  sold_price_text: string;
  quantity: number;
  max_stock: number;
  reason: string;
};

const REASONS = [
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
  const [category, setCategory] = useState("Tous");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState("cash");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  // Produit dont on choisit la taille (popup)
  const [sizePickProduct, setSizePickProduct] = useState<Product | null>(null);

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [ticketWidth, setTicketWidth] = useState<58 | 80>(80);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.category) set.add(p.category); });
    return ["Tous", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== "Tous") list = list.filter((p) => p.category === category);
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q));
    return list;
  }, [products, search, category]);

  function totalStock(sizes: Sizes) {
    return Object.values(sizes || {}).reduce((s, q) => s + (Number(q) || 0), 0);
  }

  // Stock restant d'une taille (en tenant compte du panier)
  function sizeLeft(product: Product, size: string) {
    const inCart = cart.filter((c) => c.product_id === product.id && c.size === size).reduce((s, c) => s + c.quantity, 0);
    return (product.sizes[size] || 0) - inCart;
  }

  function onProductClick(p: Product) {
    const availableSizes = Object.keys(p.sizes || {}).filter((s) => (p.sizes[s] || 0) > 0);
    if (availableSizes.length === 0) return;
    if (availableSizes.length === 1) {
      addToCart(p, availableSizes[0]); // une seule taille -> direct
    } else {
      setSizePickProduct(p); // plusieurs tailles -> popup
    }
  }

  function addToCart(p: Product, size: string) {
    if (sizeLeft(p, size) <= 0) return;
    const key = p.id + "|" + size;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) return prev.map((c) => c.key === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        key, product_id: p.id, name: p.name, size,
        original_price: p.sell_price, sold_price: p.sell_price,
        sold_price_text: String(p.sell_price),
        quantity: 1, max_stock: p.sizes[size] || 0, reason: "",
      }];
    });
    setSizePickProduct(null);
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }
  function removeLine(key: string) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }
  function changePrice(key: string, text: string) {
    setCart((prev) => prev.map((c) => c.key === key ? { ...c, sold_price_text: text, sold_price: Number(text) || 0 } : c));
  }

  const total = cart.reduce((s, c) => s + c.sold_price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  async function refreshProducts() {
    const { data } = await supabase.from("products").select("*").eq("archived", false).order("name", { ascending: true });
    setProducts(data || []);
  }

  async function checkout() {
    if (cart.length === 0) return;
    setProcessing(true);
    setMessage(null);
    const items = cart.map((c) => ({
      product_id: c.product_id, size: c.size, quantity: c.quantity,
      original_price: c.original_price, sold_price: c.sold_price, reason: c.reason,
    }));
    const { data: saleId, error } = await supabase.rpc("checkout", { p_payment_method: payment, p_items: items });
    setProcessing(false);
    if (error) { setMessage({ type: "err", text: "Erreur : " + error.message }); return; }

    setTicket({
      shopName, saleId: (saleId as string) || "",
      items: cart.map((c) => ({ name: c.name, size: c.size, quantity: c.quantity, sold_price: c.sold_price })),
      total, payment, date: new Date(),
    });
    setMessage({ type: "ok", text: `Vente enregistrée — ${fmt(total)}` });
    setCart([]);
    setCartOpen(false);
    refreshProducts();
  }

  const cartPanel = (
    <>
      <h2 className="font-bold text-lg mb-3">Panier</h2>
      {cart.length === 0 ? (
        <p className="text-neutral-400 text-sm py-6 text-center">Panier vide</p>
      ) : (
        <div className="space-y-3 mb-4 max-h-[40vh] lg:max-h-[50vh] overflow-y-auto">
          {cart.map((c) => (
            <div key={c.key} className="border-b border-neutral-100 pb-3">
              <div className="flex justify-between items-start gap-2">
                <div className="text-sm font-medium leading-tight">
                  {c.name} <span className="text-neutral-400">· {c.size}</span>
                </div>
                <button onClick={() => removeLine(c.key)} className="text-red-500 text-xs">✕</button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center border border-neutral-200 rounded-lg">
                  <button onClick={() => updateLine(c.key, { quantity: Math.max(1, c.quantity - 1) })} className="px-3 py-1.5 text-neutral-600">−</button>
                  <span className="px-2 text-sm w-8 text-center">{c.quantity}</span>
                  <button onClick={() => updateLine(c.key, { quantity: Math.min(c.max_stock, c.quantity + 1) })} className="px-3 py-1.5 text-neutral-600">+</button>
                </div>
                <input type="number" inputMode="decimal" value={c.sold_price_text} onChange={(e) => changePrice(c.key, e.target.value)} className="w-20 border border-neutral-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              {c.sold_price !== c.original_price && (
                <div className="mt-2">
                  <select value={c.reason} onChange={(e) => updateLine(c.key, { reason: e.target.value })} className="w-full border border-neutral-200 rounded-lg px-2 py-1.5 text-xs">
                    {REASONS.map((r) => <option key={r.value} value={r.value}>{r.value === "" ? "Raison du changement…" : r.label}</option>)}
                  </select>
                  <div className="text-xs text-neutral-400 mt-1">Prix normal : {fmt(c.original_price)}</div>
                </div>
              )}
              <div className="text-right text-sm font-semibold mt-1">{fmt(c.sold_price * c.quantity)}</div>
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
          {[{ v: "cash", l: "Espèces" }, { v: "card", l: "Carte" }, { v: "transfer", l: "Virement" }].map((m) => (
            <button key={m.v} onClick={() => setPayment(m.v)} className={`text-xs py-2.5 rounded-lg border ${payment === m.v ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-700 border-neutral-200"}`}>{m.l}</button>
          ))}
        </div>
      </div>
      {message && (
        <div className={`text-sm rounded-lg px-3 py-2 mb-3 ${message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</div>
      )}
      <button onClick={checkout} disabled={cart.length === 0 || processing} className="w-full bg-neutral-900 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
        {processing ? "Encaissement…" : "Encaisser"}
      </button>
    </>
  );

  return (
    <div className="lg:flex lg:gap-4 p-3 sm:p-4 lg:items-start">
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <input type="text" placeholder="Rechercher ou scanner un code-barres…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 mb-3" autoFocus />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border ${category === c ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-700 border-neutral-200"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.length === 0 ? (
            <p className="text-neutral-400 col-span-full py-8 text-center">Aucun produit trouvé.</p>
          ) : (
            filtered.map((p) => {
              const total = totalStock(p.sizes);
              const inCart = cart.filter((c) => c.product_id === p.id).reduce((s, c) => s + c.quantity, 0);
              const left = total - inCart;
              return (
                <button key={p.id} onClick={() => onProductClick(p)} disabled={left <= 0}
                  className="text-left bg-white border border-neutral-200 rounded-xl p-3 hover:border-neutral-400 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className="w-full aspect-square rounded-lg bg-neutral-50 mb-2 overflow-hidden flex items-center justify-center">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : <span className="text-neutral-300 text-xs">Pas de photo</span>}
                  </div>
                  <div className="font-medium text-sm leading-tight">{p.name}</div>
                  <div className="text-xs text-neutral-500 mb-1">{p.color || ""}</div>
                  <div className="font-semibold text-sm">{fmt(p.sell_price)}</div>
                  <div className={`text-xs mt-0.5 ${left <= 0 ? "text-red-600" : "text-neutral-400"}`}>{left > 0 ? `${left} en stock` : "Épuisé"}</div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="hidden lg:block w-80 shrink-0 bg-white border border-neutral-200 rounded-xl p-4 sticky top-4">
        {cartPanel}
      </div>

      {!cartOpen && (
        <button onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-4 left-3 right-3 bg-neutral-900 text-white rounded-xl py-3.5 font-semibold flex items-center justify-between px-5 shadow-lg z-30">
          <span>{cartCount} article{cartCount > 1 ? "s" : ""}</span>
          <span>{fmt(total)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40 flex items-end" onClick={() => setCartOpen(false)}>
          <div className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-400">Fermer</span>
              <button onClick={() => setCartOpen(false)} className="text-neutral-500 text-xl">✕</button>
            </div>
            {cartPanel}
          </div>
        </div>
      )}

      {/* Popup choix de la taille */}
      {sizePickProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSizePickProduct(null)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-1">{sizePickProduct.name}</h3>
            <p className="text-sm text-neutral-500 mb-4">Choisir la taille</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(sizePickProduct.sizes || {}).map((size) => {
                const left = sizeLeft(sizePickProduct, size);
                return (
                  <button key={size} onClick={() => addToCart(sizePickProduct, size)} disabled={left <= 0}
                    className="border border-neutral-200 rounded-lg py-2.5 text-center disabled:opacity-40 disabled:cursor-not-allowed hover:border-neutral-900">
                    <div className="font-semibold">{size}</div>
                    <div className={`text-xs ${left <= 0 ? "text-red-600" : "text-neutral-400"}`}>{left > 0 ? `${left} dispo` : "Épuisé"}</div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSizePickProduct(null)} className="w-full mt-4 border border-neutral-300 rounded-lg py-2 text-sm font-medium">Annuler</button>
          </div>
        </div>
      )}

      {ticket && (
        <Ticket data={ticket} width={ticketWidth} onWidthChange={setTicketWidth} onClose={() => setTicket(null)} />
      )}
    </div>
  );
}