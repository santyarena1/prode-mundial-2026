"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, MessageSquare, Send, CheckCircle2 } from "lucide-react";

export default function ContactoPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/public/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al enviar"); return; }
      setSent(true);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-600/20 border border-red-600/30 rounded-2xl mb-4">
            <MessageSquare className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-3xl font-black uppercase text-white">Contacto</h1>
          <p className="text-gray-500 mt-2">¿Tenés alguna consulta? Escribinos y te respondemos a la brevedad.</p>
        </div>

        <Card className="p-8">
          {sent ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-black uppercase text-white mb-2">¡Mensaje enviado!</h2>
              <p className="text-gray-500">Recibimos tu consulta y te responderemos pronto.</p>
              <button
                onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                className="mt-6 text-red-400 hover:text-red-300 text-sm font-semibold"
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  placeholder="Juan García"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="juan@email.com"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
              </div>

              <Input
                label="Asunto"
                placeholder="¿En qué te podemos ayudar?"
                value={form.subject}
                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                required
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Mensaje</label>
                <textarea
                  placeholder="Escribí tu consulta acá..."
                  value={form.message}
                  onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={6}
                  maxLength={2000}
                  required
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 resize-none"
                />
                <p className="text-xs text-gray-700 text-right">{form.message.length}/2000</p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
                <Send className="w-4 h-4" />
                ENVIAR MENSAJE
              </Button>
            </form>
          )}
        </Card>
      </div>

      <Footer />
    </div>
  );
}
