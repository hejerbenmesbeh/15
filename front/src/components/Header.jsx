import { Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Header({ title }) {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/80 px-8 backdrop-blur-md">
      <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        {user && (
          <div className="text-sm">
            <span className="text-muted-foreground">Bonjour, </span>
            <span className="font-semibold text-foreground">{user.firstName}</span>
          </div>
        )}
      </div>
    </header>
  );
}