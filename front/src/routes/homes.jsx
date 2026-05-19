import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ArrowRight, 
  BarChart3, 
  User as UserIcon, 
  BrainCircuit, 
  Users, 
  Bell,
  Search
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/homes")({
  head: () => ({
    meta: [{ title: "Accueil — La Poste Tunisienne" }],
  }),
  component: HomePage,
});

function ActionCard({ title, subtitle, icon: Icon, onClick, colorClass, delay }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-md p-8 text-left transition-all duration-500 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/50"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icône de la carte */}
      <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${colorClass} transition-transform duration-500 group-hover:scale-110`}>
        <Icon className="h-7 w-7" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white group-hover:text-gray-900 transition-colors">{title}</h3>
        <p className="text-sm leading-relaxed text-blue-100 group-hover:text-gray-500 transition-colors">{subtitle}</p>
      </div>

      <div className="mt-8 flex items-center text-sm font-bold text-blue-600 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-2">
        Accéder maintenant <ArrowRight className="ml-2 h-4 w-4" />
      </div>
    </button>
  );
}

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    // FOND BLEU FONCÉ SUR TOUTE LA PAGE
    <div className="min-h-screen bg-[#001A4D]">
      
      {/* BARRE DE NAVIGATION (HEADER BLANC POUR BIEN DÉTACHER) */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img src="/logovector.png" alt="La Poste Logo" className="h-25 w-auto object-contain" />
            <div className="h-6 w-px bg-gray-200" />
            <span className="text-20 font-bold tracking-widest text-[#001A4D] uppercase">Espace Utilisateur</span>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-blue-600 transition-colors"><Search className="h-5 w-5" /></button>
            <button className="relative text-gray-400 hover:text-blue-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-3 ml-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-900">{user?.nom || "Agent"}</p>
                <p className="text-[10px] font-medium uppercase text-blue-600">{user?.role || "Membre"}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#001A4D] flex items-center justify-center text-white font-bold uppercase shadow-sm border border-white/20">
                {user?.nom?.substring(0, 2) || "AG"}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        
        {/* BANNIÈRE BLANCHE (L'INVERSION) */}
        <div className="relative mb-12 overflow-hidden rounded-[2.5rem] bg-white p-10 md:p-16 shadow-2xl">
          <div className="relative z-10 w-full">
            <span className="inline-block rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-700">
              {today}
            </span>
            
            {/* TEXTE EN BLEU FONCÉ ET NOM EN #FFCC00 */}
            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl text-[#001A4D]">
              Bienvenue, <span style={{ color: '#FFCC00', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>{user?.nom || "Agent"}</span>
            </h1>
            
            {/* SOUS-TITRE SANS RETOUR À LA LIGNE EN GRIS/BLEU */}
            <p className="mt-6 text-lg font-medium text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">
              Prêt pour votre journée ? Voici un accès rapide à vos outils d'analyse de satisfaction pour La Poste Tunisienne.
            </p>
          </div>
          
          {/* EFFET DE GRADIENT DISCRET DANS LE COIN DE LA CARTE BLANCHE */}
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-50 opacity-50 blur-3xl" />
        </div>

        {/* GRILLE DES CARTES (ELLES SONT SEMI-TRANSPARENTES ET DEVIENNENT BLANCHES AU SURVOL) */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <ActionCard 
            title="Dashboard"
            subtitle="Accéder au dashboard Power BI."
            icon={BarChart3}
            colorClass="bg-blue-500 text-white"
            delay={100}
            onClick={() =>{
      window.location.href =
        "https://app.powerbi.com/view?r=eyJrIjoiODFkNzdlYmEtMjliYS00ZjhjLThkY2QtNmU4NjM2OTZhNjYwIiwidCI6ImRiZDY2NjRkLTRlYjktNDZlYi05OWQ4LTVjNDNiYTE1M2M2MSIsImMiOjl9";
    } }
          />

          <ActionCard 
            title="Machine Learning"
            subtitle="Consulter les analyses prédictives."
            icon={BrainCircuit}
            colorClass="bg-indigo-500 text-white"
            delay={200}
            onClick={() => navigate({ to: "/ml" })}
          /> 
          <ActionCard 
            title="Espace Personnel"
            subtitle="Gérer les informations du profil."
            icon={UserIcon}
            colorClass="bg-amber-500 text-white"
            delay={300}
            onClick={() => navigate({ to: "/profile" })}
          />
        </div>
      </main>
    </div>
  );
}