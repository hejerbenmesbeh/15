import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [{ title: "Mon Profil — Espace agent" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, updateUser } = useAuth(); // Récupère l'utilisateur depuis MySQL via le contexte
  
  // États pour les informations personnelles
  const [nom, setNom] = useState(user?.nom ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [toast, setToast] = useState(null);

  // États pour le changement de mot de passe
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  // Génération de l'initiale pour l'avatar
  const initial = nom ? nom[0].toUpperCase() : "A";

  const handleSave = async (e) => {
    e.preventDefault();
    // Ici, on appelle updateUser qui devrait faire un appel API (PUT /update-profile)
    try {
      // Simulation ou appel réel si ton AuthContext est prêt
      updateUser({ ...user, nom, email }); 
      setToast("Profil mis à jour avec succès !");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast("Erreur lors de la mise à jour");
    }
  };

  const handlePwdSave = (e) => {
    e.preventDefault();
    setPwdError("");
    
    if (!currentPwd || !newPwd) {
      setPwdError("Veuillez remplir tous les champs.");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }

    // Logique d'appel API pour changer le mot de passe ici
    
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setToast("Mot de passe modifié avec succès !");
    setTimeout(() => setToast(null), 3000);
  };

  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      
      {/* Header card (Comme sur image_ed49db.png) */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="h-28 bg-gradient-to-r from-[#001A4D] to-[#2563eb]" />
        <div className="px-8 pb-6">
          <div className="-mt-12 flex items-end gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-amber-400 text-2xl font-extrabold text-white shadow-md">
              {initial}
            </div>
            <div className="pb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {nom || "Agent La Poste"}
              </h2>
              <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">
                {user?.role || "utilisateur"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Colonne gauche : Informations */}
        <div className="lg:col-span-2 space-y-8">
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
          >
            <h3 className="text-lg font-bold text-gray-900">Informations personnelles</h3>
            <p className="mt-1 text-sm text-gray-500">
              Gérez votre identifiant et votre adresse email professionnelle.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nom d'utilisateur</label>
                <input 
                  className={inputCls} 
                  value={nom} 
                  onChange={(e) => setNom(e.target.value)} 
                  placeholder="Votre nom complet"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  className={inputCls} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="nom@laposte.tn"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rôle (non modifiable)</label>
                <input 
                  readOnly 
                  className={`${inputCls} cursor-not-allowed bg-gray-50 text-gray-500`} 
                  value={user?.role ?? "utilisateur"} 
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t pt-6">
              <button
                type="submit"
                className="rounded-lg bg-[#001A4D] px-8 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700"
              >
                Mettre à jour
              </button>
            </div>
          </form>
        </div>

        {/* Colonne droite : Sécurité */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handlePwdSave}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm h-full"
          >
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-amber-500" />
              <h3 className="text-md font-bold text-gray-900">Sécurité</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Mot de passe actuel</label>
                <input type="password" className={`mt-1 ${inputCls}`} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Nouveau</label>
                <input type="password" className={`mt-1 ${inputCls}`} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Confirmer</label>
                <input type="password" className={`mt-1 ${inputCls}`} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
              </div>
            </div>

            {pwdError && (
              <p className="mt-3 text-[11px] text-red-500 font-medium">{pwdError}</p>
            )}

            <button
              type="submit"
              className="mt-6 w-full rounded-lg border-2 border-[#001A4D] bg-white py-2 text-xs font-bold text-[#001A4D] transition-all hover:bg-[#001A4D] hover:text-white"
            >
              Changer le mot de passe
            </button>
          </form>
        </div>
      </div>

      {/* Toast (Comme sur image_ed49db.png) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-2xl animate-bounce">
          <CheckCircle2 className="h-5 w-5" />
          {toast}
        </div>
      )}
    </div>
  );
}