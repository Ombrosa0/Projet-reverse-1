const express = require("express");
const dotenv = require("dotenv").config();
const https = require("https");
const fs = require("fs");
const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");
const colors = require("colors");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");

if (!process.env.JWT_SECRET) {
  console.error("ERREUR : JWT_SECRET n'est pas défini dans le fichier .env");
  process.exit(1);
}

const MODE = process.env.MODE || "dev";
const app = express();
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const uri = process.env.MONGODB_URI || "mongodb+srv://cmendesdasilva:tdHvwsn2mVKtDGCk@badge-db.foqirp2.mongodb.net/?retryWrites=true&w=majority&appName=badge-db";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 5000,
});

let db, badgesCollection, logsCollection;

const users = [
  { username: 'admin', password: 'admin123' }
];

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

async function logAction({ action, badge_id, name, details }) {
  const log = {
    action,
    badge_id,
    name,
    date_heure: new Date().toISOString(),
    details
  };
  try {
    await logsCollection.insertOne(log);
    console.log(`[${colors.cyan("LOG")}] ${action} - ${badge_id}`);
  } catch (err) {
    console.error(`[${colors.red("ERREUR")}] Insertion du log échouée :`, err);
  }
}

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.sendStatus(401);
  
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '2h'
    });
  
    console.log(`[${colors.green("JWT")}] Token généré pour '${username}' à ${new Date().toISOString()}`);
  
    try {
      await logAction({
        action: "connexion",
        badge_id: null, 
        name: username,
        details: "Token JWT généré après login"
      });
    } catch (err) {
      console.error(`[${colors.red("ERREUR")}] Échec de log de connexion`, err);
    }
  
    res.json({ token });
  });  

app.use(authenticateToken);

app.post("/create_badge", async (req, res) => {
  try {
    const { badge_id, level, name } = req.body;
    if (!badge_id || !level || !name) return res.status(400).json({ error: "badge_id, level et name sont requis" });

    const newBadge = { badge_id, level, name, created_at: new Date(), updated_at: new Date() };
    await badgesCollection.insertOne(newBadge);
    await logAction({ action: "ajout_badge", badge_id, name, details: `Badge ajouté avec niveau ${level}` });
    res.status(201).json({ message: "Badge créé", badge: newBadge });
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Création du badge :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/badgesall", async (req, res) => {
  try {
    const badges = await badgesCollection.find().toArray();
    res.json(badges);
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Récupération badges :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/modif_badge", async (req, res) => {
  try {
    const { badge_id, level, name } = req.body;
    if (!badge_id || !level || !name) return res.status(400).json({ error: "badge_id, level et name sont requis" });

    const result = await badgesCollection.updateOne({ badge_id }, { $set: { level, name, updated_at: new Date() } });
    if (result.matchedCount === 0) return res.status(404).json({ error: "Badge introuvable" });

    await logAction({ action: "modif_badge", badge_id, name, details: `Badge modifié au niveau ${level}` });
    res.json({ message: "Badge mis à jour" });
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Modification badge :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/delete_badge", async (req, res) => {
  try {
    const { badge_id } = req.body;
    if (!badge_id) return res.status(400).json({ error: "badge_id manquant" });

    const badge = await badgesCollection.findOne({ badge_id });
    if (!badge) return res.status(404).json({ error: "Badge introuvable" });

    await badgesCollection.deleteOne({ badge_id });
    await logAction({ action: "suppr_badge", badge_id, name: badge.name || "Inconnu", details: "Badge supprimé" });
    res.json({ message: "Badge supprimé" });
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Suppression badge :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/badge", async (req, res) => {
  try {
    const { badge_id } = req.body;
    if (!badge_id) return res.status(400).json({ error: "badge_id requis" });

    const badge = await badgesCollection.findOne({ badge_id });
    if (!badge) return res.status(200).json({ error: "Badge introuvable" });

    await logAction({ action: "consult_badge", badge_id, name: badge.name, details: "Consultation du badge" });
    res.json(badge);
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Récupération badge :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

async function startServer() {
  try {
    await client.connect();
    db = client.db("badge-db");
    badgesCollection = db.collection("badges");
    logsCollection = db.collection("logs");

    console.log(`[${colors.green("OK")}] Connecté à MongoDB !`);

    if (MODE === "prod") {
      const options = {
        key: fs.readFileSync("/etc/letsencrypt/live/arduinoooo.lol/privkey.pem"),
        cert: fs.readFileSync("/etc/letsencrypt/live/arduinoooo.lol/fullchain.pem")
      };

      const port = process.env.PORT || 443;
      https.createServer(options, app).listen(port, () => {
        console.log(`[${colors.green("OK")}] Serveur lancé en production sur https://arduinoooo.lol:${port}`);
      });
    } else {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`[${colors.green("OK")}] Serveur lancé en dev sur http://localhost:${port}`);
      });
    }
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Connexion à MongoDB impossible`, error);
    process.exit(1);
  }
}

startServer();