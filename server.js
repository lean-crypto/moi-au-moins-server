// Simple server "Moi Au Moins" using Node.js + Express + WebSocket
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Serve basic welcome message
app.get("/", (req, res) => {
  res.send("Serveur Moi Au Moins en ligne ✔️");
});

// Create HTTP + WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Store rooms + players
let rooms = {};

// When a client connects
io.on("connection", (socket) => {
  console.log("Un joueur est connecté :", socket.id);

  // Create room
  socket.on("createRoom", ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = {
        players: [],
        phrases: {}
      };
    }

    rooms[roomCode].players.push(playerName);
    socket.join(roomCode);

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // Join room
  socket.on("joinRoom", ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      socket.emit("error", "La salle n'existe pas !");
      return;
    }

    rooms[roomCode].players.push(playerName);
    socket.join(roomCode);

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  // Receive phrase
  socket.on("sendPhrase", ({ roomCode, playerName, phrase }) => {
    rooms[roomCode].phrases[playerName] = phrase;

    io.to(roomCode).emit("updatePhrases", rooms[roomCode].phrases);
  });

  socket.on("disconnect", () => {
    console.log("Joueur déconnecté", socket.id);
  });
});

// Start server on port 3000
server.listen(3000, () => {
  console.log("Serveur opérationnel sur le port 3000 🚀");
});

