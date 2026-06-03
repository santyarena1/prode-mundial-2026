"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MessageSquare, Trash2, Mail, CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function AdminContactoPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/auth/me").then(r => {
      if (!r.ok) router.replace("/admin/login");
    });
    fetchMessages();
  }, [router]);

  const fetchMessages = async () => {
    const res = await apiFetch("/api/admin/contact-messages");
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
    setLoading(false);
  };

  const toggleRead = async (id: string, read: boolean) => {
    await apiFetch("/api/admin/contact-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: !read }),
    });
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, read: !read } : m));
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("¿Eliminar este mensaje?")) return;
    const res = await apiFetch("/api/admin/contact-messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setMessages(msgs => msgs.filter(m => m.id !== id));
      toast.success("Mensaje eliminado");
    }
  };

  const unread = messages.filter(m => !m.read).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-600/20 border border-red-600/30 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase text-white">Mensajes de Contacto</h1>
            {unread > 0 && <p className="text-xs text-amber-400">{unread} sin leer</p>}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[#333] border-t-red-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No hay mensajes todavía.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={`overflow-hidden transition-colors ${!msg.read ? "border-amber-500/20 bg-amber-950/5" : ""}`}>
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      setExpanded(expanded === msg.id ? null : msg.id);
                      if (!msg.read) toggleRead(msg.id, msg.read);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {msg.read
                            ? <CheckCircle2 className="w-4 h-4 text-gray-600" />
                            : <Circle className="w-4 h-4 text-amber-400 fill-amber-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-sm">{msg.name}</span>
                            <span className="text-gray-600 text-xs">{msg.email}</span>
                            {!msg.read && <Badge variant="warning" className="text-[10px]">Nuevo</Badge>}
                          </div>
                          <p className="text-gray-300 text-sm font-medium mt-0.5">{msg.subject}</p>
                          {expanded !== msg.id && (
                            <p className="text-gray-600 text-xs mt-1 line-clamp-1">{msg.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-700 text-xs hidden sm:block">
                          {new Date(msg.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`} onClick={e => e.stopPropagation()}>
                          <Button variant="secondary" size="sm"><Mail className="w-3 h-3" /></Button>
                        </a>
                        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}>
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {expanded === msg.id && (
                    <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3">
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}>
                          <Button variant="primary" size="sm">
                            <Mail className="w-3 h-3" />
                            Responder por email
                          </Button>
                        </a>
                        <button onClick={() => toggleRead(msg.id, msg.read)} className="text-xs text-gray-500 hover:text-gray-300">
                          Marcar como {msg.read ? "no leído" : "leído"}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
