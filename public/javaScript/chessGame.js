const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const messageContainer = document.querySelector(".message-container");

// Create a restart button
const restartButton = document.querySelector(".restart-btn");
restartButton.addEventListener("click", () => {
  socket.emit("restart");
});

let draggedPiece = null;
let sourceSquare = null;
let playerRole = "w";

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElem = document.createElement("div");
      squareElem.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 == 0 ? "light" : "dark"
      );

      squareElem.dataset.row = rowIndex;
      squareElem.dataset.col = squareIndex;

      if (square) {
        const pieceElem = document.createElement("div");
        pieceElem.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        pieceElem.innerHTML = getPieceUnicode(square.type, square.color);
        pieceElem.draggable = playerRole === square.color;

        if (pieceElem.draggable) {
          pieceElem.addEventListener("dragstart", (e) => {
            draggedPiece = pieceElem;
            sourceSquare = { row: rowIndex, col: squareIndex };
            e.dataTransfer.setData("text/plain", "");
          });

          pieceElem.addEventListener("dragend", () => {
            draggedPiece = null;
            sourceSquare = null;
          });
        }

        squareElem.appendChild(pieceElem);
      }

      squareElem.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElem.addEventListener("drop", (e) => {
        e.preventDefault();

        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareElem.dataset.row),
            col: parseInt(squareElem.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElem);
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q", // Example promotion to queen
  };

  const result = chess.move(move);

  if (result) {
    renderBoard();
    socket.emit("move", move);
  }
};

const getPieceUnicode = (type, color) => {
  const pieces = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
  };

  return color === "w" ? pieces[type] : pieces[type].toLowerCase();
};

// Socket event handlers
socket.on("playerRole", (role) => {
  if (role === "w" || role === "b") {
    playerRole = role;
    renderBoard();
  } else {
    console.error("Invalid player role:", role);
  }
});

socket.on("spectatorRole", () => {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", (fen) => {
  if (chess.validate_fen(fen).valid) {
    chess.load(fen);
    renderBoard();
  } else {
    console.error("Invalid FEN string:", fen);
  }
});
socket.on("move", (move) => {
  const result = chess.move(move);
  if (result) {
    renderBoard();
  } else {
    console.error("Invalid move:", move);
  }
});

// Socket event handler for game status
socket.on("gameStatus", ({ result }) => {
  if (result === "check") {
    messageContainer.textContent = "King is in check!";
    messageContainer.style.display = "block";
  } else {
    messageContainer.style.display = "none";
  }
});

// Socket event handler for game over
socket.on("gameOver", ({ result }) => {
  let message;
  switch (result) {
    case "checkmate":
      message = "Checkmate! Game Over.";
      break;
    case "draw":
      message = "The game is a draw.";
      break;
    case "stalemate":
      message = "Stalemate! Game Over.";
      break;
    default:
      message = "Game Over.";
  }

  // Display message in message container
  messageContainer.textContent = message;
  messageContainer.style.display = "block";
  restartButton.style.display = "block"; // Show the restart button
});

// Socket event handler for game restarted
socket.on("gameRestarted", () => {
  chess.reset();
  renderBoard();
  messageContainer.style.display = "none";
  restartButton.style.display = "none";
});

renderBoard();
