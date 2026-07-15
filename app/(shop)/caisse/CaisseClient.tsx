"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Ticket, { TicketData } from "./Ticket";
import NumPad from "../NumPad";

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

type BarcodeRow = { code: string; product_id: string; size: string };

type CartLine = {
  key: string;
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

const CATEGORY_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-50", border: "border-blue-400", text: "text-blue-700" },
  { bg: "bg-pink-500", light: "bg-pink-50", border: "border-pink-400", text: "text-pink-700" },
  { bg: "bg-amber-500", light: "bg-amber-50", border: "border-amber-400", text: "text-amber-700" },
  { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-700" },
  { bg: "bg-purple-500", light: "bg-purple-50", border: "border-purple-400", text: "text-purple-700" },
  { bg: "bg-red-500", light: "bg-red-50", border: "border-red-400", text: "text-red-700" },
  { bg: "bg-cyan-500", light: "bg-cyan-50", border: "border-cyan-400", text: "text-cyan-700" },
  { bg: "bg-orange-500", light: "bg-orange-50", border: "border-orange-400", text: "text-orange-700" },
];

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD";
}

export default function CaisseClient({
  initialProducts,
  barcodes,
  shopName,
}: {
  initialProducts: Product[];
  barcodes: BarcodeRow[];
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
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const [sizePickProduct, setSizePickProduct] = useState<Product | null>(null);

  // Pavé numérique : quelle ligne du panier on édite
  const [padKey, setPadKey] = useState<string | null>(null);

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [ticketWidth, setTicketWidth] = useState<58 | 80>(80);

  const barcodeMap = useMemo(() => {
    const m = new Map<string, { product_id: string; size: string }>();
    barcodes.forEach((b) => m.set(b.code, { product_id: b.product_id, size: b.size }));
    return m;
  }, [barcodes]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.category) set.add(p.category); });
    return ["Tous", ...Array.from(set)];
  }, [products]);

  const categoryColor = useMemo(() => {
    const map = new Map<string, typeof CATEGORY_COLORS[0]>();
    categories.filter((c) => c !== "Tous").forEach((c, i) => {
      map.set(c, CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
    });
    return map;
  }, [categories]);

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

  function sizeLeft(product: Product, size: string) {
    const inCart = cart.filter((c) => c.product_id === product.id && c.size === size).reduce((s, c) => s + c.quantity, 0);
    return (product.sizes[size] || 0) - inCart;
  }

  function onProductClick(p: Product) {
    const availableSizes = Object.keys(p.sizes || {}).filter((s) => (p.sizes[s] || 0) > 0);
    if (availableSizes.length === 0) return;
    if (availableSizes.length === 1) {
      addToCart(p, availableSizes[0]);
    } else {
      setSizePickProduct(p);
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

  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleScan(code: string) {
      const found = barcodeMap.get(code.trim());
      if (!found) { setScanFeedback(`Code inconnu : ${code}`); setTimeout(() => setScanFeedback(null), 2000); return; }
      const product = productMap.get(found.product_id);
      if (!product) { setScanFeedback("Produit introuvable"); setTimeout(() => setScanFeedback(null), 2000); return; }
      if (sizeLeft(product, found.size) <= 0) { setScanFeedback(`${product.name} (${found.size}) — épuisé`); setTimeout(() => setScanFeedback(null), 2000); return; }
      addToCart(product, found.size);
      setScanFeedback(`✓ ${product.name} (${found.size})`);
      setTimeout(() => setScanFeedback(null), 1500);
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if (e.key === "Enter") {
        if (scanBuffer.current.length >= 6) { handleScan(scanBuffer.current); scanBuffer.current = ""; e.preventDefault(); }
        return;
      }
      if (e.key.length === 1 && !isInput) {
        scanBuffer.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => { scanBuffer.current = ""; }, 100);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcodeMap, productMap, cart]);

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }
  function removeLine(key: string) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }
  function setPrice(key: string, text: string) {
    setCart((prev) => prev.map((c) => c.key === key ? { ...c, sold_price_text: text, sold_price: Number(text) || 0 } : c));
  }

  const total = cart.reduce((s, c) => s + c.sold_price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const padLine = padKey ? cart.find((c) => c.key === padKey) : null;

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
                  <button onClick={() => updateLine(c.key, { quantity: Math.max(1, c.quantity - 1) })} className="px-3 py-1.5 text-neutral-600 font-bold">−</button>
                  <span className="px-2 text-sm w-8 text-center">{c.quantity}</span>
                  <button onClick={() => updateLine(c.key, { quantity: Math.min(c.max_stock, c.quantity + 1) })} className="px-3 py-1.5 text-neutral-600 font-bold">+</button>
                </div>
                {/* Prix : ouvre le pavé numérique au clic */}
                <button onClick={() => setPadKey(c.key)}
                  className="flex-1 border border-neutral-200 rounded-lg px-2 py-1.5 text-sm text-right font-medium bg-white">
                  {c.sold_price_text || "0"} MAD
                </button>
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
        <span className="text-2xl font-bold">{fmt(total)}</span>
      </div>
      <div className="mb-3">
        <label className="text-xs font-medium text-neutral-500 block mb-1">Paiement</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "cash", l: "Espèces", c: "bg-emerald-500 border-emerald-500" },
            { v: "card", l: "Carte", c: "bg-blue-500 border-blue-500" },
            { v: "transfer", l: "Virement", c: "bg-purple-500 border-purple-500" },
          ].map((m) => (
            <button key={m.v} onClick={() => setPayment(m.v)}
              className={`text-xs py-2.5 rounded-lg border font-medium ${payment === m.v ? `${m.c} text-white` : "bg-white text-neutral-700 border-neutral-200"}`}>
              {m.l}
            </button>
          ))}
        </div>
      </div>
      {message && (
        <div className={`text-sm rounded-lg px-3 py-2 mb-3 ${message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</div>
      )}
      <button onClick={checkout} disabled={cart.length === 0 || processing}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-4 font-bold text-lg disabled:opacity-40 disabled:bg-neutral-400">
        {processing ? "Encaissement…" : "✓ Encaisser"}
      </button>
    </>
  );

  return (
    <div className="lg:flex lg:gap-4 p-3 sm:p-4 lg:items-start">
      {scanFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {scanFeedback}
        </div>
      )}

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <input type="text" placeholder="Rechercher ou scanner un code-barres…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 mb-3" />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {categories.map((c) => {
            const col = categoryColor.get(c);
            const active = category === c;
            return (
              <button key={c} onClick={() => setCategory(c)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border ${
                  active
                    ? c === "Tous" ? "bg-neutral-900 text-white border-neutral-900" : `${col?.bg} text-white ${col?.border}`
                    : c === "Tous" ? "bg-white text-neutral-700 border-neutral-200" : `${col?.light} ${col?.text} ${col?.border}`
                }`}>
                {c}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.length === 0 ? (
            <p className="text-neutral-400 col-span-full py-8 text-center">Aucun produit trouvé.</p>
          ) : (
            filtered.map((p) => {
              const total = totalStock(p.sizes);
              const inCart = cart.filter((c) => c.product_id === p.id).reduce((s, c) => s + c.quantity, 0);
              const left = total - inCart;
              const col = p.category ? categoryColor.get(p.category) : null;
              return (
                <button key={p.id} onClick={() => onProductClick(p)} disabled={left <= 0}
                  className="text-left bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-400 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className={`h-1.5 w-full ${col?.bg || "bg-neutral-200"}`}></div>
                  <div className="p-3">
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
                  </div>
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
          className="lg:hidden fixed bottom-4 left-3 right-3 bg-emerald-600 text-white rounded-xl py-3.5 font-bold flex items-center justify-between px-5 shadow-lg z-30">
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

      {/* Pavé numérique pour le prix */}
      <NumPad
        open={padKey !== null}
        initialValue={padLine?.sold_price_text || ""}
        label={padLine ? `Prix — ${padLine.name} (${padLine.size})` : "Prix"}
        onConfirm={(v) => { if (padKey) setPrice(padKey, v); }}
        onClose={() => setPadKey(null)}
      />

      {ticket && (
        <Ticket data={ticket} width={ticketWidth} onWidthChange={setTicketWidth} onClose={() => setTicket(null)} />
      )}
    </div>
  );
}