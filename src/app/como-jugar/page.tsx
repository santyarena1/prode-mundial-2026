import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Cómo Jugar | Prode Mundial Gamer 2026",
  description: "Bases y condiciones, instrucciones y sistema de puntos del Prode Mundial Gamer 2026 de The Gamer Shop.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-black uppercase text-white mb-4 border-l-4 border-red-500 pl-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Rule({ pts, label }: { pts: string; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1f1f1f] last:border-0">
      <span className="text-gray-300 text-sm">{label}</span>
      <span className="text-yellow-400 font-bold text-sm tabular-nums ml-4 shrink-0">{pts} pts</span>
    </div>
  );
}

function Achievement({ name, condition, pts }: { name: string; condition: string; pts: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#1f1f1f] last:border-0">
      <div className="flex-1">
        <div className="text-white font-semibold text-sm">{name}</div>
        <div className="text-gray-500 text-xs mt-0.5">{condition}</div>
      </div>
      <span className="text-yellow-400 font-bold text-sm tabular-nums shrink-0">{pts} pts</span>
    </div>
  );
}

export default function ComoJugarPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-10">
          <span className="text-red-500 text-xs font-bold uppercase tracking-widest">Guía completa</span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase text-white mt-2">
            CÓMO JUGAR
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Todo lo que necesitás saber para participar en el Prode Mundial Gamer 2026 de The Gamer Shop.
          </p>
        </div>

        {/* ── REGISTRO ── */}
        <Section title="1. Registro">
          <Card className="p-5 space-y-3 text-sm text-gray-400 leading-relaxed">
            <p>
              Para participar necesitás crear una cuenta gratuita en{" "}
              <Link href="/register" className="text-red-400 hover:underline">este link</Link>.
              Solo se necesita: nombre, apellido, email, teléfono y contraseña.
            </p>
            <p>
              Una vez registrado, cada usuario recibe acceso a la sección de predicciones donde
              puede cargar sus pronósticos antes del inicio del torneo.
            </p>
            <p>
              Cada persona puede tener <strong className="text-white">una sola cuenta</strong>.
              Detectamos múltiples registros desde la misma red y los bloqueamos automáticamente.
              El sistema está pensado para que sea un juego justo.
            </p>
          </Card>
        </Section>

        {/* ── PREDICCIONES ── */}
        <Section title="2. Cómo hacer predicciones">
          <Card className="p-5 space-y-4 text-sm text-gray-400 leading-relaxed">
            <div>
              <h3 className="text-white font-bold mb-1">Fase de grupos</h3>
              <p>
                Predecís el resultado (victoria local, empate o victoria visitante) de cada partido
                de la fase de grupos. También podés predecir qué equipo queda <strong className="text-white">1° y 2°</strong>{" "}
                en cada grupo.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Eliminatorias (bracket)</h3>
              <p>
                Predecís qué equipo avanza en cada fase del bracket: Ronda de 32, Octavos, Cuartos,
                Semifinales y Final. También podés predecir al campeón y al subcampeón.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">¿Hasta cuándo puedo cargar?</h3>
              <p>
                Las predicciones se bloquean automáticamente antes del inicio de cada partido.
                No podés modificar predicciones de partidos ya comenzados.
              </p>
            </div>
          </Card>
        </Section>

        {/* ── PUNTOS BASE ── */}
        <Section title="3. Sistema de puntos — Fase de grupos">
          <Card className="p-5">
            <p className="text-gray-500 text-xs mb-4">Cada predicción acertada suma puntos automáticamente.</p>
            <Rule pts="50" label="Acertar resultado (ganador o perdedor)" />
            <Rule pts="80" label="Acertar empate exacto (+30 de bonus)" />
            <Rule pts="120" label="Acertar equipo clasificado del grupo" />
            <Rule pts="300" label="Acertar 1° o 2° posición exacta (+180 extra)" />
          </Card>
        </Section>

        <Section title="4. Sistema de puntos — Eliminatorias">
          <Card className="p-5">
            <Rule pts="200"  label="Acertar equipo que pasa en Ronda de 32" />
            <Rule pts="350"  label="Acertar equipo que pasa en Octavos" />
            <Rule pts="600"  label="Acertar equipo que pasa en Cuartos" />
            <Rule pts="1.000" label="Acertar equipo que pasa en Semifinal" />
            <Rule pts="1.500" label="Acertar finalista (subcampeón)" />
            <Rule pts="3.000" label="Acertar al campeón" />
          </Card>
        </Section>

        {/* ── LOGROS ── */}
        <Section title="5. Logros y desafíos">
          <Card className="p-5">
            <p className="text-gray-500 text-xs mb-4">
              Los logros se calculan automáticamente y se suman a tu puntaje. No hace falta reclamarlos.
            </p>
            <Achievement name="Buen arranque"          condition="Acertar 10 partidos de fase de grupos"              pts="1.000" />
            <Achievement name="Especialista de grupos" condition="Acertar 35 partidos de fase de grupos"              pts="3.000" />
            <Achievement name="Experto mundialista"    condition="Acertar 45 partidos de fase de grupos"              pts="7.500" />
            <Achievement name="Máquina de grupos"      condition="Acertar 55 partidos de fase de grupos"              pts="15.000" />
            <Achievement name="Ojo clínico"            condition="Acertar 18 o más clasificados de grupo"             pts="5.000" />
            <Achievement name="Tabla perfecta"         condition="Acertar todos los 1° y 2° exactos en los 12 grupos" pts="20.000" />
            <Achievement name="Bracket fuerte"         condition="Acertar el 70% de las predicciones de eliminatorias" pts="10.000" />
            <Achievement name="Bracket perfecto"       condition="Acertar toda la llave eliminatoria"                 pts="30.000" />
            <Achievement name="Final soñada"           condition="Acertar campeón y subcampeón"                      pts="5.000" />
            <Achievement name="Prode perfecto"         condition="Desbloquear todos los logros anteriores"            pts="150.000" />
          </Card>
        </Section>

        {/* ── BONUS ── */}
        <Section title="6. Puntos bonus y acciones TGS">
          <Card className="p-5 space-y-3 text-sm text-gray-400 leading-relaxed">
            <p>
              Además de predecir, podés sumar puntos extra realizando acciones dentro de la plataforma:
            </p>
            <ul className="space-y-2 pl-4 list-disc">
              <li>Seguir a The Gamer Shop en Instagram, TikTok o YouTube</li>
              <li>Compartir historias etiquetando TGS</li>
              <li>Invitar amigos registrados</li>
              <li>Presentar un código obtenido por compra en The Gamer Shop</li>
              <li>Ver un partido desde el local de TGS</li>
            </ul>
            <p>
              Las acciones que requieren verificación quedan <strong className="text-white">pendientes de aprobación</strong>{" "}
              por el equipo de TGS. Una vez aprobadas, los puntos se acreditan automáticamente.
            </p>
          </Card>
        </Section>

        {/* ── ESCALA ── */}
        <Section title="7. ¿Cuántos puntos puedo llegar a tener?">
          <Card className="p-5">
            <div className="space-y-2">
              {[
                { label: "Usuario casual",               range: "2.000 – 8.000" },
                { label: "Usuario activo",               range: "8.000 – 20.000" },
                { label: "Usuario con buena campaña",   range: "20.000 – 45.000" },
                { label: "Usuario excelente",            range: "45.000 – 80.000" },
                { label: "Caso muy poco frecuente",      range: "80.000 – 120.000" },
                { label: "Prode casi perfecto",          range: "150.000 o más" },
              ].map(({ label, range }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#1f1f1f] last:border-0">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-white font-bold text-sm tabular-nums">{range} pts</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── PREMIOS ── */}
        <Section title="8. Premios y canjes">
          <Card className="p-5 space-y-3 text-sm text-gray-400 leading-relaxed">
            <p>
              Podés canjear tus puntos por premios en la sección{" "}
              <Link href="/prizes" className="text-red-400 hover:underline">Premios</Link>.
              Hay productos digitales, físicos, cupones, sorteos y premios exclusivos.
            </p>
            <p>
              Los premios grandes (jackpot, ranking) pueden estar limitados por stock o por cantidad
              de canjes por usuario. Leé bien la descripción de cada premio antes de canjear.
            </p>
            <p>
              Una vez canjeado, los puntos se descuentan de tu saldo. Si el canje es rechazado,
              los puntos se devuelven automáticamente.
            </p>
          </Card>
        </Section>

        {/* ── BASES Y CONDICIONES ── */}
        <Section title="9. Bases y condiciones">
          <Card className="p-5 space-y-3 text-sm text-gray-400 leading-relaxed">
            <p>
              El Prode Mundial Gamer 2026 es organizado por <strong className="text-white">The Gamer Shop</strong>.
              La participación es gratuita para todos los usuarios registrados.
            </p>
            <ul className="space-y-2 pl-4 list-disc">
              <li>Está prohibido crear múltiples cuentas para acumular puntos.</li>
              <li>Cualquier intento de manipulación del sistema puede resultar en la suspensión de la cuenta.</li>
              <li>The Gamer Shop se reserva el derecho de modificar las reglas de puntos, premios y logros en cualquier momento.</li>
              <li>Los puntos no tienen valor monetario y no son canjeables por dinero en efectivo.</li>
              <li>Los premios están sujetos a disponibilidad de stock.</li>
              <li>Las acciones de bonus requieren evidencia válida para ser aprobadas.</li>
              <li>El equipo de TGS tiene la decisión final en cualquier disputa.</li>
              <li>El evento puede ser cancelado o modificado por razones de fuerza mayor.</li>
            </ul>
            <p>
              Al registrarte aceptás estos términos y condiciones.
            </p>
          </Card>
        </Section>

        <div className="text-center pt-4">
          <Link
            href="/register"
            className="inline-block bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider px-8 py-3 rounded-xl transition-colors"
          >
            ¡Sumate ahora!
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
