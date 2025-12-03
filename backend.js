// === Backend Moi Au Moins ===

// Import
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

// Express + HTTP
const app = express();
const server = createServer(app);

// Autoriser ton front CodeSandbox
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

// Socket.IO config pour Render
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Salle et joueurs
const rooms = {};

// Nouveau joueur connecté
io.on("connection", (socket) => {
  console.log("🔌 Nouveau joueur :", socket.id);

  // Créer une salle
  socket.on("createRoom", ({ roomCode, playerName }) => {
    rooms[roomCode] = { players: [playerName], phrases: {} };
    socket.join(roomCode);
    console.log(`📂 Salle créée : ${roomCode}`);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // Rejoindre une salle
  socket.on("joinRoom", ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) return;
    rooms[roomCode].players.push(playerName);
    socket.join(roomCode);
    console.log(`👤 ${playerName} rejoint ${roomCode}`);
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // Envoyer une phrase
  socket.on("sendPhrase", ({ roomCode, playerName, phrase }) => {
    rooms[roomCode].phrases[playerName] = phrase;
    io.to(roomCode).emit("updatePhrases", rooms[roomCode].phrases);
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("❌ Déconnexion :", socket.id);
  });
});

// Port Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Serveur démarré sur Render, port", PORT);
});
