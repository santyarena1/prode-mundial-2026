"use client";

import { motion } from "framer-motion";
import { Gift, Megaphone, Trophy, TrendingUp, ArrowRight, Handshake } from "lucide-react";

// Actualizá este link con el WhatsApp o Instagram de contacto
const CONTACT_URL =
  "https://wa.me/?text=Hola%2C%20me%20interesa%20ser%20sponsor%20del%20Prode%20Mundial%202026%20de%20The%20Gamer%20Shop";

const benefits = [
  {
    icon: <Gift className="w-5 h-5" />,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    title: "Poné un premio",
    desc: "Tu producto aparece en la sección de premios con tu logo. Cientos de participantes van a ver tu marca cada vez que quieran canjear.",
  },
  {
    icon: <Megaphone className="w-5 h-5" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "Generá una acción bonus",
    desc: "Los participantes te siguen en redes, visitan tu local o hacen una compra para sumar puntos. Vos elegís qué acción querés impulsar.",
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    title: "Logo en el prode",
    desc: "Tu marca aparece en el carrusel de sponsors del home y en las tarjetas de premios del mundial más seguido de la comunidad gamer.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "Exposición real",
    desc: "No es publicidad en frío. Tu marca está integrada en la experiencia de juego, asociada a premios y emoción mundialista.",
  },
];

interface Props {
  compact?: boolean;
  totalParticipants?: number;
}

export function SponsorCTA({ compact = false, totalParticipants }: Props) {
  if (compact) {
    return (
      <motion.a
        href={CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="block group"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[#1e1e1e] bg-gradient-to-r from-[#111] via-[#111] to-[#0d0d0d] p-5 hover:border-red-600/30 transition-all duration-300">
          {/* Accent glow */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 via-red-600 to-transparent rounded-l-2xl" />

          <div className="flex items-center justify-between gap-4 pl-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Handshake className="w-5 h-5 text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-tight">
                  ¿Tenés una marca o local?
                </p>
                <p className="text-gray-500 text-xs mt-0.5 leading-snug">
                  Unite como sponsor — premios, difusión y visibilidad real durante el Mundial
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5 text-red-400 text-xs font-bold group-hover:gap-2.5 transition-all">
              Hablemos
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </motion.a>
    );
  }

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[#1e1e1e] bg-[#0d0d0d]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Background texture */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(185,28,28,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.04),transparent_60%)]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/30 to-transparent" />

          <div className="relative z-10 px-6 sm:px-10 py-12 sm:py-16">

            {/* Header */}
            <div className="text-center mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                <Handshake className="w-3.5 h-3.5" />
                Para marcas y emprendedores
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white leading-tight">
                ¿QUERÉS QUE{" "}
                <span className="text-red-500">TU MARCA</span>{" "}
                SEA PARTE?
              </h2>
              <p className="text-gray-400 mt-3 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                El Prode Mundial 2026 reúne a la comunidad gamer de Argentina en un solo lugar.
                {totalParticipants && totalParticipants > 10
                  ? ` Ya somos más de ${totalParticipants.toLocaleString("es-AR")} participantes y crecemos cada día.`
                  : " Sumate antes de que arranque el mundial y posicioná tu marca desde el comienzo."}
              </p>
            </div>

            {/* Benefits grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-2xl border p-5 ${b.bg}`}
                >
                  <div className={`mb-3 ${b.color}`}>{b.icon}</div>
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">
                    {b.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{b.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Social proof / CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-[#1a1a1a]">
              <div className="text-center sm:text-left">
                <p className="text-gray-300 text-sm font-semibold">
                  Sin costos fijos. Sin contratos.
                </p>
                <p className="text-gray-600 text-sm mt-0.5">
                  Cada sponsor define su forma de participar: un premio, una acción, o ambas.
                </p>
              </div>
              <a
                href={CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex-shrink-0 inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-sm px-7 py-3.5 rounded-xl transition-all duration-200 hover:shadow-[0_0_24px_rgba(220,38,38,0.4)] hover:gap-4"
              >
                Quiero ser sponsor
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
