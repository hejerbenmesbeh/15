import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Créer un compte — La Poste Tunisienne" },
      { name: "description", content: "Créez votre compte agent La Poste Tunisienne." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("utilisateur"); // Rôle par défaut
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Vérification simple : On vérifie maintenant aussi l'email
    if (!fullName || !password || !email) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    // MODIFICATION ICI : On ajoute 'email' dans l'objet envoyé au backend
    const newUser = {
      nom: fullName,
      email: email,    // Ajouté pour correspondre à ta base de données
      password: password,
      role: role
    };

    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (response.ok) {
        alert("Utilisateur enregistré avec succès !");
        navigate({ to: "/login" });
      } else {
        // Affiche l'erreur précise du serveur
        alert("Erreur: " + (data.message || "Impossible d'enregistrer"));
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi :", err);
      alert("Erreur de connexion : Vérifiez que votre serveur backend est lancé sur le port 5000.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001A4D] p-4 font-sans">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-100">
        
        {/* SECTION GAUCHE : LOGO */}
        <div className="flex w-1/2 flex-col items-center justify-center bg-gray-50 p-12 border-r border-gray-100">
          <img 
            src="/logovector.png" 
            alt="Logo La Poste Tunisienne" 
            className="w-48 h-auto object-contain drop-shadow-md" 
          />
        </div>

        {/* SECTION DROITE : FORMULAIRE */}
        <div className="flex w-1/2 flex-col justify-center p-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Inscription</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom d'utilisateur (Vrai Nom) */}
            <div className="text-left">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Nom d'utilisateur
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Hejer Ben Mesbeh"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all"
              />
            </div>

            {/* Email (Identifiant de connexion) */}
            <div className="text-left">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utilisateur@laposte.tn"
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all"
              />
            </div>

            {/* Mot de passe */}
            <div className="text-left">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all"
              />
            </div>

            {/* Rôle */}
            <div className="text-left">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Rôle
              </label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all appearance-none cursor-pointer"
                style={{ 
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")', 
                  backgroundRepeat: 'no-repeat', 
                  backgroundPosition: 'right 1rem center', 
                  backgroundSize: '1em' 
                }}
              >       
                <option value="utilisateur">Utilisateur</option>
                <option value="administrateur">Administrateur</option>
              </select>
            </div>

            {/* Bouton */}
            <div className="flex flex-col items-center pt-4">
              <button
                type="submit"
                className="w-3/4 bg-gradient-to-r from-[#1e293b] via-[#2563eb] to-[#fbbf24] bg-[length:200%_auto] bg-left hover:bg-right transition-all duration-500 text-white font-bold py-3 rounded shadow-lg uppercase tracking-widest text-xs"
              >
                S'INSCRIRE
              </button>

              <div className="mt-8 text-center text-[11px] text-gray-400">
                Déjà un compte ?{" "}
                <Link to="/login" className="font-bold text-gray-600 hover:text-[#2563eb] transition-colors uppercase ml-1">
                  Se connecter
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}