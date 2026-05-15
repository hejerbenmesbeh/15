import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard PowerBI — Espace agent" }],
  }),
  component: DashboardPage,
});

const POWERBI_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiYmYxMzRjMzQtMjQ0YS00YjVkLWE3MTEtNzZhNzI3NDhkOTM5IiwidCI6IjEyM2U0NTY3LWUyMmItNGQ2Ny05NTU2LTcxNDg2NzgxYTQyOSJ9";

function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Dashboard PowerBI</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Visualisez les performances et indicateurs des enquêtes en temps réel.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-300 hover:bg-primary-hover hover:shadow-lg"
        >
          Ouvrir le Dashboard
        </button>
      </div>

      {mounted && isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex h-[90vh] w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-border bg-primary px-6 py-4 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Dashboard PowerBI</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-white/10"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <iframe
                title="Dashboard PowerBI"
                src={POWERBI_URL}
                style={{ width: "100%", height: "100%", border: "none" }}
                allowFullScreen
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}