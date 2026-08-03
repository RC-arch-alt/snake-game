const gameArea = document.getElementById('gameArea');
const playOverlay = document.getElementById('playOverlay');
const boxSize = 20;
let rows, cols;
let snake, direction, food, speed, maze, gameRunning, gameInterval;

// Pending direction queue to prevent 180° reversal between ticks
let pendingDirection = null;

let currentLevel = 0;
let selectedDifficulty = 'easy';

const difficulties = [
    { name: 'easy', speed: 200 },
    { name: 'medium', speed: 150 },
    { name: 'hard', speed: 100 }
];

const mazeLayouts = [
    // Level 0: Easy - no obstacles
    [],
    // Level 1: Medium - simple walls
    [
        {x: 5, y: 2}, {x: 5, y: 3}, {x: 5, y: 4}, {x: 5, y: 5},
        {x: 14, y: 7}, {x: 14, y: 8}, {x: 14, y: 9}, {x: 14, y: 10}
    ],
    // Level 2: Hard - more obstacles
    [
        {x: 3, y: 2}, {x: 3, y: 3}, {x: 3, y: 4}, {x: 3, y: 5},
        {x: 6, y: 7}, {x: 6, y: 8}, {x: 6, y: 9},
        {x: 12, y: 2}, {x: 12, y: 3}, {x: 12, y: 4},
        {x: 15, y: 10}, {x: 15, y: 11}, {x: 15, y: 12}
    ]
];

function calcGrid() {
    rows = Math.floor(gameArea.offsetHeight / boxSize);
    cols = Math.floor(gameArea.offsetWidth / boxSize);
    // Guard against zero-size grid
    if (rows < 1) rows = 1;
    if (cols < 1) cols = 1;
}

function adjustedSpeed() {
    return difficulties.find(d => d.name === selectedDifficulty)?.speed || 200;
}

function spawnFood() {
    let newFood;
    let attempts = 0;
    do {
        newFood = {
            x: Math.floor(Math.random() * cols),
            y: Math.floor(Math.random() * rows)
        };
        attempts++;
        // Prevent infinite loop if grid is full
        if (attempts > 1000) break;
    } while (
        snake.some(seg => seg.x === newFood.x && seg.y === newFood.y) ||
        maze.some(seg => seg.x === newFood.x && seg.y === newFood.y)
    );
    return newFood;
}

function draw() {
    gameArea.innerHTML = '';

    // Draw maze
    maze.forEach(segment => {
        const wall = document.createElement('div');
        wall.style.width = `${boxSize}px`;
        wall.style.height = `${boxSize}px`;
        wall.style.backgroundColor = '#555';
        wall.style.position = 'absolute';
        wall.style.left = `${segment.x * boxSize}px`;
        wall.style.top = `${segment.y * boxSize}px`;
        gameArea.appendChild(wall);
    });

    // Draw snake
    snake.forEach((segment, index) => {
        const snakeSegment = document.createElement('div');
        snakeSegment.style.width = `${boxSize}px`;
        snakeSegment.style.height = `${boxSize}px`;
        snakeSegment.style.backgroundColor = index === 0 ? '#0f0' : '#0a0';
        snakeSegment.style.position = 'absolute';
        snakeSegment.style.left = `${segment.x * boxSize}px`;
        snakeSegment.style.top = `${segment.y * boxSize}px`;
        snakeSegment.style.borderRadius = '3px';
        gameArea.appendChild(snakeSegment);
    });

    // Draw food
    if (food) {
        const foodElement = document.createElement('div');
        foodElement.style.width = `${boxSize}px`;
        foodElement.style.height = `${boxSize}px`;
        foodElement.style.backgroundColor = 'red';
        foodElement.style.position = 'absolute';
        foodElement.style.left = `${food.x * boxSize}px`;
        foodElement.style.top = `${food.y * boxSize}px`;
        foodElement.style.borderRadius = '50%';
        gameArea.appendChild(foodElement);
    }

    // Hide overlay once snake has a direction (first arrow key pressed)
    if (playOverlay) {
        playOverlay.style.display = (direction.x === 0 && direction.y === 0 && gameRunning) ? 'flex' : 'none';
    }
}

