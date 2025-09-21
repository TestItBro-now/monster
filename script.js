/*
 * Monster Ordering Game
 *
 * This script builds a 17x9 grid of monster tiles extracted from a single sprite sheet.
 * The correct ordering of the monsters is their order in the source image (left to right,
 * top to bottom). When the page loads or the reset button is clicked, the first 151
 * monsters are shuffled randomly and rendered into the grid. The last two grid
 * positions remain empty blanks. Players can rearrange the monsters either by
 * clicking two tiles sequentially (to swap them) or by dragging one tile onto
 * another. When the first 151 monsters match the original ordering, the game
 * congratulates the player and displays the time taken.
 */

const COLS = 17;
const ROWS = 9;
const TILE_WIDTH = 70;
const TILE_HEIGHT = 73;
const ACTUAL_TILES = 151; // number of monsters in the sheet
const TOTAL_TILES = ROWS * COLS; // 153 positions total

// URL to the sprite sheet. When running locally (e.g. via GitHub pages) the
// relative path 'Monsters.jpg' will resolve correctly because the image lives
// in the repository root. For local testing we fall back to the raw GitHub
// version which loads over the network. If the file exists locally this
// constant can be replaced with 'Monsters.jpg'.
const SPRITE_URL = 'https://raw.githubusercontent.com/TestItBro-now/monster/main/Monsters.jpg';

let tileOrder = []; // array holding the ids (or null for blanks) of the current arrangement
let startTime;
let timerInterval;
let draggedElement = null;
let selectedElement = null;

/**
 * Shuffle an array in place using Fisher‑Yates algorithm.
 * @param {Array} array The array to shuffle
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Build the initial tile order and render the grid into the DOM.
 * Randomizes only the first ACTUAL_TILES positions and leaves two blanks at the end.
 */
function initGame() {
  // Stop any existing timer
  if (timerInterval) clearInterval(timerInterval);

  // Initialize the order of the first 151 tile ids (0..150) and shuffle them
  const ids = [];
  for (let i = 0; i < ACTUAL_TILES; i++) ids.push(i);
  shuffle(ids);

  // Create the tileOrder array: 151 shuffled ids followed by two nulls for blanks
  tileOrder = ids.slice();
  tileOrder.push(null);
  tileOrder.push(null);

  // Render the grid
  renderGrid();
  // Highlight any tiles already in the correct position
  updateCorrectTiles();

  // Reset and start the timer
  startTimer();
}

/**
 * Render the current tileOrder into the grid container.
 */
function renderGrid() {
  const container = document.getElementById('grid-container');
  container.innerHTML = '';

  tileOrder.forEach((id, index) => {
    const cell = document.createElement('div');
    cell.dataset.index = index;
    // Determine whether this is a real tile or a blank
    // Add dragover and drop listeners to every cell so tiles can be dropped
    cell.addEventListener('dragover', handleDragOver);
    cell.addEventListener('drop', handleDrop);

    if (id !== null) {
      cell.classList.add('tile');
      cell.dataset.id = id;
      // Apply the sprite sheet as the background image. This allows the game
      // to work both when the image is available locally and when it must be
      // loaded from GitHub directly.
      cell.style.backgroundImage = `url('${SPRITE_URL}')`;
      // Calculate row and column in the sprite sheet based on the id
      const rowIndex = Math.floor(id / COLS);
      const colIndex = id % COLS;
      const x = -colIndex * TILE_WIDTH;
      const y = -rowIndex * TILE_HEIGHT;
      cell.style.backgroundPosition = `${x}px ${y}px`;
      cell.style.backgroundSize = `${COLS * TILE_WIDTH}px ${ROWS * TILE_HEIGHT}px`;
      // Make the tile selectable and draggable
      cell.draggable = true;
      cell.addEventListener('click', handleTileClick);
      cell.addEventListener('dragstart', handleDragStart);
    } else {
      // It's a blank placeholder
      cell.classList.add('blank');
    }
    container.appendChild(cell);
  });
}

/**
 * Start the game timer and update it every second.
 */
function startTimer() {
  startTime = Date.now();
  const timerElem = document.getElementById('timer');
  timerElem.textContent = 'Time: 0s';
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerElem.textContent = `Time: ${elapsed}s`;
  }, 1000);
}

