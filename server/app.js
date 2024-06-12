const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);
let chess = new Chess();

const players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniqueSocket) => {
  console.log("New connection");

  if (!players.w) {
    players.w = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "w");
  } else if (!players.b) {
    players.b = uniqueSocket.id;
    uniqueSocket.emit("playerRole", "b");
  } else {
    uniqueSocket.emit("spectatorRole");
  }

  uniqueSocket.on("disconnect", () => {
    if (uniqueSocket.id === players.w) {
      delete players.w;
    } else if (uniqueSocket.id === players.b) {
      delete players.b;
    }
  });

  uniqueSocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniqueSocket.id !== players.w) return;
      if (chess.turn() === "b" && uniqueSocket.id !== players.b) return;

      const result = chess.move(move);

      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move); // Broadcast the move to all clients
        io.emit("boardState", chess.fen());

        // Check for checkmate, draw, stalemate, or check and emit appropriate events
        if (chess.isCheckmate()) {
          io.emit("gameOver", { result: "checkmate" });
        } else if (chess.isStalemate()) {
          io.emit("gameOver", { result: "stalemate" });
        } else if (chess.isDraw() || chess.isThreefoldRepetition()) {
          io.emit("gameOver", { result: "draw" });
        } else if (chess.inCheck()) {
          io.emit("gameStatus", { result: "check" });
        } else {
          io.emit("gameStatus", { result: "normal" });
        }
      } else {
        uniqueSocket.emit("invalidMove", move);
      }
    } catch (error) {
      console.log(error);
      uniqueSocket.emit("Invalid move : ", move);
    }
  });

  uniqueSocket.on("restart", () => {
    chess = new Chess();
    io.emit("gameRestarted");
  });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
