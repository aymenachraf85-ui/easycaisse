"use client";

import { useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  cost_price: number;
  sell_price: number;
  barcode: string | null;
  low_stock_threshold: number;
  photo_url: string | null;
  archived: boolean;
};

const CATEGORIES = ["Homme", "Femme", "Enfant", "Accessoires"];

const emptyForm = {
  name: "", brand: "", category: "", size: "", color: "",
  quantity: 0, cost_price: 0, sell_price: 0, barcode: "",
  low_stock_threshold: 0, photo_url: "",
};

function fmt(n: number) {
  return (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProduitsClient({ initialProducts }: { initialProducts: Product[] }) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);

  const visible = useMemo(() => {
    let list = products.filter((p) => (showArchived ? p.archived : !p.archived));
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q));
    return list;
  }, [products, showArchived, search]);

  async function refresh() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, file);
    if (error) {
      alert("Erreur upload : " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setUploading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name, brand: p.brand || "", category: p.category || "",
      size: p.size || "", color: p.color || "", quantity: p.quantity,
      cost_price: p.cost_price, sell_price: p.sell_price,
      barcode: p.barcode || "", low_stock_threshold: p.low_stock_threshold,
      photo_url: p.photo_url || "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.name.trim()) {
      alert("Le nom du produit est obligatoire");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category: form.category.trim() || null,
      size: form.size.trim() || null,
      color: form.color.trim() || null,
      quantity: Number(form.quantity) || 0,
      cost_price: Number(form.cost_price) || 0,
      sell_price: Number(form.sell_price) || 0,
      barcode: form.barcode.trim() || null,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      photo_url: form.photo_url.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("products").insert(payload));
    }

    setSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    refresh();
  }

  async function archive(id: string, name: string) {
    if (!confirm(`Archiver "${name}" ? Il sera retiré de la caisse mais l'historique des ventes sera conservé.`)) return;
    const { error } = await supabase.from("products").update({ archived: true }).eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    refresh();
  }

  async function unarchive(id: string) {
    const { error } = await supabase.from("products").update({ archived: false }).eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    refresh();
  }

  const input = "border border-neutral-300 rounded-lg px-3 py-2 w-full";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Produits</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`rounded-lg px-3 py-2 text-sm font-medium border ${showArchived ? "bg-neutral-200 border-neutral-300" : "bg-white border-neutral-200"}`}
          >
            {showArchived ? "← Produits actifs" : "Voir archivés"}
          </button>
          {!showArchived && (
            <button onClick={openAdd} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium">
              + Ajouter
            </button>
          )}
        </div>
      </div>

      <input
        type="text"
        placeholder="Rechercher…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-neutral-300 rounded-lg px-4 py-2 mb-4"
      />

      {showForm && !showArchived && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 mb-6">
          <h2 className="font-semibold mb-4">{editingId ? "Modifier le produit" : "Nouveau produit"}</h2>

          <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start">
            <div className="w-28 h-28 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo_url} alt="aperçu" className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-400 text-xs text-center px-2">Aucune photo</span>
              )}
            </div>
            <div className="flex-1 w-full">
              <label className="text-sm font-medium block mb-1">Photo (optionnel)</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="block text-sm mb-2" />
              {uploading && <p className="text-xs text-neutral-500 mb-2">Upload en cours…</p>}
              <label className="text-sm font-medium block mb-1">Ou lien d&apos;image</label>
              <input className={input} placeholder="https://…" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <div><label className="text-sm font-medium block mb-1">Nom *</label>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Catégorie</label>
              <input list="cat-list" className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Homme, Femme…" />
              <datalist id="cat-list">
                {CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div><label className="text-sm font-medium block mb-1">Marque</label>
              <input className={input} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Taille</label>
              <input className={input} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Couleur</label>
              <input className={input} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Code-barres</label>
              <input className={input} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Quantité</label>
              <input type="number" className={input} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
            <div><label className="text-sm font-medium block mb-1">Prix d&apos;achat (MAD)</label>
              <input type="number" className={input} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} /></div>
            <div><label className="text-sm font-medium block mb-1">Prix de vente (MAD)</label>
              <input type="number" className={input} value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: Number(e.target.value) })} /></div>
            <div><label className="text-sm font-medium block mb-1">Seuil stock faible</label>
              <input type="number" className={input} value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} /></div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving || uploading} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50">
              {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Ajouter le produit"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="border border-neutral-300 rounded-lg px-4 py-2 font-medium">
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="sm:hidden space-y-3">
        {visible.length === 0 ? (
          <p className="text-center text-neutral-400 py-8">Aucun produit.</p>
        ) : (
          visible.map((p) => (
            <div key={p.id} className={`bg-white border rounded-xl p-3 flex gap-3 ${p.quantity <= p.low_stock_threshold && !p.archived ? "border-red-200" : "border-neutral-200"}`}>
              <div className="w-16 h-16 rounded-lg bg-neutral-50 overflow-hidden shrink-0 flex items-center justify-center">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                ) : <span className="text-neutral-300 text-xs">—</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-neutral-500">{[p.category, p.size, p.color].filter(Boolean).join(" · ")}</div>
                <div className="text-sm mt-1">{fmt(p.sell_price)} MAD · <span className={p.quantity <= p.low_stock_threshold ? "text-red-600" : ""}>{p.quantity} en stock</span></div>
                <div className="flex gap-3 mt-2">
                  {p.archived ? (
                    <button onClick={() => unarchive(p.id)} className="text-green-600 text-xs font-medium">Réactiver</button>
                  ) : (
                    <>
                      <button onClick={() => openEdit(p)} className="text-blue-600 text-xs font-medium">Modifier</button>
                      <button onClick={() => archive(p.id, p.name)} className="text-orange-600 text-xs font-medium">Archiver</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block bg-white border border-neutral-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Photo</th>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">Catégorie</th>
              <th className="text-left px-3 py-2">Taille</th>
              <th className="text-left px-3 py-2">Qté</th>
              <th className="text-left px-3 py-2">Prix vente</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-neutral-400 py-8">Aucun produit.</td></tr>
            ) : (
              visible.map((p) => (
                <tr key={p.id} className={`border-t border-neutral-100 ${p.quantity <= p.low_stock_threshold && !p.archived ? "bg-red-50" : ""}`}>
                  <td className="px-3 py-2">
                    <div className="w-10 h-10 rounded-md border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : <span className="text-neutral-300 text-[10px]">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">{p.category || "—"}</td>
                  <td className="px-3 py-2">{p.size || "—"}</td>
                  <td className={`px-3 py-2 ${p.quantity <= p.low_stock_threshold && !p.archived ? "text-red-600 font-medium" : ""}`}>{p.quantity}</td>
                  <td className="px-3 py-2">{fmt(p.sell_price)} MAD</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {p.archived ? (
                      <button onClick={() => unarchive(p.id)} className="text-green-600 text-xs hover:underline">Réactiver</button>
                    ) : (
                      <>
                        <button onClick={() => openEdit(p)} className="text-blue-600 text-xs hover:underline mr-3">Modifier</button>
                        <button onClick={() => archive(p.id, p.name)} className="text-orange-600 text-xs hover:underline">Archiver</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}