function moveSnake() {
    // Apply any pending direction before moving
    if (pendingDirection) {
        direction = pendingDirection;
        pendingDirection = null;
    }

    // Don't move until a direction key is pressed
    if (direction.x === 0 && direction.y === 0) return;

    const newHead = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // Wall collision (game over)
    if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
        gameOver();
        return;
    }

    // Maze collision
    if (maze.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        gameOver();
        return;
    }

    // Self collision
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        gameOver();
        return;
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
        food = spawnFood();
    } else {
        snake.pop();
    }
}

function gameOver() {
    gameRunning = false;
    clearInterval(gameInterval);
    gameInterval = null;

    // Use a flag to prevent re-entrant calls while alert is showing
    if (window._gameOverShowing) return;
    window._gameOverShowing = true;

    alert('Game Over! Press OK to restart.');

    window._gameOverShowing = false;
    initGame();
}

function update() {
    if (!gameRunning) return;
    moveSnake();
    draw();
}

function createMaze() {
    maze = mazeLayouts[currentLevel] ? [...mazeLayouts[currentLevel]] : [];
}

function initGame() {
    calcGrid();
    snake = [{x: Math.floor(cols / 2), y: Math.floor(rows / 2)}];
    direction = {x: 0, y: 0}; // Snake doesn't move until arrow key pressed
    pendingDirection = null;   // Clear any stale queued direction
    createMaze();
    food = spawnFood();
    gameRunning = true;

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(update, adjustedSpeed());
    draw();
}

function handleDirection(newDir) {
    if (!gameRunning) return;

    // The effective direction that will be used on the next tick
    // (either the currently committed direction, or the already-pending one)
    const effectiveDir = pendingDirection || direction;

    // Only accept the new direction if it's NOT a 180° reversal
    if (newDir.x !== -effectiveDir.x || newDir.y !== -effectiveDir.y) {
        pendingDirection = newDir;
    }
}

// --- Keyboard controls (on document so it always works) ---
document.addEventListener('keydown', (event) => {
    let newDir = null;
    if (event.key === 'ArrowUp')    newDir = {x: 0, y: -1};
    if (event.key === 'ArrowDown')  newDir = {x: 0, y: 1};
    if (event.key === 'ArrowLeft')  newDir = {x: -1, y: 0};
    if (event.key === 'ArrowRight') newDir = {x: 1, y: 0};

    if (newDir) {
        handleDirection(newDir);
        event.preventDefault(); // Prevent page scrolling
    }
});

// --- Touch / swipe support ---
let touchStartX = 0;
let touchStartY = 0;

gameArea.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: true });

gameArea.addEventListener('touchend', (e) => {
    if (touchStartX === 0 && touchStartY === 0) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Require a minimum swipe distance of 20px
    const minSwipe = 20;
    if (absDx < minSwipe && absDy < minSwipe) return;

    let newDir;
    if (absDx > absDy) {
        // Horizontal swipe
        newDir = dx > 0 ? {x: 1, y: 0} : {x: -1, y: 0};
    } else {
        // Vertical swipe
        newDir = dy > 0 ? {x: 0, y: 1} : {x: 0, y: -1};
    }
    handleDirection(newDir);
    e.preventDefault();
}, { passive: false });

gameArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// --- Mobile button controls ---
document.querySelectorAll('#mobileControls button').forEach(btn => {
    btn.addEventListener('click', () => {
        const dir = btn.dataset.dir;
        let newDir = null;
        if (dir === 'up')    newDir = {x: 0, y: -1};
        if (dir === 'down')  newDir = {x: 0, y: 1};
        if (dir === 'left')  newDir = {x: -1, y: 0};
        if (dir === 'right') newDir = {x: 1, y: 0};
        if (newDir) handleDirection(newDir);
    });
});

// Focus the game area when clicking/tapping on it
gameArea.addEventListener('click', () => {
    gameArea.focus();
});

// Difficulty change handler
document.getElementById('difficulty').addEventListener('change', function() {
    selectedDifficulty = this.value;
    currentLevel = difficulties.findIndex(d => d.name === this.value);
    initGame();
});

// Wait for window to fully load so offset sizes are correct
window.addEventListener('load', () => {
    gameArea.focus();
    initGame();
});