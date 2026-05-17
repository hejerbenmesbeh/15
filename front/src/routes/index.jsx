import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { BarChart3, Menu, X, LayoutDashboard } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Poste Tunisienne — Plateforme Analytique" },
      { name: "description", content: "Système décisionnel moderne pour La Poste Tunisienne." },
    ],
  }),
  component: LandingPage,
});

const POWERBI_URL = "https://app.powerbi.com/view?YOUR_LINK_HERE";

function LandingPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Ouvert par défaut pour correspondre à l'image

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#fff", fontFamily: "'Segoe UI', sans-serif" }}>
      
      {/* ── Sidebar (Navigation Gauche) ── */}
      <aside
        style={{
          width: sidebarOpen ? 280 : 0,
          backgroundColor: "#FFF", // Bleu foncé comme sur l'image
          color: "#fff",
          transition: "width 0.3s ease",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 50
        }}
      >
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          {/* Logo Poste Tunisienne */}
          <img 
            src="/logovector.png" 
            alt="La Poste" 
            style={{ width: "120px", marginBottom: "40px",display: "inline-block"}} 
          />
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "0 15px" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            padding: "12px", 
            backgroundColor: "rgba(255,255,255,0.1)", 
            borderRadius: 8,
            cursor: "pointer"
          }}>
            <LayoutDashboard size={20} color="#001A4D" />  {/* Change color ici */}
            <span style={{ color: "#001A4D", fontWeight: "bold" }}>Accueil</span> {/* Ajoute color ici */}
          </div>
          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px",
              opacity: 0.7,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            <BarChart3 size={20} color="#001A4D" />

            <span style={{ color: "#001A4D", fontWeight: "bold" }}>
              Dashboard
            </span>
          </a>
        </nav>

        <div style={{ padding: "20px" }}>
          <button 
            onClick={() => navigate({ to: "/login" })}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#001A4D", // Bouton rouge/orange comme sur l'image
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Se connecter
          </button>
        </div>
      </aside>

      {/* ── Contenu Principal (Hero Section) ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#001A4D" }}>
        
        {/* Top bar discrète pour le switcher */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 40px" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ marginRight: "auto", background: "none", border: "none", cursor: "pointer" }}>
            {sidebarOpen ? <X color="#fff"/> : <Menu color="#fff"/>}
          </button>
          <LanguageSwitcher />
        </div>

        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: "0 20px",
          textAlign: "center"
        }}>
          
          <h2 style={{ fontSize: "22px", color: "#666", marginBottom: "10px", fontWeight: "400" }}>
            <span style={{ color: "#fff" }}>Bienvenue Visiteur !</span>
          </h2>
          
          <h1 style={{ fontSize: "48px", color: "#FFCC00", fontWeight: "800", marginBottom: "20px" }}>
            Accédez à vos tableaux de bord BI
          </h1>
          
          <p style={{ fontSize: "18px", color: "#888", maxWidth: "700px", fontStyle: "italic", lineHeight: "1.6" }}>
            <span style={{ color: "#fff" }}>Un système décisionnel moderne, centralisé et automatisé pour La Poste Tunisienne.</span>
          </p>

          {/* Aperçu central du dashboard */}
          <div style={{ 
            marginTop: "50px", 
            width: "80%", 
            maxWidth: "800px",
            aspectRatio: "16/9",
            backgroundColor: "#FFF",
            borderRadius: "15px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
            border: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            {/* Ici on met l'image de fond ou un aperçu du dashboard */}
            <img 
              src="dash.png" 
              alt="Preview" 
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} 
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div style={{ position: "absolute", color: "#ccc" }}></div>
          </div>

        </div>

        <footer style={{ padding: "20px", textAlign: "center", color: "#aaa", fontSize: "12px" }}>
          © 2026 La Poste Tunisienne — Plateforme Analytique Sécurisée
        </footer>
      </main>

    </div>
  );
}