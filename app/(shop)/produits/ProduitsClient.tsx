"use client";

import { useState, useRef } from "react";
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
};

export default function ProduitsClient({ initialProducts }: { initialProducts: Product[] }) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    name: "", brand: "", category: "", size: "", color: "",
    quantity: 0, cost_price: 0, sell_price: 0, barcode: "",
    low_stock_threshold: 0, photo_url: "",
  };
  const [form, setForm] = useState(emptyForm);

  async function refresh() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
  }

  // Upload d'un fichier image vers Supabase Storage
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);
    if (error) {
      alert("Erreur upload : " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    setUploading(false);
  }

  async function addProduct() {
    if (!form.name.trim()) {
      alert("Le nom du produit est obligatoire");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
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
    });
    setSaving(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    setForm(emptyForm);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(false);
    refresh();
  }

  async function updateField(id: string, field: keyof Product, value: string | number) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    await supabase.from("products").update({ [field]: value }).eq("id", id);
  }

  async function deleteProduct(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    await supabase.from("products").delete().eq("id", id);
    refresh();
  }

  const input = "border border-neutral-300 rounded-lg px-3 py-2 w-full";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produits</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium"
        >
          {showForm ? "Annuler" : "+ Ajouter un produit"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
          {/* Section photo */}
          <div className="flex gap-4 mb-4 items-start">
            <div className="w-28 h-28 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo_url} alt="aperçu" className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-400 text-xs text-center px-2">Aucune photo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium block mb-1">Photo du produit (optionnel)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block text-sm mb-2"
              />
              {uploading && <p className="text-xs text-neutral-500 mb-2">Upload en cours…</p>}
              <label className="text-sm font-medium block mb-1">Ou coller un lien d&apos;image</label>
              <input
                className={input}
                placeholder="https://…"
                value={form.photo_url}
                onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div><label className="text-sm font-medium block mb-1">Nom *</label>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Marque</label>
              <input className={input} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Catégorie</label>
              <input className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
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
          <button onClick={addProduct} disabled={saving || uploading} className="bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50">
            {saving ? "Enregistrement…" : "Enregistrer le produit"}
          </button>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Photo</th>
              <th className="text-left px-3 py-2">Nom</th>
              <th className="text-left px-3 py-2">Catégorie</th>
              <th className="text-left px-3 py-2">Taille</th>
              <th className="text-left px-3 py-2">Couleur</th>
              <th className="text-left px-3 py-2">Qté</th>
              <th className="text-left px-3 py-2">Prix vente</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-neutral-400 py-8">Aucun produit. Ajoutez-en un.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={`border-t border-neutral-100 ${p.quantity <= p.low_stock_threshold ? "bg-red-50" : ""}`}>
                  <td className="px-3 py-2">
                    <div className="w-12 h-12 rounded-md border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-neutral-300 text-[10px]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input className="bg-transparent w-full" value={p.name} onChange={(e) => updateField(p.id, "name", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="bg-transparent w-full" value={p.category || ""} onChange={(e) => updateField(p.id, "category", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="bg-transparent w-16" value={p.size || ""} onChange={(e) => updateField(p.id, "size", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="bg-transparent w-20" value={p.color || ""} onChange={(e) => updateField(p.id, "color", e.target.value)} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" className="bg-transparent w-16" value={p.quantity} onChange={(e) => updateField(p.id, "quantity", Number(e.target.value))} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" className="bg-transparent w-24" value={p.sell_price} onChange={(e) => updateField(p.id, "sell_price", Number(e.target.value))} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => deleteProduct(p.id, p.name)} className="text-red-600 text-xs hover:underline">Supprimer</button>
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
