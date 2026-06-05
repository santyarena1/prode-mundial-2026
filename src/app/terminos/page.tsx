import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Bell, Lock, UserCheck } from "lucide-react";

export const metadata = {
  title: "Bases y Condiciones | Prode Mundial 2026 - The Gamer Shop",
  description: "Bases y condiciones de participación del Prode Mundial 2026 organizado por The Gamer Shop.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-black uppercase text-white mb-2">Bases y Condiciones</h1>
          <p className="text-gray-500 text-sm">Prode Mundial 2026 — The Gamer Shop · Vigentes desde junio 2025</p>
        </div>

        {/* Privacy highlight */}
        <div className="bg-green-950/30 border border-green-500/20 rounded-2xl p-5 mb-10 flex gap-4">
          <Bell className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-400 font-bold text-sm mb-1">Tu información está segura — no hacemos spam</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Los datos que ingresás al registrarte (nombre, email y teléfono) se usan <strong className="text-white">únicamente para notificarte sobre el Prode</strong>: actualizaciones del torneo, resultados de sorteos, notificaciones de premios y comunicaciones relacionadas con tu participación. <strong className="text-white">No compartimos tu información con terceros ni la usamos con fines comerciales ajenos al Prode.</strong>
            </p>
          </div>
        </div>

        <div className="space-y-8 text-gray-400 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-base uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-red-400" /> 1. Participación
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>El Prode Mundial 2026 es organizado por <strong className="text-white">The Gamer Shop</strong> y está abierto a cualquier persona mayor de 13 años.</li>
              <li>La participación es gratuita. El registro requiere un email válido, nombre, teléfono y contraseña.</li>
              <li>Cada persona puede tener una sola cuenta. Las cuentas duplicadas serán eliminadas.</li>
              <li>The Gamer Shop se reserva el derecho de suspender cuentas que realicen acciones fraudulentas o que violen estas bases.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-4 text-red-400 font-black text-base">⚽</span> 2. Predicciones y puntos
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Los participantes pueden predecir resultados de los partidos del Mundial 2026, clasificados de grupos y el bracket eliminatorio.</li>
              <li>Los puntos se otorgan según las reglas publicadas en la sección "¿Cómo jugar?" de la plataforma, sujetas a cambios por parte de The Gamer Shop con previo aviso.</li>
              <li>Las predicciones se bloquean al inicio de cada partido o fase según corresponda.</li>
              <li>Los puntos acumulados no tienen valor monetario y no son transferibles ni canjeables por dinero.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-4 h-4 text-red-400 font-black text-base">🎁</span> 3. Premios y canjes
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Los premios disponibles para canjear con puntos son definidos por The Gamer Shop y pueden variar sin previo aviso según stock disponible.</li>
              <li>Al solicitar un canje, el equipo de The Gamer Shop se contactará con el participante para coordinar la entrega.</li>
              <li>Los premios son válidos únicamente para residentes en Argentina. Los participantes de otras regiones pueden participar pero la entrega de premios físicos queda sujeta a disponibilidad logística.</li>
              <li>The Gamer Shop no es responsable de demoras en la entrega causadas por terceros (couriers, servicios postales).</li>
              <li>Los sorteos semanales se realizan entre los participantes que hayan canjeado entradas. Los ganadores son anunciados en la plataforma y redes sociales de The Gamer Shop.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-400" /> 4. Privacidad y datos personales
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Los datos personales recopilados (nombre, email, teléfono, Instagram opcional) se utilizan <strong className="text-white">exclusivamente</strong> para la gestión del Prode: identificación del participante, notificaciones sobre resultados, sorteos y premios.</li>
              <li><strong className="text-white">No enviamos publicidad no solicitada.</strong> Los únicos correos que enviamos son relacionados con tu actividad en el Prode (bienvenida, notificaciones de premios, resultados de sorteos).</li>
              <li>No vendemos ni cedemos tus datos a terceros con fines comerciales.</li>
              <li>Podés solicitar la eliminación de tu cuenta y datos en cualquier momento contactándonos a través del formulario de contacto.</li>
              <li>Podés darte de baja de los correos en cualquier momento usando el link de "Cancelar suscripción" en el pie de cada email.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" /> 5. Responsabilidad y modificaciones
            </h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>The Gamer Shop se reserva el derecho de modificar estas bases en cualquier momento. Los cambios serán notificados en la plataforma.</li>
              <li>El Prode está condicionado al desarrollo del Mundial 2026. Ante suspensiones o cancelaciones del torneo, The Gamer Shop definirá las condiciones de continuidad del juego.</li>
              <li>La participación en el Prode implica la aceptación de estas bases y condiciones en su totalidad.</li>
            </ul>
          </section>

          <div className="border-t border-[#1a1a1a] pt-6 text-gray-600 text-xs">
            <p>¿Tenés preguntas? <Link href="/contacto" className="text-red-400 hover:text-red-300">Contactanos acá</Link>.</p>
            <p className="mt-1">© 2025 The Gamer Shop. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
