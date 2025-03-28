const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
    console.error("ERREUR : JWT_SECRET n'est pas défini dans le fichier .env");
    process.exit(1);
}

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const users = [
    { username: 'admin', password: 'admin123' }
];

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.sendStatus(401);

    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });

    res.json({ token });
});

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

app.get('/profile', authenticateToken, (req, res) => {
    res.json({ message: 'Bienvenue dans ton profil sécurisé', user: req.user });
});

app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
