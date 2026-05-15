import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";

export function LanguageSwitcher() {
  const [lang, setLang] = useState("FR");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:border-primary hover:shadow-sm"
      >
        <Globe className="h-4 w-4 text-primary" />
        {lang === "FR" ? "Français" : "العربية"}
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          {["FR", "AR"].map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                lang === l ? "font-semibold text-primary" : "text-foreground"
              }`}
            >
              {l === "FR" ? "Français" : "العربية"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}