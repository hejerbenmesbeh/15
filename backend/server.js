const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIGURATION DE LA CONNEXION MYSQL ---
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'utilisateurs' // Nom de votre base de données
});

db.connect(err => {
  if (err) {
    console.error('Erreur de connexion MySQL :', err);
  } else {
    console.log('Base de données connectée avec succès !');
  }
});

// --- ROUTE D'INSCRIPTION ---
app.post('/register', (req, res) => {
  const { nom, email, password, role } = req.body;

  // Utilisation de la table 'agents' comme définie dans votre structure SQL
  const sql = 'INSERT INTO agents (nom, email, password, role) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [nom, email, password, role], (err, result) => {
    if (err) {
      console.error("Erreur lors de l'insertion :", err);
      return res.status(500).json({ message: "Erreur lors de l'inscription" });
    }
    res.status(201).json({ message: "Agent enregistré avec succès !" });
  });
});

// --- ROUTE DE CONNEXION (LOGIN) ---
app.post('/login', (req, res) => {
  const { email, password } = req.body; 
  
  const sql = 'SELECT * FROM agents WHERE email = ? AND password = ?';

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Erreur serveur" });
    }

    if (results.length > 0) {
      const user = results[0];
      // On renvoie un objet propre que React (homes.jsx) pourra lire facilement
      res.status(200).json({ 
        id: user.id, 
        nom: user.nom,  // Sera utilisé pour afficher "Bienvenue, hejer !"
        email: user.email,
        role: user.role 
      });
    } else {
      res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }
  });
});

// --- MISE À JOUR DU PROFIL ---
app.put("/update-profile/:id", (req, res) => {
  const userId = req.params.id;
  const { nom, email } = req.body;

  // Correction : On utilise 'agents' au lieu de 'utilisateur'
  const sql = "UPDATE agents SET nom = ?, email = ? WHERE id = ?";
  
  db.query(sql, [nom, email, userId], (err, result) => {
    if (err) {
      console.error("Erreur SQL :", err);
      return res.status(500).json({ message: "Erreur lors de la mise à jour" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Agent non trouvé" });
    }

    res.status(200).json({ message: "Profil mis à jour avec succès" });
  });
});

// --- CHANGEMENT DE MOT DE PASSE ---
app.put("/update-password/:id", (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  // Correction : On utilise la table 'agents'
  const sql = "UPDATE agents SET password = ? WHERE id = ?";
  
  db.query(sql, [newPassword, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Erreur SQL lors du changement de mot de passe" });
    }
    res.status(200).json({ message: "Mot de passe modifié avec succès" });
  });
});

// --- DÉMARRAGE DU SERVEUR ---
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});