/**
 * Handle click events on tiles. If a tile is selected, clicking another tile swaps them.
 * Clicking the same tile again deselects it.
 */
function handleTileClick(e) {
  const tile = e.currentTarget;
  if (tile.classList.contains('blank')) return; // ignore blanks

  // If no tile is selected yet
  if (!selectedElement) {
    selectedElement = tile;
    tile.classList.add('selected');
  } else if (selectedElement === tile) {
    // Deselect if the same tile is clicked
    tile.classList.remove('selected');
    selectedElement = null;
  } else {
    // Swap selected tile with the one clicked
    swapTiles(selectedElement, tile);
    // Remove selection styling
    selectedElement.classList.remove('selected');
    selectedElement = null;
    // Check if the game is solved after the swap
    checkSolved();
  }
}

/**
 * Handle dragstart event: store the dragged element.
 */
function handleDragStart(e) {
  draggedElement = e.currentTarget;
  // Provide visual hint for dragging. Some browsers require setData to enable drag
  e.dataTransfer.effectAllowed = 'move';
  // setData with dummy data so the drag operation is recognized
  try {
    e.dataTransfer.setData('text/plain', '');
  } catch (err) {
    // ignore potential errors in environments where setData isn't supported
  }
}

/**
 * Allow dropping by preventing default behaviour.
 */
function handleDragOver(e) {
  e.preventDefault();
}

/**
 * On drop, swap the dragged tile with the drop target if they are not the same and not blanks.
 */
function handleDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  if (!draggedElement || draggedElement === target) return;
  swapTiles(draggedElement, target);
  draggedElement = null;
  // After dragging swap, check for solution
  checkSolved();
}

/**
 * Swap two tile elements in the DOM and update the tileOrder array accordingly.
 * @param {HTMLElement} el1 The first tile element
 * @param {HTMLElement} el2 The second tile element
 */
function swapTiles(el1, el2) {
  const parent = el1.parentNode;
  // Determine their positions in the DOM (grid index)
  const index1 = parseInt(el1.dataset.index, 10);
  const index2 = parseInt(el2.dataset.index, 10);
  // Swap positions in the tileOrder array
  [tileOrder[index1], tileOrder[index2]] = [tileOrder[index2], tileOrder[index1]];
  // Swap the actual DOM elements
  if (el1.nextSibling === el2) {
    parent.insertBefore(el2, el1);
  } else if (el2.nextSibling === el1) {
    parent.insertBefore(el1, el2);
  } else {
    const next1 = el1.nextSibling;
    const next2 = el2.nextSibling;
    parent.insertBefore(el1, next2);
    parent.insertBefore(el2, next1);
  }
  // Update the data-index attributes for all children because their order changed
  Array.from(parent.children).forEach((child, idx) => {
    child.dataset.index = idx;
  });

  // Update correct highlights after the swap
  updateCorrectTiles();
}

/**
 * Update the highlighting for tiles that are currently in their correct positions.
 * Applies the 'correct' class to tiles where the tileOrder's id matches its index.
 * This provides visual feedback as the user arranges the monsters.
 */
function updateCorrectTiles() {
  const container = document.getElementById('grid-container');
  // Iterate through each cell in the grid and adjust the 'correct' class
  Array.from(container.children).forEach((child, index) => {
    // Remove existing highlight
    child.classList.remove('correct');
    // Only consider real monster tiles within the first ACTUAL_TILES slots
    if (index < ACTUAL_TILES && tileOrder[index] === index) {
      // Only add highlight if this cell is not a blank placeholder
      if (!child.classList.contains('blank')) {
        child.classList.add('correct');
      }
    }
  });
}
/**
 * Check whether the current arrangement solves the puzzle. If solved, stop the timer and
 * show a congratulatory message.
 */
function checkSolved() {
  // Compare only the first ACTUAL_TILES entries with their sorted order
  for (let i = 0; i < ACTUAL_TILES; i++) {
    if (tileOrder[i] !== i) return false;
  }
  // If we reach here, the puzzle is solved
  clearInterval(timerInterval);
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  setTimeout(() => {
    alert(`Congratulations! You solved the puzzle in ${elapsed} seconds.`);
  }, 100);
  return true;
}

/**
 * Attach event listeners when DOM content is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Hook up the reset button
  document.getElementById('reset').addEventListener('click', () => {
    initGame();
  });
  // Initialize game on page load
  initGame();
});