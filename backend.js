const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Server is running !");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], phrases: {} };
    }

    rooms[roomCode].players.push(playerName);
    socket.join(roomCode);

    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
  });

  socket.on("sendPhrase", ({ roomCode, playerName, phrase }) => {
    rooms[roomCode].phrases[playerName] = phrase;
    io.to(roomCode).emit("updatePhrases", rooms[roomCode].phrases);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
