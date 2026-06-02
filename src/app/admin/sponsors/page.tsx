"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Building2, Upload, ImageIcon, Pencil, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  description?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  active: boolean;
  showInHome: boolean;
}

function EditModal({ sponsor, onClose, onSaved }: { sponsor: Sponsor; onClose: () => void; onSaved: (s: Sponsor) => void }) {
  const [form, setForm] = useState({
    name: sponsor.name,
    websiteUrl: sponsor.websiteUrl || "",
    description: sponsor.description || "",
    instagramUrl: sponsor.instagramUrl || "",
    tiktokUrl: sponsor.tiktokUrl || "",
    youtubeUrl: sponsor.youtubeUrl || "",
    active: sponsor.active,
    showInHome: sponsor.showInHome,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/sponsors/${sponsor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          websiteUrl: form.websiteUrl.trim() || null,
          description: form.description.trim() || null,
          instagramUrl: form.instagramUrl.trim() || null,
          tiktokUrl: form.tiktokUrl.trim() || null,
          youtubeUrl: form.youtubeUrl.trim() || null,
          active: form.active,
          showInHome: form.showInHome,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al guardar"); return; }
      onSaved(data.sponsor);
      toast.success("Sponsor actualizado");
      onClose();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/75 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-lg p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black uppercase text-white">Editar Sponsor</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex flex-col gap-4">
            <Input label="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Sitio web" placeholder="https://..." value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} />
            <Input label="Instagram" placeholder="https://instagram.com/..." value={form.instagramUrl} onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))} />
            <Input label="TikTok" placeholder="https://tiktok.com/@..." value={form.tiktokUrl} onChange={e => setForm(f => ({ ...f, tiktokUrl: e.target.value }))} />
            <Input label="YouTube" placeholder="https://youtube.com/..." value={form.youtubeUrl} onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))} />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Descripción</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 resize-none"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="sr-only" />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.active ? "bg-green-600" : "bg-[#333]"} relative`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-gray-400">Activo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.showInHome} onChange={e => setForm(f => ({ ...f, showInHome: e.target.checked }))} className="sr-only" />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.showInHome ? "bg-blue-600" : "bg-[#333]"} relative`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.showInHome ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-gray-400">Visible en home</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="primary" size="md" loading={saving} onClick={save} className="flex-1">Guardar cambios</Button>
              <Button variant="secondary" size="md" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const loadSponsors = () =>
    apiFetch("/api/admin/sponsors").then(async (r) => {
      const data = await r.json();
      if (r.ok) setSponsors(data.sponsors || []);
    });

  useEffect(() => {
    loadSponsors().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!logoFile) { setLogoPreview(null); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const createSponsor = async () => {
    if (!name.trim()) { toast.error("El nombre es requerido"); return; }
    if (!logoFile) { toast.error("Subí el logo del sponsor"); return; }
    setCreating(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      if (website.trim()) form.append("websiteUrl", website.trim());
      form.append("logo", logoFile);
      const res = await apiFetch("/api/admin/sponsors", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al crear sponsor"); return; }
      setSponsors(prev => [...prev, data.sponsor]);
      setName(""); setWebsite(""); setLogoFile(null);
      if (createInputRef.current) createInputRef.current.value = "";
      toast.success("Sponsor creado");
    } catch { toast.error("Error de conexión"); }
    finally { setCreating(false); }
  };

  const updateLogo = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const form = new FormData();
      form.append("logo", file);
      const res = await apiFetch(`/api/admin/sponsors/${id}`, { method: "PUT", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al actualizar logo"); return; }
      setSponsors(prev => prev.map(s => s.id === id ? data.sponsor : s));
      toast.success("Logo actualizado");
    } catch { toast.error("Error de conexión"); }
    finally { setUploadingId(null); }
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm("¿Eliminar este sponsor?")) return;
    const res = await apiFetch(`/api/admin/sponsors/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Error al eliminar"); return; }
    setSponsors(prev => prev.filter(s => s.id !== id));
    toast.success("Sponsor eliminado");
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white">Sponsors</h1>
        <p className="text-gray-500 text-sm">{sponsors.length} sponsors registrados</p>
      </div>

      {/* Create form */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Nuevo sponsor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Input placeholder="Nombre del sponsor" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Sitio web (opcional)" value={website} onChange={e => setWebsite(e.target.value)} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Logo (imagen)</label>
            <input
              ref={createInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="block w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white file:font-semibold file:text-xs file:uppercase hover:file:bg-red-500"
              onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-gray-600 text-xs mt-1">JPG, PNG, WebP, GIF o SVG · máx. 2 MB</p>
          </div>
          {logoPreview && (
            <div className="h-16 w-28 rounded-xl border border-[#333] bg-[#111] flex items-center justify-center p-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="Vista previa" className="max-h-full max-w-full object-contain" />
            </div>
          )}
        </div>
        <Button variant="primary" size="sm" loading={creating} onClick={createSponsor}>
          <Plus className="w-4 h-4" /> Agregar sponsor
        </Button>
      </Card>

      {sponsors.length === 0 && (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No hay sponsors registrados aún</p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sponsors.map(s => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-20 h-14 bg-[#1a1a1a] border border-[#333] rounded-xl flex items-center justify-center p-2">
                {s.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logoUrl} alt={s.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingSponsor(s)} className="text-gray-600 hover:text-white" type="button" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteSponsor(s.id)} className="text-gray-600 hover:text-red-400" type="button" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-white font-bold">{s.name}</h3>
            {s.websiteUrl && (
              <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline break-all">
                {s.websiteUrl}
              </a>
            )}
            <div className="mt-2 mb-3 flex items-center gap-2 flex-wrap">
              <Badge variant={s.active ? "success" : "default"}>{s.active ? "Activo" : "Inactivo"}</Badge>
              <Badge variant={s.showInHome ? "info" : "default"}>{s.showInHome ? "Visible en home" : "Oculto en home"}</Badge>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white cursor-pointer border border-[#333] rounded-lg px-3 py-1.5 hover:border-red-600/40 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                disabled={uploadingId === s.id}
                onChange={e => { const file = e.target.files?.[0]; if (file) updateLogo(s.id, file); e.target.value = ""; }}
              />
              <Upload className="w-3.5 h-3.5" />
              {uploadingId === s.id ? "Subiendo..." : "Cambiar logo"}
            </label>
          </Card>
        ))}
      </div>

      {editingSponsor && (
        <EditModal
          sponsor={editingSponsor}
          onClose={() => setEditingSponsor(null)}
          onSaved={updated => setSponsors(prev => prev.map(s => s.id === updated.id ? updated : s))}
        />
      )}
    </div>
  );
}
