const express = require("express");
const dotenv = require("dotenv").config();
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
const morgan = require("morgan");
const port = process.env.PORT || 443;

// Middleware
app.use(morgan("dev"));

// Routes
app.get("/", (req, res) => {
  res.send("WELCOME TO THE HTTPS SERVER FOR arduinoooo.lol");
});

// SSL certs for arduinoooo.lol
const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/arduinoooo.lol/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/arduinoooo.lol/fullchain.pem"),
};

// HTTPS server
https.createServer(options, app).listen(port, () => {
  console.log(`App is running at https://arduinoooo.lol:${port}`);
});
