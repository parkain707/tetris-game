// --- DOM Elements ---
const boardCanvas = document.getElementById('tetris-board');
const boardCtx = boardCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece-canvas');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

// --- Game Constants ---
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const NEXT_BOX_SIZE = 4;
let BLOCK_SIZE = 30; // Initial value, will be resized

// Playful and distinct colors
const COLORS = [
    null,
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FED766', // Yellow
    '#9B5DE5', // Purple
    '#F15BB5', // Pink
    '#00F5D4', // Green
];

// Tetromino shapes
const PIECES = {
    'T': [[1, 1, 1], [0, 1, 0]],
    'O': [[2, 2], [2, 2]],
    'L': [[3, 0, 0], [3, 3, 3]],
    'J': [[0, 0, 4], [4, 4, 4]],
    'I': [[5, 5, 5, 5]],
    'S': [[0, 6, 6], [6, 6, 0]],
    'Z': [[7, 7, 0], [0, 7, 7]]
};
const PIECE_KEYS = Object.keys(PIECES);

// --- Game State Variables ---
let board;
let score;
let level;
let lines;
let gameOver;
let dropCounter;
let dropInterval;
let lastTime;
let piece;
let nextPiece;
let animationFrameId;

// --- Game Setup and Drawing ---

function resizeAndDraw() {
    // Resize main board
    const gameArea = document.getElementById('game-area');
    BLOCK_SIZE = gameArea.clientWidth / BOARD_WIDTH;
    boardCanvas.width = BOARD_WIDTH * BLOCK_SIZE;
    boardCanvas.height = BOARD_HEIGHT * BLOCK_SIZE;

    // Resize next piece canvas
    const nextPieceContainer = nextCanvas.parentElement;
    const nextBlockSize = (nextPieceContainer.clientWidth - 16) / NEXT_BOX_SIZE; // 16 for padding
    nextCanvas.width = NEXT_BOX_SIZE * nextBlockSize;
    nextCanvas.height = NEXT_BOX_SIZE * nextBlockSize;
    
    draw();
    drawNextPiece();
}

function createBoard() {
    return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
}

function createPiece() {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    const matrix = PIECES[key];
    const colorId = PIECE_KEYS.indexOf(key) + 1;
    return {
        pos: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(matrix[0].length / 2), y: 0 },
        matrix: matrix,
        colorId: colorId
    };
}

function draw() {
    if (!board) return;
    // Draw board
    boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
    boardCtx.fillStyle = '#1f2937';
    boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(boardCtx, x, y, value, BLOCK_SIZE);
            }
        });
    });

    // Draw current piece
    if (piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(boardCtx, piece.pos.x + x, piece.pos.y + y, piece.colorId, BLOCK_SIZE);
                }
            });
        });
    }
}

function drawNextPiece() {
    if (!nextPiece) return;
    const blockSize = nextCanvas.width / NEXT_BOX_SIZE;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = '#1f2937';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const matrix = nextPiece.matrix;
    const offsetX = (NEXT_BOX_SIZE - matrix[0].length) / 2;
    const offsetY = (NEXT_BOX_SIZE - matrix.length) / 2;

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(nextCtx, offsetX + x, offsetY + y, nextPiece.colorId, blockSize);
            }
        });
    });
}

function drawBlock(context, x, y, colorId, size) {
    context.fillStyle = COLORS[colorId];
    context.fillRect(x * size, y * size, size, size);
    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.lineWidth = 2;
    context.strokeRect(x * size, y * size, size, size);
}

// --- Game Logic ---

function resetPlayer() {
    piece = nextPiece;
    nextPiece = createPiece();
    piece.pos.y = 0;
    piece.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.matrix[0].length / 2);
    
    if (collide(board, piece)) {
        // Game Over
        gameOver = true;
        finalScoreEl.textContent = score;
        gameOverScreen.style.display = 'flex';
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    drawNextPiece();
}

function collide(board, piece) {
    const { matrix, pos } = piece;
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0 &&
                (board[y + pos.y] && board[y + pos.y][x + pos.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = piece.colorId;
            }
        });
    });
}

function rotate(matrix) {
    const result = [];
    for (let y = 0; y < matrix[0].length; y++) {
        result.push([]);
        for (let x = matrix.length - 1; x >= 0; x--) {
            result[y].push(matrix[x][y]);
        }
    }
    return result;
}

function playerRotate() {
    if (gameOver) return;
    const originalMatrix = piece.matrix;
    const originalPos = piece.pos.x;
    let offset = 1;

    piece.matrix = rotate(piece.matrix);
    
    while (collide(board, piece)) {
        piece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.matrix[0].length) {
            // Rotation failed, revert
            piece.matrix = originalMatrix;
            piece.pos.x = originalPos;
            return;
        }
    }
}

function playerMove(dir) {
    if (gameOver) return;
    piece.pos.x += dir;
    if (collide(board, piece)) {
        piece.pos.x -= dir;
    }
}

function playerDrop() {
    if (gameOver) return;
    piece.pos.y++;
    if (collide(board, piece)) {
        piece.pos.y--;
        merge(board, piece);
        sweep();
        resetPlayer();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    if (gameOver) return;
    while (!collide(board, piece)) {
        piece.pos.y++;
    }
    piece.pos.y--;
    merge(board, piece);
    sweep();
    resetPlayer();
    dropCounter = 0;
}

function sweep() {
    let rowCount = 0;
    outer: for (let y = board.length - 1; y > 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++;
        rowCount++;
    }
    
    if (rowCount > 0) {
        lines += rowCount;
        score += [0, 100, 300, 500, 800][rowCount] * level;
        
        if (lines >= level * 10) {
            level++;
            dropInterval = Math.max(150, 1000 - (level - 1) * 50);
        }
        updateInfo();
    }
}

function updateInfo() {
    scoreEl.textContent = score;
    levelEl.textContent = level;
    linesEl.textContent = lines;
}

// --- Game Loop and Control ---

function update(time = 0) {
    if (gameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    animationFrameId = requestAnimationFrame(update);
}

function startGame() {
    board = createBoard();
    nextPiece = createPiece();
    resetPlayer();
    
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    dropInterval = 1000;
    lastTime = 0;
    dropCounter = 0;
    
    updateInfo();
    resizeAndDraw();
    
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    update();
}

// --- Event Listeners ---

window.addEventListener('resize', resizeAndDraw);

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

document.addEventListener('keydown', event => {
    if (gameOver) return;
    switch (event.key) {
        case 'ArrowLeft': playerMove(-1); break;
        case 'ArrowRight': playerMove(1); break;
        case 'ArrowDown': playerDrop(); break;
        case 'ArrowUp': playerRotate(); break;
        case ' ': event.preventDefault(); playerHardDrop(); break;
    }
});

document.getElementById('rotate-btn').addEventListener('click', playerRotate);
document.getElementById('left-btn').addEventListener('click', () => playerMove(-1));
document.getElementById('right-btn').addEventListener('click', () => playerMove(1));
document.getElementById('down-btn').addEventListener('click', playerDrop);
document.getElementById('drop-btn').addEventListener('click', playerHardDrop);

// --- Initial Load ---
// The resizeAndDraw function is called to set up the initial canvas sizes and draw the initial state.
resizeAndDraw();
