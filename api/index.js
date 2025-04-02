// ──────────────────────────────
// IMPORTS
// ──────────────────────────────
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

// ──────────────────────────────
// GLOBAL CONFIGURATION
// ──────────────────────────────
if (!process.env.JWT_SECRET) {
    console.error("ERREUR : JWT_SECRET n'est pas défini dans le fichier .env");
    process.exit(1);
}

const MODE = process.env.MODE || "dev";
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://cmendesdasilva:tdHvwsn2mVKtDGCk@badge-db.foqirp2.mongodb.net/?retryWrites=true&w=majority&appName=badge-db";

const app = express();
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ──────────────────────────────
// DATABASE
// ──────────────────────────────
const client = new MongoClient(MONGO_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
    connectTimeoutMS: 5000,
});

let db, badgesCollection, logsCollection, lastBadgeCollection;

// ──────────────────────────────
// CREDENTIALS
// ──────────────────────────────
const users = [
    { username: 'admin', password: 'admin123' }
];

// ──────────────────────────────
// JWT TOKEN
// ──────────────────────────────
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

// ──────────────────────────────
// LOGS
// ──────────────────────────────
async function logAction({ action, badge_id, name, level = null, details }) {
    const log = {
        action,
        badge_id,
        name,
        level,
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

// ──────────────────────────────
// JWT LOGIN
// ──────────────────────────────
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

// ──────────────────────────────
//  ROUTES
// ──────────────────────────────
app.use(authenticateToken);

app.post("/create_badge", async (req, res) => {
    try {
        const { badge_id, level, name } = req.body;
        if (!badge_id || !level || !name)
            return res.status(400).json({ error: "badge_id, level et name sont requis" });

        const newBadge = { badge_id, level, name, created_at: new Date(), updated_at: new Date() };
        await badgesCollection.insertOne(newBadge);
        await logAction({ action: "ajout_badge", badge_id, name, level, details: `Badge ajouté avec niveau ${level}` });
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
        if (!badge_id || !level || !name)
            return res.status(400).json({ error: "badge_id, level et name sont requis" });

        const result = await badgesCollection.updateOne(
            { badge_id },
            { $set: { level, name, updated_at: new Date() } }
        );

        if (result.matchedCount === 0)
            return res.status(404).json({ error: "Badge introuvable" });

        await logAction({ action: "modif_badge", badge_id, name, level, details: `Badge modifié au niveau ${level}` });
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
        await logAction({
            action: "suppr_badge",
            badge_id,
            level: badge.level || null,
            name: badge.name || "Inconnu",
            details: "Badge supprimé"
        });

        res.json({ message: "Badge supprimé" });
    } catch (error) {
        console.error(`[${colors.red("ERREUR")}] Suppression badge :`, error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.post("/badge", async (req, res) => {
    try {
        const { badge_id } = req.body;
        if (!badge_id) return res.status(400).json({ error: "badge_id requis" });

        const badge = await badgesCollection.findOne({ badge_id });

        await lastBadgeCollection.deleteMany({});

        if (!badge) {
            await lastBadgeCollection.insertOne({
                badge_id,
                error: "Badge introuvable",
                createdAt: new Date()
            });

            await logAction({
                action: "consult_badge_inconnu",
                badge_id,
                name: "Inconnu",
                details: "Consultation d'un badge inconnu"
            });

            return res.status(200).json({ error: "Badge introuvable" });
        }

        await lastBadgeCollection.insertOne({ ...badge, createdAt: new Date() });

        await logAction({
            action: "consult_badge",
            badge_id,
            name: badge.name,
            badge: badge.level,
            details: "Consultation du badge"
        });

        res.json(badge);
    } catch (error) {
        console.error(`[${colors.red("ERREUR")}] Récupération badge :`, error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get("/last_badge", async (req, res) => {
    try {
        const badge = await lastBadgeCollection.findOne();
        if (!badge) return res.status(202).json({ error: "Aucun badge récent" });
        res.json(badge);
    } catch (error) {
        console.error(`[${colors.red("ERREUR")}] Récupération last_badge :`, error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

app.get("/logs", async (req, res) => {
    try {
        const logs = await logsCollection
            .find()
            .sort({ date_heure: -1 })
            .limit(50)
            .toArray();

        res.json(logs);
    } catch (error) {
        console.error(`[${colors.red("ERREUR")}] Récupération logs :`, error);
        res.status(500).json({ error: "Erreur serveur lors de la récupération des logs" });
    }
});

// ──────────────────────────────
//  START SERVER
// ──────────────────────────────
async function startServer() {
    try {
        await client.connect();
        db = client.db("badge-db");
        lastBadgeCollection = db.collection("last_badge");

        try {
            await lastBadgeCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 });
        } catch (err) {
            console.warn(`[${colors.yellow("WARN")}] Impossible de créer l'index TTL`, err);
        }

        badgesCollection = db.collection("badges");
        logsCollection = db.collection("logs");

        console.log(`[${colors.green("OK")}] Connecté à MongoDB !`);

        app.listen(PORT, () => {
            console.log(`[${colors.green("OK")}] Serveur lancé en mode ${MODE} sur le port ${PORT}`);
        });

    } catch (error) {
        console.error(`[${colors.red("ERREUR")}] Connexion à MongoDB impossible`, error);
        process.exit(1);
    }
}

startServer();