"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck, Swords, Trophy, Megaphone, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  squad_invite: <Swords className="w-4 h-4 text-yellow-400" />,
  squad_joined: <Swords className="w-4 h-4 text-green-400" />,
  prize_won: <Trophy className="w-4 h-4 text-yellow-400" />,
  raffle_won: <Trophy className="w-4 h-4 text-yellow-400" />,
  news: <Megaphone className="w-4 h-4 text-blue-400" />,
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/participant/notifications");
      if (res.status === 401) { router.push("/login"); return; }
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await apiFetch(`/api/participant/notifications/${id}`, { method: "PUT" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    window.dispatchEvent(new Event("notificationsRead"));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiFetch("/api/participant/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      window.dispatchEvent(new Event("notificationsRead"));
    } finally {
      setMarkingAll(false);
    }
  };

  const getActionLink = (notif: Notification): string | null => {
    if (!notif.data) return null;
    try {
      const d = JSON.parse(notif.data);
      if (d.squadId) return `/squads/${d.squadId}`;
    } catch {
      // ignore
    }
    return null;
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markRead(notif.id);
    const link = getActionLink(notif);
    if (link) router.push(link);
  };

  if (loading) return <LoadingScreen />;

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060606] pt-4 pb-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white">Notificaciones</h1>
              {unread > 0 && (
                <p className="text-gray-500 text-sm">{unread} sin leer</p>
              )}
            </div>
            {unread > 0 && (
              <Button variant="ghost" size="sm" loading={markingAll} onClick={markAllRead}>
                <CheckCheck className="w-4 h-4" /> Marcar todo leído
              </Button>
            )}
          </div>

          {notifications.length === 0 && (
            <Card className="p-10 text-center">
              <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No tenés notificaciones</p>
            </Card>
          )}

          <div className="space-y-2">
            {notifications.map((notif) => {
              const link = getActionLink(notif);
              const isClickable = !!link;

              return (
                <Card
                  key={notif.id}
                  className={`p-4 transition-colors ${!notif.read ? "border-red-600/30 bg-red-950/5" : ""} ${isClickable ? "cursor-pointer hover:border-gray-600" : ""}`}
                  onClick={isClickable ? () => handleClick(notif) : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {TYPE_ICON[notif.type] ?? <Bell className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold ${notif.read ? "text-gray-300" : "text-white"}`}>
                          {notif.title}
                        </p>
                        {!notif.read && <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{notif.body}</p>
                      <p className="text-gray-700 text-xs mt-1">
                        {new Date(notif.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {isClickable && <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0 mt-1" />}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
