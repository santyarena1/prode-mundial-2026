"use client";

import { useEffect, useState } from "react";
import { Ticket, Tv, Share2 } from "lucide-react";
import { CodeRedeemSection } from "@/components/bonuses/CodeRedeemSection";
import { CODE_TYPES } from "@/lib/purchase-code";

interface ContactInfo {
  whatsappUrl: string;
  instagramUrl?: string | null;
}

export function PurchaseCodeSection() {
  const [contact, setContact] = useState<ContactInfo | null>(null);

  useEffect(() => {
    fetch("/api/public/contact")
      .then((r) => r.json())
      .then((d) => {
        if (d.whatsappUrl || d.instagramUrl) setContact(d);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <CodeRedeemSection
        type={CODE_TYPES.story}
        title="Código en historias"
        description="Publicamos códigos de puntos en las historias de Instagram y redes de The Gamer Shop. Copiá el código antes de que expire y cargalo acá."
        steps={[
          "Seguinos en Instagram / redes de The Gamer Shop",
          "Cuando subamos un código en historias, copialo (ej. TGS-HIST-ABC123)",
          "Pegalo acá lo antes posible — suelen ser por tiempo limitado",
          "El admin valida y te acredita los puntos",
        ]}
        icon={<Share2 className="w-5 h-5" />}
        placeholder="Ej: TGS-HIST-ABC123"
        accentClass="border-purple-600/30 bg-gradient-to-br from-purple-950/30 via-[#111] to-[#111]"
        externalHref={contact?.instagramUrl}
        externalLabel="Ver Instagram de The Gamer Shop"
      />

      <CodeRedeemSection
        type={CODE_TYPES.venue}
        title="Ver partido en el local"
        description="Vení a The Gamer Shop a ver el partido en pantalla gigante. Te damos un código exclusivo del día para sumar puntos extra en el prode."
        steps={[
          "Acercate al local de The Gamer Shop el día del partido",
          "Pedí tu código exclusivo al staff (solo válido ese día / ese partido)",
          "Cargalo acá y el admin te acredita los puntos",
        ]}
        icon={<Tv className="w-5 h-5" />}
        placeholder="Ej: TGS-VIVO-ABC123"
        accentClass="border-blue-600/25 bg-gradient-to-br from-blue-950/25 via-[#111] to-[#111]"
      />

      <CodeRedeemSection
        type={CODE_TYPES.purchase}
        title="Código de compra"
        description="Comprá en The Gamer Shop, pedí tu código por WhatsApp y cargalo acá. Un admin valida la compra y te acredita los puntos."
        steps={[
          "Hacé tu compra en el local o web de The Gamer Shop",
          "Escribinos por WhatsApp para recibir tu código personal (ej. TGS-ABC123)",
          "Ingresá el código abajo y esperá la aprobación del admin",
        ]}
        icon={<Ticket className="w-5 h-5" />}
        placeholder="Ej: TGS-ABC123"
        whatsappHref={contact?.whatsappUrl}
        whatsappLabel="Pedir código de compra por WhatsApp"
      />
    </div>
  );
}
