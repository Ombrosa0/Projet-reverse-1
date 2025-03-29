const express = require("express");
const dotenv = require("dotenv").config();
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
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.sendStatus(401);

    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
        expiresIn: '2h'
    });

    res.json({ token });
});

app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: `Bienvenue ${req.user.username}, accès protégé réussi !` });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serveur lancé en mode ${MODE} sur le port ${port}`);
});