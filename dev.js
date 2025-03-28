const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const colors = require("colors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
require("dotenv").config();

// Sécurité : Vérifie la clé secrète
if (!process.env.JWT_SECRET) {
  console.error("ERREUR : JWT_SECRET n'est pas défini dans le fichier .env");
  process.exit(1);
}

// Configuration MongoDB
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://cmendesdasilva:tdHvwsn2mVKtDGCk@badge-db.foqirp2.mongodb.net/?retryWrites=true&w=majority&appName=badge-db";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 5000,
});

// Express App
const app = express();
app.use(bodyParser.json());

let db, badgesCollection;

// Middleware JWT
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

// Utilisateur local pour test
const users = [
  { username: 'admin', password: 'admin123' }
];

// Authentification
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.sendStatus(401);

  const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });

  res.json({ token });
});

app.use(authenticateToken);

// ROUTES
app.post("/create_badge", async (req, res) => {
  try {
    const { badge_id, level, name } = req.body;
    if (!badge_id || !level || !name) {
      return res.status(400).json({ error: "badge_id, level et name sont requis" });
    }

    const newBadge = {
      badge_id,
      level,
      name,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await badgesCollection.insertOne(newBadge);
    console.log(`[${colors.green("OK")}] Badge créé : ${badge_id}`);
    res.status(201).json({ message: "Badge créé", badge: newBadge });
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Création du badge :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/badgesall", async (req, res) => {
  try {
    const badges = await badgesCollection.find().toArray();
    console.log(`[${colors.green("OK")}] Récupération de tous les badges.`);
    res.json(badges);
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Récupération badges :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/modif_badge", async (req, res) => {
  try {
    const { badge_id, level, name } = req.body;
    if (!badge_id || !level || !name) {
      return res.status(400).json({ error: "badge_id, level et name sont requis" });
    }

    const result = await badgesCollection.updateOne(
      { badge_id },
      { $set: { level, name, updated_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Badge introuvable" });
    }

    console.log(`[${colors.green("OK")}] Badge mis à jour : ${badge_id}`);
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

    const result = await badgesCollection.deleteOne({ badge_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Badge introuvable" });
    }

    console.log(`[${colors.green("OK")}] Badge supprimé : ${badge_id}`);
    res.json({ message: "Badge supprimé" });
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Suppression badge :`, error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/badge", async (req, res) => {
  try {
    const { badge_id } = req.body;
    if (!badge_id) {
      return res.status(400).json({ error: "badge_id requis" });
    }

    const badge = await badgesCollection.findOne({ badge_id });

    if (!badge) {
      return res.status(200).json({ error: "Badge introuvable" });
    }

    console.log(`[${colors.green("OK")}] Badge récupéré : ${badge_id}`);
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

    console.log(`[${colors.green("OK")}] Connecté à MongoDB !`);

    app.listen(3000, () =>
      console.log(`[${colors.green("OK")}] Serveur lancé sur http://localhost:3000`)
    );
  } catch (error) {
    console.error(`[${colors.red("ERREUR")}] Connexion à MongoDB impossible`);
    process.exit(1);
  }
}

startServer();
