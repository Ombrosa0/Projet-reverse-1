const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb+srv://cmendesdasilva:tdHvwsn2mVKtDGCk@badge-db.foqirp2.mongodb.net/?retryWrites=true&w=majority&appName=badge-db";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const app = express();
app.use(express.json());

let db, badgesCollection;

// Connexion à la DB avant de lancer le serveur
async function startServer() {
  try {
    await client.connect();
    db = client.db("badge-db");
    badgesCollection = db.collection("badges");

    console.log("Connecté à MongoDB !");
    
    // Initialisation de la DB (seed)
    await seedDatabase();

    app.listen(3000, () => console.log("Serveur sur http://localhost:3000"));
  } catch (error) {
    console.error("Erreur de connexion MongoDB :", error);
    process.exit(1);
  }
}
startServer();

async function seedDatabase() {
  const existingBadges = await badgesCollection.countDocuments();
  if (existingBadges === 0) {
    console.log("Aucun badge trouvé dans la base de données.");
  } 
}

// Créer un badge
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
      updated_at: new Date() 
    };

    const result = await badgesCollection.insertOne(newBadge);
    res.status(201).json({ message: "Badge créé", badge: newBadge });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupérer tous les badges
app.get("/badgesall", async (req, res) => {
  try {
    const badges = await badgesCollection.find().toArray(); // Récupère tous les badges
    res.json(badges); // Retourne la liste des badges sous forme de JSON
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Modifier un badge
app.put("/modif_badge", async (req, res) => {
  try {
    const { badge_id, level, name } = req.body;
    if (!badge_id || !level || !name) {
      return res.status(400).json({ error: "badge_id, level et name sont requis" });
    }

    // Modifier le badge en utilisant le badge_id
    const result = await badgesCollection.updateOne(
      { badge_id: badge_id },
      { $set: { level, name, updated_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Badge introuvable" });
    }

    res.json({ message: "Badge mis à jour" });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprimer un badge
app.delete("/delete_badge", async (req, res) => {
  try {
    const { badge_id } = req.body; // Récupère le badge_id depuis le body
    if (!badge_id) return res.status(400).json({ error: "badge_id manquant" });

    // Supprimer le badge en utilisant le badge_id
    const result = await badgesCollection.deleteOne({ badge_id: badge_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Badge introuvable" });
    }

    res.json({ message: "Badge supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});