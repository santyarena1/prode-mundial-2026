"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Phone, AtSign, Globe, ChevronRight } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

interface Store {
  name: string;
  address: string;
  mapsUrl: string;
  instagram: string;
  instagramUrl: string;
  phone: string;
  phoneUrl: string;
}

interface CompanyData {
  website: string;
  stores: Store[];
}

export function WelcomeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyData | null>(null);

  useEffect(() => {
    fetch("/api/public/company")
      .then((r) => r.json())
      .then(setCompany)
      .catch(() => {});
  }, []);

  const handleRegister = () => {
    onClose();
    router.push("/register");
  };

  const stores = company?.stores ?? [
    { name: "Local 1", address: "", mapsUrl: "", instagram: "", instagramUrl: "", phone: "", phoneUrl: "" },
    { name: "Local 2", address: "", mapsUrl: "", instagram: "", instagramUrl: "", phone: "", phoneUrl: "" },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }} transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
      >
        <div className="bg-[#0d0d0d] border border-[#222] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[92vh] sm:max-h-[88vh]">

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 bg-[#333] rounded-full" />
          </div>

          {/* Close */}
          <div className="flex justify-end px-4 pt-3 sm:pt-4 flex-shrink-0">
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 pb-2 -mt-2">

            {/* Logo + headline */}
            <div className="flex flex-col items-center text-center mb-6">
              <Logo size="md" href={undefined} variant="hero" className="mb-4" />
              <h2 className="text-white font-black text-xl leading-tight mb-3">
                Gracias por ser parte de{" "}
                <span className="text-red-500">nuestra comunidad</span>
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Esto es <strong className="text-white">gracias a ustedes</strong> y <strong className="text-white">para ustedes</strong>.
                Años de apoyo, partidos compartidos y pasión gamer nos trajeron hasta acá.
                El Prode Mundial 2026 es nuestra forma de celebrarlo juntos.
              </p>
            </div>

            {/* Website */}
            <a
              href={company?.website ?? "https://www.thegamershop.com.ar"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 mb-5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-white text-sm font-semibold">thegamershop.com.ar</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </a>

            {/* Stores */}
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-3">
              Nuestros locales
            </p>
            <div className="space-y-3 mb-6">
              {stores.map((store, i) => (
                <div key={i} className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-black">{i + 1}</span>
                    </div>
                    <p className="text-white font-bold text-sm">{store.name || `Local ${i + 1}`}</p>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    {store.address && (
                      <StoreRow
                        icon={<MapPin className="w-3.5 h-3.5" />}
                        label={store.address}
                        href={store.mapsUrl || undefined}
                        color="text-blue-400"
                      />
                    )}
                    {store.phone && (
                      <StoreRow
                        icon={<Phone className="w-3.5 h-3.5" />}
                        label={store.phone}
                        href={store.phoneUrl || undefined}
                        color="text-green-400"
                      />
                    )}
                    {store.instagram && (
                      <StoreRow
                        icon={<AtSign className="w-3.5 h-3.5" />}
                        label={store.instagram}
                        href={store.instagramUrl || undefined}
                        color="text-pink-400"
                      />
                    )}
                    {!store.address && !store.phone && !store.instagram && (
                      <p className="text-gray-700 text-xs">Sin datos configurados aún</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 pb-6 pt-3 flex-shrink-0">
            <button
              onClick={handleRegister}
              className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-500/20"
            >
              ¡Me sumo al prode! ⚽
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function StoreRow({
  icon, label, href, color,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  color: string;
}) {
  const inner = (
    <div className="flex items-center gap-2.5">
      <span className={`flex-shrink-0 ${color}`}>{icon}</span>
      <span className="text-gray-300 text-xs leading-snug">{label}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}
