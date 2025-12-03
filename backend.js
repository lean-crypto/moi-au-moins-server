// backend.js

import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// Socket.IO configuré pour Render
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Mémoire des salles
// rooms[code] = { hostId, hostName, players: [{id, name}], started: bool }
const rooms = {};

// Quand un client se connecte
io.on("connection", (socket) => {
  console.log("👤 Nouveau joueur connecté :", socket.id);

  // Création de salle
  socket.on("createRoom", ({ roomCode, playerName }) => {
    if (!roomCode || !playerName) return;

    // Si la salle existe déjà, on peut refuser ou écraser, là on refuse
    if (rooms[roomCode]) {
      socket.emit("roomError", "Cette salle existe déjà, choisis un autre code.");
      return;
    }

    rooms[roomCode] = {
      hostId: socket.id,
      hostName: playerName,
      players: [{ id: socket.id, name: playerName }],
      started: false,
    };

    socket.join(roomCode);
    console.log(`📦 Salle créée ${roomCode} par ${playerName}`);

    socket.emit("roomCreated", {
      roomCode,
      isHost: true,
      players: rooms[roomCode].players,
    });

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // Rejoindre une salle
  socket.on("joinRoom", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("roomError", "Cette salle n'existe pas.");
      return;
    }

    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);

    console.log(`➡️ ${playerName} rejoint la salle ${roomCode}`);

    // On prévient le joueur qui rejoint
    socket.emit("roomJoined", {
      roomCode,
      isHost: false,
      hostName: room.hostName,
      players: room.players,
    });

    // On met à jour la liste des joueurs pour tout le monde
    io.to(roomCode).emit("updatePlayers", room.players);
  });

  // Démarrer la partie (uniquement par le créateur)
  socket.on("startGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    if (socket.id !== room.hostId) {
      socket.emit("roomError", "Seul le créateur peut démarrer la partie.");
      return;
    }

    room.started = true;
    console.log(`🎮 Partie démarrée dans la salle ${roomCode}`);
    io.to(roomCode).emit("gameStarted", { roomCode, round: 1 });
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("❌ Joueur déconnecté :", socket.id);

    // On nettoie les joueurs dans chaque salle
    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      room.players = room.players.filter((p) => p.id !== socket.id);

      // Si c'était l'hôte, on supprime la salle
      if (room.hostId === socket.id) {
        io.to(code).emit("roomError", "Le créateur est parti, la salle est fermée.");
        delete rooms[code];
        console.log(`🗑 Salle supprimée ${code}`);
      } else {
        io.to(code).emit("updatePlayers", room.players);
      }
    }
  });
});

// Render : écoute sur le port donné
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("🚀 Serveur opérationnel sur le port", PORT);
});
