import { useEffect, useState } from "react";
import { MessageSquarePlus, X, Star } from "lucide-react";

const SERVICES = ["Colis", "Courrier", "Services financiers", "Autre"];

export function SurveyFloatingButton() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [service, setService] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => {
      setIsDrawerOpen(false);
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setService("");
        setComment("");
      }, 300);
    }, 2000);
    return () => clearTimeout(t);
  }, [submitted]);

  const handleSubmit = () => {
    if (rating === 0) return;
    setSubmitted(true);
  };

  return (
    <>
      {/* Floating button */}
      <div className="group fixed bottom-6 right-6 z-40">
        <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100">
          Donnez votre avis
        </span>
        <button
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Ouvrir l'enquête de satisfaction"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-accent-hover hover:shadow-xl"
        >
          <MessageSquarePlus className="h-6 w-6" />
        </button>
      </div>

      {/* Backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-border bg-primary p-6 text-primary-foreground">
          <div>
            <h2 className="text-xl font-bold">Enquête de Satisfaction</h2>
            <p className="mt-1 text-sm opacity-90">Votre avis compte !</p>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="rounded-lg p-1 transition-colors hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="text-5xl">🎉</div>
            <p className="text-lg font-semibold text-foreground">
              Merci pour votre retour !
            </p>
            <p className="text-sm text-muted-foreground">
              Votre réponse nous aide à mieux vous servir.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <div>
              <label className="block text-sm font-semibold text-foreground">
                Comment évaluez-vous notre service ?
              </label>
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform duration-200 hover:scale-110"
                    aria-label={`${n} étoiles`}
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        n <= (hoverRating || rating)
                          ? "fill-accent text-accent"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground">
                Quel service avez-vous utilisé ?
              </label>
              <div className="mt-3 space-y-2">
                {SERVICES.map((s) => (
                  <label
                    key={s}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                      service === s
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="service"
                      value={s}
                      checked={service === s}
                      onChange={(e) => setService(e.target.value)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium text-foreground">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground">
                Vos commentaires
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Partagez votre expérience..."
                className="mt-3 w-full resize-none rounded-lg border border-border bg-white p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="mt-auto w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Envoyer mon avis
            </button>
          </div>
        )}
      </aside>
    </>
  );
}