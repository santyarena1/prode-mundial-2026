"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Send, Users, Link as LinkIcon, AlertTriangle, Search, X, ChevronDown, ChevronRight, Code2, AlignLeft, History, CheckCircle2, XCircle, Mail, Image as ImageIcon, Eye, Monitor, Smartphone, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";

type AudienceType = "all" | "prize" | "bonus" | "individual" | "missing_predictions";
type Tab = "send" | "history";

interface Prize {
  id: string;
  name: string;
}

interface BonusAction {
  id: string;
  name: string;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface EmailAsset {
  id: string;
  name: string;
  url: string;
}

interface EmailLogEntry {
  id: string;
  subject: string;
  message: string;
  ctaUrl: string | null;
  ctaLabel: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: string;
}

function AssetCard({
  name,
  url,
  onCopyUrl,
  onCopyImg,
}: {
  name: string;
  url: string;
  onCopyUrl: () => void;
  onCopyImg: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-[#141414] border border-[#2a2a2a] rounded-lg p-2">
      <div className="flex-shrink-0 w-12 h-12 bg-white rounded-md flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="max-w-full max-h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate" title={name}>{name}</p>
        <p className="text-[10px] text-gray-500 truncate" title={url}>{url}</p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onCopyUrl}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[10px] text-gray-300 font-semibold"
          title="Copiar URL"
        >
          <Copy className="w-3 h-3" /> URL
        </button>
        <button
          type="button"
          onClick={onCopyImg}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[10px] text-gray-300 font-semibold"
          title="Copiar etiqueta <img>"
        >
          <Copy className="w-3 h-3" /> &lt;img&gt;
        </button>
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const [tab, setTab] = useState<Tab>("send");

  // Audience state
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [bonusActions, setBonusActions] = useState<BonusAction[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState("");
  const [selectedBonusId, setSelectedBonusId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

  // Email state
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [rawHtml, setRawHtml] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // History state
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Assets + preview state
  const [sponsors, setSponsors] = useState<Array<{ id: string; name: string; logoUrl: string }>>([]);
  const [assets, setAssets] = useState<EmailAsset[]>([]);
  const [showAssets, setShowAssets] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No pude copiar");
    }
  };

  // Load options once
  useEffect(() => {
    apiFetch("/api/admin/prizes").then((r) => r.json()).then((d) => setPrizes(d.prizes ?? []));
    apiFetch("/api/admin/bonus-actions").then((r) => r.json()).then((d) => setBonusActions(d.bonusActions ?? []));
    apiFetch("/api/admin/participants").then((r) => r.json()).then((d) => setParticipants(d.users ?? []));
    apiFetch("/api/admin/email-assets")
      .then((r) => r.json())
      .then((d) => {
        setSponsors(d.sponsors ?? []);
        setAssets(d.assets ?? []);
      })
      .catch(() => {});
  }, []);

  // Regenerate preview when content/mode changes (only while panel is open)
  useEffect(() => {
    if (!showPreview) return;
    setPreviewLoading(true);
    apiFetch("/api/admin/announcements/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, ctaUrl, ctaLabel, rawHtml }),
    })
      .then((r) => r.text())
      .then((html) => setPreviewHtml(html))
      .catch(() => setPreviewHtml("<p style='color:#f00;padding:24px;font-family:sans-serif'>Error al generar el preview</p>"))
      .finally(() => setPreviewLoading(false));
  }, [showPreview, subject, message, ctaUrl, ctaLabel, rawHtml]);

  // Load history when tab changes
  useEffect(() => {
    if (tab !== "history") return;
    setLogsLoading(true);
    apiFetch("/api/admin/email-history")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLogsLoading(false));
  }, [tab]);

  // Recount recipients when filter changes
  const fetchCount = useCallback(() => {
    setRecipientCount(null);
    const params = new URLSearchParams({ filterType: audienceType });
    if (audienceType === "prize" && selectedPrizeId) params.set("filterId", selectedPrizeId);
    if (audienceType === "bonus" && selectedBonusId) params.set("filterId", selectedBonusId);
    if (audienceType === "individual" && selectedUserIds.length > 0)
      params.set("userIds", selectedUserIds.join(","));

    apiFetch(`/api/admin/announcements?${params}`)
      .then((r) => r.json())
      .then((d) => setRecipientCount(d.recipientCount ?? 0));
  }, [audienceType, selectedPrizeId, selectedBonusId, selectedUserIds]);

