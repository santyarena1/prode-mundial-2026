"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Building2, Upload, ImageIcon } from "lucide-react";
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
  active: boolean;
  showInHome: boolean;
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
  const createInputRef = useRef<HTMLInputElement>(null);

  const loadSponsors = () => {
    return apiFetch("/api/admin/sponsors")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) setSponsors(data.sponsors || []);
      });
  };

  useEffect(() => {
    loadSponsors().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const onPickLogo = (file: File | null) => {
    setLogoFile(file);
  };

  const createSponsor = async () => {
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!logoFile) {
      toast.error("Subí el logo del sponsor");
      return;
    }

    setCreating(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      if (website.trim()) form.append("websiteUrl", website.trim());
      form.append("logo", logoFile);

      const res = await apiFetch("/api/admin/sponsors", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al crear sponsor");
        return;
      }
      setSponsors((prev) => [...prev, data.sponsor]);
      setName("");
      setWebsite("");
      setLogoFile(null);
      if (createInputRef.current) createInputRef.current.value = "";
      toast.success("Sponsor creado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const updateLogo = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const form = new FormData();
      form.append("logo", file);

      const res = await apiFetch(`/api/admin/sponsors/${id}`, {
        method: "PUT",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar logo");
        return;
      }
      setSponsors((prev) => prev.map((s) => (s.id === id ? data.sponsor : s)));
      toast.success("Logo actualizado");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUploadingId(null);
    }
  };

  const toggleShowInHome = async (id: string, current: boolean) => {
    const res = await apiFetch(`/api/admin/sponsors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showInHome: !current }),
    });
    if (!res.ok) { toast.error("Error al actualizar"); return; }
    const data = await res.json();
    setSponsors((prev) => prev.map((s) => (s.id === id ? data.sponsor : s)));
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm("¿Eliminar este sponsor?")) return;
    const res = await apiFetch(`/api/admin/sponsors/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Error al eliminar");
      return;
    }
    setSponsors((prev) => prev.filter((s) => s.id !== id));
    toast.success("Sponsor eliminado");
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase text-white">Sponsors</h1>
        <p className="text-gray-500 text-sm">{sponsors.length} sponsors registrados</p>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
          Nuevo sponsor
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Input
            placeholder="Nombre del sponsor"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Sitio web (opcional)"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Logo (imagen)
            </label>
            <input
              ref={createInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="block w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-red-600 file:text-white file:font-semibold file:text-xs file:uppercase hover:file:bg-red-500"
              onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
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
        {sponsors.map((s) => (
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
              <button
                onClick={() => deleteSponsor(s.id)}
                className="text-gray-600 hover:text-red-400"
                type="button"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-white font-bold">{s.name}</h3>
            {s.websiteUrl && (
              <a
                href={s.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs hover:underline break-all"
              >
                {s.websiteUrl}
              </a>
            )}
            <div className="mt-2 mb-3 flex items-center gap-2 flex-wrap">
              <Badge variant={s.active ? "success" : "default"}>
                {s.active ? "Activo" : "Inactivo"}
              </Badge>
              <button
                type="button"
                onClick={() => toggleShowInHome(s.id, s.showInHome)}
                className={`text-xs font-bold px-2 py-0.5 rounded-full border transition-colors ${
                  s.showInHome
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:border-blue-500/60"
                    : "bg-[#1a1a1a] border-[#333] text-gray-600 hover:border-[#444]"
                }`}
              >
                {s.showInHome ? "Visible en home" : "Oculto en home"}
              </button>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white cursor-pointer border border-[#333] rounded-lg px-3 py-1.5 hover:border-red-600/40 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                disabled={uploadingId === s.id}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) updateLogo(s.id, file);
                  e.target.value = "";
                }}
              />
              <Upload className="w-3.5 h-3.5" />
              {uploadingId === s.id ? "Subiendo..." : "Cambiar logo"}
            </label>
          </Card>
        ))}
      </div>
    </div>
  );
}
