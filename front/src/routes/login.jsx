import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth, DEFAULT_USER } from "../context/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Se connecter — La Poste Tunisienne" },
      { name: "description", content: "Accédez à votre espace agent La Poste Tunisienne." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }), // On envoie l'email
});
    

    const data = await response.json();

    if (response.ok) {
      // 'data' contient { id, nom, role } venant de ta base
      login(data); 
      navigate({ to: "/homes" });
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001A4D] p-4 font-sans">
      {/* Conteneur principal horizontal comme sur la photo */}
      <div className="flex w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-100">
        
        {/* SECTION GAUCHE : LOGO ET SLOGAN VERTICAL */}
        <div className="relative flex w-1/2 flex-col items-center justify-center bg-gray-50 p-12">
          {/* Slogan vertical à gauche du logo */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2 rotate-180 [writing-mode:vertical-lr]">
            <p className="text-2xl font-medium text-gray-800 tracking-tighter">
              
            </p>
          </div>
          
          <img 
            src="/logovector.png" 
            alt="Logo La Poste Tunisienne" 
            className="w-48 h-auto object-contain drop-shadow-md" 
          />
          <h2 className="mt-4 text-xl font-bold text-blue-900 uppercase">
            
          </h2>
        </div>

        {/* SECTION DROITE : FORMULAIRE */}
        <div className="flex w-1/2 flex-col justify-center p-12">
          {/* 1. Titre ajusté au CENTRE */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-gray-800">Connexion</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 2. Champ Email à GAUCHE */}
            <div className="text-left">
              <label className="block text-sm font-semibold text-gray-600 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition-all text-left"
              />
            </div>

            {/* 3. Champ Mot de passe à GAUCHE */}
            <div className="text-left">
              <label className="block text-sm font-semibold text-gray-600 mb-2">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pl-4 pr-12 text-sm focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition-all text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 4. Bouton et Footer CENTRÉS pour l'équilibre */}
            <div className="flex flex-col items-center pt-4">
              <button
                type="submit"
                className="w-2/3 bg-gradient-to-r from-[#1e293b] via-[#2563eb] to-[#fbbf24] bg-[length:200%_auto] bg-left hover:bg-right transition-all duration-500 text-white font-bold py-3 rounded shadow-lg uppercase tracking-widest text-xs"
              >
                SE CONNECTER
              </button>
              
              <div className="mt-8 flex flex-col items-center gap-2 text-[11px] text-gray-400">
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Mot de passe oublié ?
                </a>
                <div className="flex items-center gap-1">
                  <Link to="/register" className="font-bold text-gray-600 hover:text-blue-600">
                    S'inscrire
                  </Link>
                  <span>|</span>
                  <span>Nouveau ici ?</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}