  useEffect(() => {
    if (audienceType === "prize" && !selectedPrizeId) return;
    if (audienceType === "bonus" && !selectedBonusId) return;
    if (audienceType === "individual" && selectedUserIds.length === 0) {
      setRecipientCount(0);
      return;
    }
    fetchCount();
  }, [audienceType, selectedPrizeId, selectedBonusId, selectedUserIds, fetchCount]);

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        subject,
        message,
        ctaUrl: rawHtml ? undefined : ctaUrl || undefined,
        ctaLabel: rawHtml ? undefined : ctaLabel || undefined,
        filterType: audienceType,
        rawHtml,
      };
      if (audienceType === "prize") body.filterId = selectedPrizeId;
      if (audienceType === "bonus") body.filterId = selectedBonusId;
      if (audienceType === "individual") body.userIds = selectedUserIds;

      const res = await apiFetch("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((r) => r.json());

      toast.success(`✅ Enviado a ${res.sent} participantes${res.failed > 0 ? ` (${res.failed} fallaron)` : ""}`);
      setSubject("");
      setMessage("");
      setCtaUrl("");
      setCtaLabel("");
    } catch {
      toast.error("Error al enviar el comunicado");
    } finally {
      setSending(false);
    }
  };

  const toggleUser = (id: string) =>
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredParticipants = participants.filter((p) => {
    const q = userSearch.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const canSend =
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    (audienceType !== "prize" || !!selectedPrizeId) &&
    (audienceType !== "bonus" || !!selectedBonusId) &&
    (audienceType !== "individual" || selectedUserIds.length > 0) &&
    (recipientCount ?? 0) > 0;

  const audienceLabel =
    audienceType === "all"
      ? "Todos los participantes"
      : audienceType === "missing_predictions"
      ? "Participantes con predicciones pendientes"
      : audienceType === "prize"
      ? prizes.find((p) => p.id === selectedPrizeId)?.name ?? "Premio seleccionado"
      : audienceType === "bonus"
      ? bonusActions.find((b) => b.id === selectedBonusId)?.name ?? "Bonus seleccionado"
      : `${selectedUserIds.length} usuario${selectedUserIds.length !== 1 ? "s" : ""} seleccionado${selectedUserIds.length !== 1 ? "s" : ""}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Comunicaciones</h2>
        <p className="text-sm text-gray-500 mt-1">Enviá emails a participantes y revisá el historial</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#111] border border-[#1a1a1a] rounded-xl w-fit">
        <button
          onClick={() => setTab("send")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "send" ? "bg-red-600 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Nuevo email
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "history" ? "bg-red-600 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Historial
        </button>
      </div>

      {tab === "send" && (
        <>
          {/* Audience selector */}
          <Card className="p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Audiencia</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(["all", "missing_predictions", "prize", "bonus", "individual"] as AudienceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setAudienceType(type);
                    setSelectedPrizeId("");
                    setSelectedBonusId("");
                    setSelectedUserIds([]);
                    setUserSearch("");
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                    audienceType === type
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {type === "all" && "Todos"}
                  {type === "missing_predictions" && "Faltan predicciones"}
                  {type === "prize" && "Por premio"}
                  {type === "bonus" && "Por bonus"}
                  {type === "individual" && "Individual"}
                </button>
              ))}
            </div>

            {/* Prize selector */}
            {audienceType === "prize" && (
              <div className="relative">
                <select
                  value={selectedPrizeId}
                  onChange={(e) => setSelectedPrizeId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 appearance-none"
                >
                  <option value="">Seleccioná un premio...</option>
                  {prizes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            )}

            {/* Bonus selector */}
            {audienceType === "bonus" && (
              <div className="relative">
                <select
                  value={selectedBonusId}
                  onChange={(e) => setSelectedBonusId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 appearance-none"
                >
                  <option value="">Seleccioná un bonus...</option>
                  {bonusActions.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            )}

            {/* Individual user picker */}
            {audienceType === "individual" && (
              <div className="space-y-3">
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUserIds.map((id) => {
                      const u = participants.find((p) => p.id === id);
                      return (
                        <span
                          key={id}
                          className="flex items-center gap-1 bg-red-600/20 border border-red-600/30 text-red-400 text-xs px-2 py-1 rounded-full"
                        >
                          {u ? `${u.firstName} ${u.lastName}` : id}
                          <button onClick={() => toggleUser(id)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-[#2a2a2a] divide-y divide-[#1e1e1e]">
                  {filteredParticipants.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Sin resultados</p>
                  ) : (
                    filteredParticipants.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(p.id)}
                          onChange={() => toggleUser(p.id)}
                          className="accent-red-600"
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{p.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Recipient count */}
            <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
              <Users className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-white font-bold">
                  {recipientCount === null ? "..." : recipientCount.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm ml-1.5">
                  destinatario{recipientCount !== 1 ? "s" : ""} · {audienceLabel}
                </span>
              </div>
            </div>
          </Card>

          {/* Email form */}
          <Card className="p-6 space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Asunto *</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: ¡Ya arrancó el Mundial! 🎉"
                maxLength={200}
              />
              <div className="text-right text-xs text-gray-600">{subject.length}/200</div>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-2 p-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-fit">
              <button
                onClick={() => { setRawHtml(false); setMessage(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  !rawHtml ? "bg-red-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                Con plantilla
              </button>
              <button
                onClick={() => { setRawHtml(true); setMessage(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  rawHtml ? "bg-red-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                HTML libre
              </button>
            </div>

            {rawHtml ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  HTML del email *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={"<!DOCTYPE html>\n<html>\n<body>\n  ...\n</body>\n</html>"}
                  rows={16}
                  spellCheck={false}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-3 text-green-400 text-xs font-mono placeholder-gray-700 focus:outline-none focus:border-red-500/50 resize-y"
                />
                <p className="text-xs text-gray-600">El HTML se envía tal cual, sin ninguna plantilla alrededor.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mensaje *</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribí el cuerpo del email. Podés usar saltos de línea."
                    maxLength={5000}
                    rows={8}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500/50 resize-none"
                  />
                  <div className="text-right text-xs text-gray-600">{message.length}/5000</div>
                </div>

                <div className="border border-[#2a2a2a] rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <LinkIcon className="w-3.5 h-3.5" />
                    Botón de acción (opcional)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">URL</label>
                      <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Texto del botón</label>
                      <Input
                        value={ctaLabel}
                        onChange={(e) => setCtaLabel(e.target.value)}
                        placeholder="Ver mis predicciones"
                        maxLength={60}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Assets panel */}
            <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAssets((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#141414] hover:bg-[#1a1a1a] transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <ImageIcon className="w-4 h-4 text-red-400" />
                  Imágenes y logos disponibles
                  <span className="text-gray-500 normal-case font-normal">({sponsors.length + assets.length})</span>
                </span>
                {showAssets ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              </button>
              {showAssets && (
                <div className="p-4 space-y-4 bg-[#0d0d0d]">
                  <p className="text-xs text-gray-500">
                    Copiá la URL o la etiqueta <code className="text-gray-400">&lt;img&gt;</code> lista para pegar en HTML libre o en CTAs.
                  </p>

                  {sponsors.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Sponsors</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sponsors.map((s) => (
                          <AssetCard
                            key={s.id}
                            name={s.name}
                            url={s.logoUrl}
                            onCopyUrl={() => copyToClipboard(s.logoUrl, "URL")}
                            onCopyImg={() => copyToClipboard(`<img src="${s.logoUrl}" alt="${s.name}" style="max-width:140px;height:auto;" />`, "Etiqueta <img>")}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {assets.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Otras imágenes</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {assets.map((a) => (
                          <AssetCard
                            key={a.id}
                            name={a.name}
                            url={a.url}
                            onCopyUrl={() => copyToClipboard(a.url, "URL")}
                            onCopyImg={() => copyToClipboard(`<img src="${a.url}" alt="${a.name}" style="max-width:240px;height:auto;" />`, "Etiqueta <img>")}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {sponsors.length === 0 && assets.length === 0 && (
                    <p className="text-xs text-gray-600 text-center py-6">No hay imágenes cargadas todavía.</p>
                  )}
                </div>
              )}
            </div>

            {/* Preview panel */}
            <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#141414] hover:bg-[#1a1a1a] transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-red-400" />
                  Vista previa del email
                </span>
                {showPreview ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
              </button>
              {showPreview && (
                <div className="p-4 bg-[#0d0d0d] space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        previewDevice === "desktop"
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> PC
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        previewDevice === "mobile"
                          ? "bg-red-600 border-red-600 text-white"
                          : "bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Móvil
                    </button>
                    {previewLoading && (
                      <span className="text-xs text-gray-500 ml-2">Generando…</span>
                    )}
                  </div>
                  <div className="flex justify-center bg-[#1a1a1a] rounded-lg p-3 overflow-x-auto">
                    <iframe
                      title="Email preview"
                      srcDoc={previewHtml}
                      style={{
                        width: previewDevice === "desktop" ? "600px" : "375px",
                        height: previewDevice === "desktop" ? "720px" : "640px",
                        border: "1px solid #2a2a2a",
                        borderRadius: "8px",
                        background: "#fff",
                      }}
                      sandbox=""
                    />
                  </div>
                  <p className="text-[11px] text-gray-600 text-center">
                    {previewDevice === "desktop" ? "Vista a 600px (desktop)" : "Vista a 375px (iPhone estándar)"}
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!canSend || sending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Enviando..." : `Enviar a ${recipientCount ?? "..."} destinatarios`}
            </Button>
          </Card>
        </>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {logsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-[#333] border-t-red-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <Card className="p-12 text-center">
              <Mail className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay emails enviados todavía.</p>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="overflow-hidden">
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{log.subject}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(log.sentAt).toLocaleDateString("es-AR", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {log.sentCount.toLocaleString()}
                      </div>
                      {log.failedCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          {log.failedCount.toLocaleString()}
                        </div>
                      )}
                      <div className="text-xs text-gray-600">
                        de {log.recipientCount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </button>

                {expandedLog === log.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-[#1a1a1a]">
                    <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap mt-3 line-clamp-6">
                      {log.message}
                    </p>
                    {log.ctaUrl && (
                      <div className="mt-2 text-xs text-blue-400">
                        CTA: {log.ctaLabel || log.ctaUrl} → {log.ctaUrl}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold">Confirmar envío</p>
                <p className="text-sm text-gray-400 mt-1">
                  Se enviará un email a{" "}
                  <strong className="text-white">{recipientCount}</strong> {audienceLabel.toLowerCase()}.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-300 bg-[#1a1a1a] rounded-lg p-3 font-medium">"{subject}"</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSend}>
                Sí, enviar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
