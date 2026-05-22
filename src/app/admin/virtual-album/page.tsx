"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LoadingScreen } from "@/components/ui/LoadingSpinner";

interface InterestRow {
  id: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export default function AdminVirtualAlbumPage() {
  const [interests, setInterests] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/virtual-album-interest")
      .then((r) => r.json())
      .then((d) => setInterests(d.interests || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase text-white">Álbum virtual</h1>
          <p className="text-gray-500 text-sm">
            {interests.length} participante{interests.length !== 1 ? "s" : ""} pidieron aviso cuando
            el espacio informativo esté listo
          </p>
        </div>
      </div>

      {interests.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 text-sm">
          Todavía nadie pidió que le avisen desde el dashboard.
        </Card>
      ) : (
        <div className="space-y-2">
          {interests.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-white font-semibold">
                    {row.user.firstName} {row.user.lastName}
                  </p>
                  <p className="text-gray-500 text-xs">{row.user.email}</p>
                  <p className="text-gray-600 text-xs">{row.user.phone}</p>
                </div>
                <time className="text-gray-600 text-xs shrink-0">
                  {new Date(row.createdAt).toLocaleString("es-AR")}
                </time>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
