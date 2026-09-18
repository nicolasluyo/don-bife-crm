"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";
import { Menu, X, Scissors } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar fijo en escritorio */}
      <div className="hidden md:block h-full shrink-0">
        <Sidebar />
      </div>

      {/* Drawer en móvil (siempre montado para animar) */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar onNavigate={() => setOpen(false)} />
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="absolute top-4 -right-12 text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Columna principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barra superior solo en móvil */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-stone-200 bg-white shrink-0">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="-ml-1 p-1 text-stone-600"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-red-800 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900 text-sm">Sr. Polaco</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
