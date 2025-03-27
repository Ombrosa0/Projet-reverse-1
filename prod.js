const express = require("express");
const dotenv = require("dotenv").config();
const https = require("https");
const fs = require("fs");
const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");
const colors = require("colors");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// MongoDB connection
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

let db, badgesCollection;

async function startServer() {
    try {
        await client.connect();
        db = client.db("badge-db");
        badgesCollection = db.collection("badges");

        console.log(`[${colors.green("OK")}] Connecté à MongoDB !`);

        await seedDatabase();

        // HTTPS SSL configuration
        const options = {
            key: fs.readFileSync("/etc/letsencrypt/live/arduinoooo.lol/privkey.pem"),
            cert: fs.readFileSync("/etc/letsencrypt/live/arduinoooo.lol/fullchain.pem"),
        };

        const port = process.env.PORT || 443;
        https.createServer(options, app).listen(port, () => {
            console.log(`[${colors.green("OK")}] Serveur lancé sur https://arduinoooo.lol:${port}`);
        });

    } catch (error) {
        console.error(`[${colors.red("ERREUR")}] Connexion à MongoDB impossible`, error);
        process.exit(1);
    }
}

startServer();

async function seedDatabase() {
    const existingBadges = await badgesCollection.countDocuments();
    if (existingBadges === 0) {
        console.log(`[${colors.yellow("INFO")}] Aucun badge trouvé dans la base de données.`);
    }
}

// Routes
app.get("/", (req, res) => {
    res.send("WELCOME TO THE HTTPS SERVER FOR arduinoooo.lol (badge API)");
});

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

app.post("/badge", async (req, res) => {
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
