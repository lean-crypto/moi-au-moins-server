// backend.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.get("/", (req, res) => {
  res.send("Moi Au Moins backend is running 🚀");
});

const server = http.createServer(app);

// --- Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- Structure des salles ---
// rooms[code] = {
//   hostId: "socketId du créateur",
//   players: [ { id, name } ],
//   started: false
// }
const rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 Nouveau joueur connecté :", socket.id);

  // Quand un joueur veut rejoindre une salle
  socket.on("joinRoom", ({ roomCode, playerName, isHost }) => {
    roomCode = (roomCode || "").toUpperCase().trim();
    playerName = (playerName || "").trim();

    if (!roomCode || !playerName) {
      socket.emit("roomError", "Code de salle ou prénom manquant.");
      return;
    }

    // Créer la salle si elle n'existe pas encore
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        hostId: null,
        players: [],
        started: false,
      };
    }

    const room = rooms[roomCode];

    // Si c'est l'hôte et qu'il n'y a pas encore d'hôte : on le définit
    if (isHost && !room.hostId) {
      room.hostId = socket.id;
    }

    // Ajouter le joueur dans la salle (si pas déjà dans la liste)
    const already = room.players.find((p) => p.id === socket.id);
    if (!already) {
      room.players.push({ id: socket.id, name: playerName });
    }

    socket.join(roomCode);
    console.log("👥", playerName, "rejoint la salle", roomCode);

    // Envoyer l'état de la salle à tous les joueurs
    io.to(roomCode).emit("roomUpdate", {
      roomCode,
      hostId: room.hostId,
      players: room.players,
      started: room.started,
    });
  });

  // Quand l'hôte clique sur "Démarrer la partie"
  socket.on("startGame", ({ roomCode }) => {
    roomCode = (roomCode || "").toUpperCase().trim();
    const room = rooms[roomCode];
    if (!room) return;

    // Seul l'hôte peut démarrer
    if (socket.id !== room.hostId) {
      socket.emit("roomError", "Seul le créateur peut démarrer la partie.");
      return;
    }

    room.started = true;
    console.log("🎮 Partie démarrée dans la salle", roomCode);
    io.to(roomCode).emit("gameStarted", { roomCode });
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("❌ Joueur déconnecté :", socket.id);

    // Retirer le joueur des salles
    for (const code in rooms) {
      const room = rooms[code];
      const before = room.players.length;
      room.players = room.players.filter((p) => p.id !== socket.id);

      // Si c'était l'hôte, on choisit un autre hôte (ou on vide)
      if (room.hostId === socket.id) {
        room.hostId = room.players[0]?.id || null;
      }

      // Si plus personne → supprimer la salle
      if (room.players.length === 0) {
        console.log("🗑️ Suppression de la salle vide", code);
        delete rooms[code];
      } else if (before !== room.players.length) {
        // Mise à jour pour les autres joueurs
        io.to(code).emit("roomUpdate", {
          roomCode: code,
          hostId: room.hostId,
          players: room.players,
          started: room.started,
        });
      }
    }
  });
});

// --- Lancer le serveur ---
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("🚀 Serveur opérationnel sur le port", PORT);
});
// === IMPORTS ===
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";

// === CONFIG EXPRESS + CORS ===
const app = express();
app.use(cors());

// === SERVEUR HTTP ===
const server = http.createServer(app);

// === SOCKET.IO AVEC CONFIG RENDER ===
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// === STOCKAGE DES SALLES ===
const rooms = {}; 
// rooms = {
//   "AB4D9": { players: ["Lena", "Nina"], creator: "socketID1" }
// };

// === NOUVEL UTILISATEUR CONNECTÉ ===
io.on("connection", (socket) => {
  console.log("🎉 Nouveau joueur connecté :", socket.id);

  // --- CRÉATION DE SALLE ---
  socket.on("createRoom", ({ roomCode, playerName }) => {
    rooms[roomCode] = {
      players: [playerName],
      creator: socket.id,      // <===== le créateur est enregistré ici
    };

    socket.join(roomCode);

    console.log("🏠 Salle créée :", roomCode, "par", playerName);

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // --- REJOINDRE UNE SALLE ---
  socket.on("joinRoom", ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      socket.emit("errorMessage", "La salle n'existe pas !");
      return;
    }

    rooms[roomCode].players.push(playerName);
    socket.join(roomCode);

    console.log("👤 Nouveau joueur dans", roomCode, ":", playerName);

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // --- DÉMARRAGE DE LA PARTIE ---
  socket.on("startGame", ({ roomCode }) => {
    if (!rooms[roomCode]) return;

    // 🛑 Seul le créateur peut démarrer
    if (rooms[roomCode].creator !== socket.id) {
      socket.emit("errorMessage", "Seul le créateur peut démarrer la partie !");
      return;
    }

    console.log("🎮 Début de la partie pour la salle :", roomCode);

    // Tous les joueurs reçoivent l'événement
    io.to(roomCode).emit("gameStarted");
  });

  // --- DÉCONNEXION ---
  socket.on("disconnect", () => {
    console.log("❌ Joueur déconnecté :", socket.id);
  });
});

// === DÉMARRAGE DU SERVEUR ===
server.listen(10000, () => {
  console.log("🚀 Serveur opérationnel sur le port 10000 !");
});

