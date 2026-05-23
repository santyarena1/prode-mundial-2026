"use client";

import { useEffect, useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import toast from "react-hot-toast";
import { Plus, Trash2, CheckCircle2, XCircle, Star, Edit2, X, Upload, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

const PRIZE_TYPES = [
  { value: "physical", label: "Físico" },
  { value: "digital", label: "Digital" },
  { value: "coupon", label: "Cupón" },
  { value: "raffle", label: "Sorteo" },
  { value: "ranking", label: "Ranking" },
  { value: "jackpot", label: "Jackpot" },
];

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface Prize {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  requiredPoints: number;
  stock: number;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  prizeType: string;
  maxPerUser?: number | null;
  maxTotal?: number | null;
  sponsorId?: string | null;
  sponsor?: Sponsor | null;
}

interface Redemption {
  id: string;
  status: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  prize: { name: string; requiredPoints: number };
}

const emptyForm = {
  name: "", description: "", imageUrl: "", requiredPoints: "", stock: "",
  prizeType: "physical", featured: false, sortOrder: "0", maxPerUser: "", maxTotal: "", sponsorId: "",
};

function ImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const toWebP = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            const name = file.name.replace(/\.[^.]+$/, ".webp");
            resolve(blob ? new File([blob], name, { type: "image/webp" }) : file);
          },
          "image/webp",
          0.85,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const webpFile = await toWebP(file);
      const blob = await upload(webpFile.name, webpFile, {
        access: "public",
        handleUploadUrl: "/api/admin/prizes/upload-image",
      });
      onChange(blob.url);
      toast.success("Imagen subida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeImage = async () => {
    if (value?.includes("blob.vercel-storage.com")) {
      await fetch("/api/admin/prizes/upload-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
    }
    onChange("");
  };

  return (
    <div className="sm:col-span-2">
      <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Imagen</label>
      {value ? (
        <div className="relative inline-flex group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Premio" className="h-28 w-auto max-w-full object-contain rounded-xl bg-[#1a1a1a] border border-[#333] p-2" />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed border-[#333] hover:border-red-500/50 rounded-xl cursor-pointer transition-colors bg-[#1a1a1a] hover:bg-[#1e1e1e]"
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-red-500 rounded-full animate-spin" />
              Subiendo...
            </div>
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-600" />
              <p className="text-gray-600 text-xs text-center">
                Arrastrá o hacé clic para subir<br />
                <span className="text-gray-700">JPG, PNG, WebP · máx. 3 MB</span>
              </p>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

function SponsorOverlay({ sponsor }: { sponsor?: Sponsor | null }) {
  if (!sponsor?.logoUrl) return null;
  return (
    <div className="absolute bottom-0 right-0 pointer-events-none">
      <div className="absolute bottom-0 right-0 w-14 h-14 bg-gradient-to-tl from-black/75 via-black/30 to-transparent rounded-tl-xl" />
      <div className="absolute bottom-1.5 right-1.5 w-6 h-6 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sponsor.logoUrl} alt={sponsor.name} className="max-w-full max-h-full object-contain drop-shadow-lg" />
      </div>
    </div>
  );
}

export default function AdminPrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"prizes" | "redemptions">("prizes");
  const [newPrize, setNewPrize] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof emptyForm & { active: boolean }>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init = async () => {
      const [pRes, rRes, sRes] = await Promise.all([
        fetch("/api/admin/prizes"),
        fetch("/api/admin/redemptions"),
        fetch("/api/public/sponsors"),
      ]);
      if (pRes.ok) setPrizes((await pRes.json()).prizes || []);
      if (rRes.ok) setRedemptions((await rRes.json()).redemptions || []);
      if (sRes.ok) setSponsors((await sRes.json()).sponsors || []);
      setLoading(false);
    };
    init();
  }, []);

  const featuredCount = prizes.filter(p => p.featured).length;

  const createPrize = async () => {
    if (!newPrize.name || !newPrize.description || !newPrize.requiredPoints) {
      toast.error("Nombre, descripción y puntos son requeridos");
      return;
    }
    if (newPrize.featured && featuredCount >= 3) {
      toast.error("Ya hay 3 premios destacados en el home. Quitá uno antes.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPrize.name,
          description: newPrize.description,
          imageUrl: newPrize.imageUrl || undefined,
          requiredPoints: parseInt(newPrize.requiredPoints),
          stock: parseInt(newPrize.stock) || 0,
          active: true,
          featured: newPrize.featured,
          sortOrder: parseInt(newPrize.sortOrder) || 0,
          prizeType: newPrize.prizeType,
          maxPerUser: newPrize.maxPerUser ? parseInt(newPrize.maxPerUser) : null,
          maxTotal: newPrize.maxTotal ? parseInt(newPrize.maxTotal) : null,
          sponsorId: newPrize.sponsorId || null,
        }),
      });
      if (!res.ok) { toast.error("Error al crear premio"); return; }
      const data = await res.json();
      setPrizes(prev => [...prev, data.prize]);
      setNewPrize(emptyForm);
      toast.success("Premio creado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const deletePrize = async (id: string) => {
    if (!confirm("¿Eliminar este premio?")) return;
    const res = await fetch(`/api/admin/prizes/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setPrizes(prev => prev.filter(p => p.id !== id));
    toast.success("Premio eliminado");
  };

  const toggleFeatured = async (prize: Prize) => {
    const newFeatured = !prize.featured;
    if (newFeatured && featuredCount >= 3) {
      toast.error("Máximo 3 premios destacados en home. Quitá uno primero.");
      return;
    }
    setSaving(prev => ({ ...prev, [prize.id]: true }));
    try {
      const res = await fetch(`/api/admin/prizes/${prize.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: newFeatured }),
      });
      if (!res.ok) { toast.error("Error"); return; }
      setPrizes(prev => prev.map(p => p.id === prize.id ? { ...p, featured: newFeatured } : p));
      toast.success(newFeatured ? "Destacado en home" : "Quitado del home");
    } finally {
      setSaving(prev => ({ ...prev, [prize.id]: false }));
    }
  };

  const saveEdit = async (id: string) => {
    if (editForm.featured && !prizes.find(p => p.id === id)?.featured && featuredCount >= 3) {
      toast.error("Máximo 3 premios destacados en home.");
      return;
    }
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const body: Record<string, unknown> = {};
      if (editForm.name !== undefined) body.name = editForm.name;
      if (editForm.description !== undefined) body.description = editForm.description;
      if (editForm.imageUrl !== undefined) body.imageUrl = editForm.imageUrl || undefined;
      if (editForm.requiredPoints !== undefined) body.requiredPoints = parseInt(editForm.requiredPoints as string) || 0;
      if (editForm.stock !== undefined) body.stock = parseInt(editForm.stock as string) || 0;
      if (editForm.prizeType !== undefined) body.prizeType = editForm.prizeType;
      if (editForm.sortOrder !== undefined) body.sortOrder = parseInt(editForm.sortOrder as string) || 0;
      if (editForm.featured !== undefined) body.featured = editForm.featured;
      if (editForm.active !== undefined) body.active = editForm.active;
      if (editForm.maxPerUser !== undefined) body.maxPerUser = editForm.maxPerUser ? parseInt(editForm.maxPerUser as string) : null;
      if (editForm.maxTotal !== undefined) body.maxTotal = editForm.maxTotal ? parseInt(editForm.maxTotal as string) : null;
      if (editForm.sponsorId !== undefined) body.sponsorId = editForm.sponsorId || null;

      const res = await fetch(`/api/admin/prizes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toast.error("Error al guardar"); return; }
      const data = await res.json();
      setPrizes(prev => prev.map(p => p.id === id ? data.prize : p));
      setEditingId(null);
      toast.success("Premio actualizado");
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const updateRedemption = async (id: string, status: "approved" | "rejected") => {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/admin/redemptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Error al actualizar"); return; }
      setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success(status === "approved" ? "Canje aprobado" : "Canje rechazado");
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <LoadingScreen />;

  const pending = redemptions.filter(r => r.status === "pending");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Premios</h1>
          <p className="text-gray-500 text-sm">
            {prizes.length} premios · {featuredCount}/3 en home · {pending.length} canjes pendientes
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-[#111] border border-[#222] rounded-xl p-1 mb-6 max-w-xs">
        {(["prizes", "redemptions"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab === "prizes" ? "Premios" : `Canjes ${pending.length > 0 ? `(${pending.length})` : ""}`}
          </button>
        ))}
      </div>

      {activeTab === "prizes" && (
        <div className="space-y-4">
          {/* Create form */}
          <Card className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Nuevo premio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Input placeholder="Nombre" value={newPrize.name} onChange={e => setNewPrize(p => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Descripción" value={newPrize.description} onChange={e => setNewPrize(p => ({ ...p, description: e.target.value }))} />
              <ImageUploader value={newPrize.imageUrl} onChange={url => setNewPrize(p => ({ ...p, imageUrl: url }))} />
              <Input type="number" placeholder="Puntos requeridos" value={newPrize.requiredPoints} onChange={e => setNewPrize(p => ({ ...p, requiredPoints: e.target.value }))} />
              <Input type="number" placeholder="Stock" value={newPrize.stock} onChange={e => setNewPrize(p => ({ ...p, stock: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-gray-500 text-xs uppercase tracking-wider">Tipo</label>
                <select
                  value={newPrize.prizeType}
                  onChange={e => setNewPrize(p => ({ ...p, prizeType: e.target.value }))}
                  className="bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                >
                  {PRIZE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <Input type="number" placeholder="Orden (0=primero)" value={newPrize.sortOrder} onChange={e => setNewPrize(p => ({ ...p, sortOrder: e.target.value }))} />
              <Input type="number" placeholder="Máx. canjes por usuario" value={newPrize.maxPerUser} onChange={e => setNewPrize(p => ({ ...p, maxPerUser: e.target.value }))} />
              <Input type="number" placeholder="Máx. canjes total" value={newPrize.maxTotal} onChange={e => setNewPrize(p => ({ ...p, maxTotal: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-gray-500 text-xs uppercase tracking-wider">Sponsor (logo en imagen)</label>
                <select
                  value={newPrize.sponsorId}
                  onChange={e => setNewPrize(p => ({ ...p, sponsorId: e.target.value }))}
                  className="bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                >
                  <option value="">Sin sponsor</option>
                  {sponsors.filter(s => s.logoUrl).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPrize.featured}
                  onChange={e => setNewPrize(p => ({ ...p, featured: e.target.checked }))}
                  className="w-4 h-4 accent-yellow-400"
                />
                <span className="text-gray-300 text-sm flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" /> Destacado en home
                  {featuredCount >= 3 && <span className="text-red-400 text-xs">(máx. 3)</span>}
                </span>
              </label>
            </div>
            <Button variant="primary" size="sm" loading={creating} onClick={createPrize}>
              <Plus className="w-4 h-4" /> Crear premio
            </Button>
          </Card>

          {/* Prize list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.map(p => (
              <Card key={p.id} className={`p-4 ${p.featured ? "border-yellow-500/30" : ""}`}>
                {editingId === p.id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nombre"
                      defaultValue={p.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Descripción"
                      defaultValue={p.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    />
                    <ImageUploader
                      value={editForm.imageUrl !== undefined ? editForm.imageUrl : (p.imageUrl || "")}
                      onChange={url => setEditForm(f => ({ ...f, imageUrl: url }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Puntos" defaultValue={p.requiredPoints} onChange={e => setEditForm(f => ({ ...f, requiredPoints: e.target.value }))} />
                      <Input type="number" placeholder="Stock" defaultValue={p.stock} onChange={e => setEditForm(f => ({ ...f, stock: e.target.value }))} />
                      <Input type="number" placeholder="Orden" defaultValue={p.sortOrder} onChange={e => setEditForm(f => ({ ...f, sortOrder: e.target.value }))} />
                      <select
                        defaultValue={p.prizeType}
                        onChange={e => setEditForm(f => ({ ...f, prizeType: e.target.value }))}
                        className="bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-red-500"
                      >
                        {PRIZE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <select
                      defaultValue={p.sponsorId || ""}
                      onChange={e => setEditForm(f => ({ ...f, sponsorId: e.target.value }))}
                      className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-red-500"
                    >
                      <option value="">Sin sponsor</option>
                      {sponsors.filter(s => s.logoUrl).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div className="flex gap-3 text-xs text-gray-400">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" defaultChecked={p.featured} onChange={e => setEditForm(f => ({ ...f, featured: e.target.checked }))} className="accent-yellow-400" />
                        <Star className="w-3 h-3 text-yellow-400" /> Home
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" defaultChecked={p.active} onChange={e => setEditForm(f => ({ ...f, active: e.target.checked }))} className="accent-green-500" />
                        Activo
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" loading={saving[p.id]} onClick={() => saveEdit(p.id)}>Guardar</Button>
                      <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setEditForm({}); }}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {p.featured && <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                        <h3 className="text-white font-bold text-sm line-clamp-1">{p.name}</h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button onClick={() => { setEditingId(p.id); setEditForm({}); }} className="text-gray-600 hover:text-blue-400">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deletePrize(p.id)} className="text-gray-600 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="relative w-full aspect-[5/2] rounded-lg bg-[#1a1a1a] mb-2 overflow-hidden">
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />  // eslint-disable-line @next/next/no-img-element
                        : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-gray-700" /></div>
                      }
                      <SponsorOverlay sponsor={p.sponsor} />
                    </div>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-yellow-400 font-bold text-sm">{p.requiredPoints.toLocaleString()} pts</span>
                      <Badge variant={p.active ? "success" : "default"}>{p.active ? "Activo" : "Inactivo"}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Stock: {p.stock}</span>
                      <span className="capitalize">{p.prizeType}</span>
                    </div>
                    <button
                      onClick={() => toggleFeatured(p)}
                      disabled={saving[p.id]}
                      className={`mt-2 w-full py-1 rounded text-xs font-bold transition-colors ${
                        p.featured
                          ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                          : "bg-[#1a1a1a] text-gray-500 hover:text-yellow-400"
                      }`}
                    >
                      <Star className="w-3 h-3 inline mr-1" />
                      {p.featured ? "Quitár del home" : "Destacar en home"}
                    </button>
                  </>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "redemptions" && (
        <div className="space-y-3">
          {redemptions.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No hay canjes registrados</p>
            </Card>
          )}
          {redemptions.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-white font-medium">{r.user.firstName} {r.user.lastName}</div>
                  <div className="text-gray-500 text-xs">{r.user.email}</div>
                  <div className="text-gray-400 text-sm mt-1">
                    Premio: <span className="font-semibold">{r.prize.name}</span>
                    <span className="text-gray-600 ml-2">({r.prize.requiredPoints} pts)</span>
                  </div>
                  <div className="text-gray-700 text-xs mt-0.5">
                    {new Date(r.createdAt).toLocaleString("es-AR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "error" : "warning"}>
                    {r.status}
                  </Badge>
                  {r.status === "pending" && (
                    <>
                      <Button variant="primary" size="sm" loading={saving[r.id]} onClick={() => updateRedemption(r.id, "approved")} className="bg-green-600 hover:bg-green-500">
                        <CheckCircle2 className="w-3 h-3" /> Aprobar
                      </Button>
                      <Button variant="danger" size="sm" loading={saving[r.id]} onClick={() => updateRedemption(r.id, "rejected")}>
                        <XCircle className="w-3 h-3" /> Rechazar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
