"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, AlertTriangle, ArrowLeft, Loader2, Check, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Mode = "CLASSIC" | "OFFICIAL";
type Screen = "intro" | "confirm-official" | "confirm-classic";

interface BracketModeResult {
  bracketMode: Mode;
  officialFromPhase?: string | null;
}

interface Props {
  /** Se llama cuando el usuario elige y se guarda el modo. */
  onChosen: (mode: Mode, data: BracketModeResult) => void;
  /** Si se pasa, el modal es descartable (para cambios voluntarios desde el panel). */
  onClose?: () => void;
}

const COMPARISON_ROWS = [
  { phase: "16vos", classic: "1.500", official: "1.500 / 2.000" },
  { phase: "8vos", classic: "2.000", official: "1.500 / 2.000" },
  { phase: "4tos", classic: "4.000", official: "1.500 / 2.000" },
  { phase: "Semis", classic: "6.000", official: "1.500 / 2.000" },
  { phase: "Campeón", classic: "10.000", official: "1.500 / 2.000" },
];

function ComparisonTable() {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/5 text-gray-300">
            <th className="text-left px-3 py-2 font-bold">Fase</th>
            <th className="text-center px-3 py-2 font-bold">Modo actual</th>
            <th className="text-center px-3 py-2 font-bold text-yellow-400">Resultados Oficiales</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((r) => (
            <tr key={r.phase} className="border-t border-white/5">
              <td className="px-3 py-2 font-semibold text-white">{r.phase}</td>
              <td className="px-3 py-2 text-center text-gray-300">{r.classic}</td>
              <td className="px-3 py-2 text-center text-yellow-300">{r.official}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] leading-snug text-gray-400 px-3 py-2 bg-white/[0.02]">
        En <span className="text-white font-semibold">Resultados Oficiales</span>: 1.500 puntos por
        acertar el ganador o 2.000 si clavás el resultado exacto.
      </p>
    </div>
  );
}

function TrampaNote() {
  return (
    <div className="flex gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-[13px] leading-snug text-amber-100">
        En el <span className="font-semibold">modo actual</span> los puntos son más altos a medida
        que avanzás, pero hay una trampa: si te confundiste o el país que elegiste no avanzó,{" "}
        <span className="font-semibold">todo lo que siga después ya no cuenta</span> (las llaves
        siguen tu predicción, no la realidad). Por eso sacamos este modo nuevo.
      </p>
    </div>
  );
}

export function BracketModeModal({ onChosen, onClose }: Props) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (mode: Mode) => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/api/participant/bracket-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar tu elección. Probá de nuevo.");
        setSaving(false);
        return;
      }
      onChosen(mode, data);
    } catch {
      setError("Error de conexión. Probá de nuevo.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose && !saving ? onClose : undefined}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[#121212] border border-white/10 shadow-2xl"
      >
        {onClose && (
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {/* ── Pantalla principal ─────────────────────────────────────────── */}
        {screen === "intro" && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" />
              <h2 className="text-xl font-black text-white">
                ¡Nuevo modo: Resultados Oficiales!
              </h2>
            </div>

            <p className="text-[14px] leading-snug text-gray-300">
              Como este Mundial nos traicionó con algunos resultados de nuestros prode y nos regaló
              países revelación que no esperábamos, sacamos un nuevo modo para que{" "}
              <span className="text-white font-semibold">nadie se quede afuera</span>.
            </p>
            <p className="text-[14px] leading-snug text-gray-300">
              A partir de <span className="text-white font-semibold">16vos</span>, podés jugar con las
              llaves armadas con los <span className="text-white font-semibold">resultados oficiales</span>
              {" "}—sin importar cómo te fue en los grupos—. Solo tenés que acertar quién gana cada
              partido.
            </p>

            <ComparisonTable />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => setScreen("confirm-official")}
                className="w-full rounded-xl bg-yellow-400 text-black font-black py-3 hover:bg-yellow-300 transition"
              >
                Me paso a Resultados Oficiales
              </button>
              <button
                onClick={() => setScreen("confirm-classic")}
                className="w-full rounded-xl bg-white/5 text-white font-bold py-3 border border-white/10 hover:bg-white/10 transition"
              >
                Dejo todo como está
              </button>
            </div>
          </div>
        )}

        {/* ── Confirmación: Resultados Oficiales ─────────────────────────── */}
        {screen === "confirm-official" && (
          <div className="p-5 sm:p-6 space-y-4">
            <button
              onClick={() => { setScreen("intro"); setError(null); }}
              disabled={saving}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <h2 className="text-lg font-black text-white">¿Seguro que querés pasarte?</h2>

            <div className="space-y-3 text-[13px] leading-snug text-gray-300">
              <p>
                Esto es <span className="text-amber-300 font-semibold">irreversible</span>: una vez que
                confirmás, no vas a poder volver al modo actual.
              </p>
              <p>
                Tus predicciones de la próxima fase en adelante{" "}
                <span className="text-white font-semibold">se reinician y se pierden</span>, porque las
                llaves pasan a armarse con los resultados reales.{" "}
                <span className="text-emerald-300 font-semibold">
                  Tranqui: todos los puntos que ya ganaste hasta ahora se mantienen.
                </span>
              </p>
            </div>

            <ComparisonTable />
            <TrampaNote />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={() => choose("OFFICIAL")}
              disabled={saving}
              className="w-full rounded-xl bg-yellow-400 text-black font-black py-3 hover:bg-yellow-300 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Sí, me paso a Resultados Oficiales
            </button>
          </div>
        )}

        {/* ── Confirmación: dejar todo como está ─────────────────────────── */}
        {screen === "confirm-classic" && (
          <div className="p-5 sm:p-6 space-y-4">
            <button
              onClick={() => { setScreen("intro"); setError(null); }}
              disabled={saving}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <h2 className="text-lg font-black text-white">¿Confirmás que seguís igual?</h2>

            <p className="text-[13px] leading-snug text-gray-300">
              Tu prode queda tal cual lo armaste: las llaves siguen con tus predicciones de los grupos,
              elegís quién avanza en cada cruce y mantenés el puntaje de siempre. No perdés nada.
            </p>
            <p className="text-[13px] leading-snug text-gray-400">
              Si más adelante ves que te está yendo mal, vas a poder pasarte al modo Resultados
              Oficiales (aplica desde la siguiente fase en adelante).
            </p>

            <ComparisonTable />
            <TrampaNote />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={() => choose("CLASSIC")}
              disabled={saving}
              className="w-full rounded-xl bg-white/10 text-white font-black py-3 border border-white/15 hover:bg-white/15 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Sí, dejo todo como está
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
