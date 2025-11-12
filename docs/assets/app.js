/* =========================
   Simple two-screen router
========================= */
const screens = document.querySelectorAll('.screen');
function show(route){
  screens.forEach(s => s.classList.toggle('hidden', s.dataset.route !== route));
  if (location.hash !== '#' + route) history.replaceState(null, '', '#' + route);
}
window.addEventListener('hashchange', () => show((location.hash || '#landing').slice(1)));
show((location.hash || '#landing').slice(1));

/* =========================
   Elements
========================= */
const boardEl     = document.getElementById('board');
const cells       = Array.from(boardEl.querySelectorAll('.cell'));
const statusEl    = document.querySelector('.status');
const whoEl       = document.getElementById('who');
const scoreXEl    = document.getElementById('scoreX');
const scoreOEl    = document.getElementById('scoreO');
const scoreDEl    = document.getElementById('scoreD');

const startBtn    = document.getElementById('startBtn');
const newRoundBtn = document.getElementById('newRoundBtn');
const landingBtn  = document.getElementById('landingBtn');

const colorXInput = document.getElementById('colorX');
const colorOInput = document.getElementById('colorO');

/* AI controls */
const vsAiInput   = document.getElementById('vsAi');
const aiOptsBox   = document.getElementById('aiOpts');
const aiLevelSel  = document.getElementById('aiLevel');
const sideRadios  = () => document.querySelector('input[name="side"]:checked');
if (vsAiInput && aiOptsBox){
  aiOptsBox.style.display = 'none';
  vsAiInput.addEventListener('change', () => {
    aiOptsBox.style.display = vsAiInput.checked ? 'grid' : 'none';
  });
}

/* =========================
   Game state
========================= */
let board, current, scores, colors;
let mode = 'pvp';        // 'pvp' or 'ai'
let aiPlays = 'O';       // 'X' or 'O'
let difficulty = 'medium';
let aiThinking = false;

const wins = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

/* Apply theme colours */
function applyThemeFromColors(){
  document.documentElement.style.setProperty('--x', colors.X);
  document.documentElement.style.setProperty('--o', colors.O);
}

/* =========================
   Sound effect (win)
========================= */
// Keep your clap/cheer at assets/sounds/win.mp3
const winAudio = new Audio('assets/sounds/win.mp3');
winAudio.preload = 'auto';
winAudio.volume = 0.9;
function playWinSound() {
  try { winAudio.currentTime = 0; winAudio.play(); } catch(e){ console.debug(e); }
}
function unlockAudio() {
  const wasMuted = winAudio.muted;
  winAudio.muted = true;
  winAudio.play().then(() => {
    winAudio.pause(); winAudio.currentTime = 0; winAudio.muted = wasMuted;
  }).catch(()=>{});
}

/* =========================
   Helpers
========================= */
function availableMoves(b){ return b.map((v,i)=>v?null:i).filter(i=>i!==null); }
function getOpponent(p){ return p === 'X' ? 'O' : 'X'; }
function checkWinnerRaw(b){
  for (const line of wins){
    const [a,bb,c] = line;
    if (b[a] && b[a]===b[bb] && b[a]===b[c]) return { player: b[a], line };
  }
  if (b.every(Boolean)) return { player:null, draw:true };
  return null;
}

/* True depth-aware minimax (unbeatable) */
function minimaxSolve(b, depth, isAiTurn, aiMark) {
  const result = checkWinnerRaw(b);
  if (result) {
    if (result.player === aiMark) return { score: 10 - depth, move: null };
    if (result.player === getOpponent(aiMark)) return { score: depth - 10, move: null };
    return { score: 0, move: null }; // draw
  }
  const moves = availableMoves(b);
  let best = { score: isAiTurn ? -Infinity : Infinity, move: moves[0] };
  for (const m of moves) {
    b[m] = isAiTurn ? aiMark : getOpponent(aiMark);
    const child = minimaxSolve(b, depth + 1, !isAiTurn, aiMark);
    b[m] = null;
    if (isAiTurn) {
      if (child.score > best.score) best = { score: child.score, move: m };
    } else {
      if (child.score < best.score) best = { score: child.score, move: m };
    }
  }
  return best;
}

/* AI move by difficulty */
function pickAIMove() {
  const moves = availableMoves(board);
  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  if (difficulty === 'medium') {
    if (Math.random() < 0.6) return minimaxSolve([...board], 0, true, aiPlays).move;
    return moves[Math.floor(Math.random() * moves.length)];
  }
  return minimaxSolve([...board], 0, true, aiPlays).move; // impossible
}

function setBoardDisabled(disabled) {
  cells.forEach(c => c.disabled = disabled || !!board[+c.dataset.idx]);
}

/* =========================
   Core game
========================= */
function resetMatch(keepScores=false){
  board = Array(9).fill(null);
  current = 'X';
  cells.forEach(c => {
    c.disabled=false;
    c.textContent='';
    c.style.removeProperty('color');
    c.classList.remove('winner');
  });
  statusEl.innerHTML = `Player <span id="who">X</span>’s turn`;
  if (!keepScores){
    scores = { X:0, O:0, D:0 };
    scoreXEl.textContent = scoreOEl.textContent = scoreDEl.textContent = '0';
  }
}

function winnerLine(line, colour){
  line.forEach(i=>{
    const el = cells[i];
    el.classList.add('winner');
    el.style.color = colour;
  });
}

function finishIfTerminal(){
  const res = checkWinnerRaw(board);
  if (!res) return false;

  if (res.player){
    const colour = res.player === 'X' ? colors.X : colors.O;
    cells.forEach(c=>c.disabled=true);
    wins.forEach(w => {
      if (w.every(idx => board[idx] === res.player)){
        winnerLine(w, colour);
      }
    });
    scores[res.player] += 1;
    scoreXEl.textContent = scores.X;
    scoreOEl.textContent = scores.O;
    statusEl.textContent = `Player ${res.player} wins! 🎉`;
    playWinSound();
    launchConfetti(colour);
    return true;
  }
  if (res.draw){
    scores.D += 1;
    scoreDEl.textContent = scores.D;
    statusEl.textContent = `It’s a draw.`;
    return true;
  }
  return false;
}

function makeMove(idx){
  if (board[idx]) return false;
  board[idx] = current;
  const el = cells[idx];
  el.textContent = current;
  el.style.color = current === 'X' ? colors.X : colors.O;

  if (finishIfTerminal()) return true;

  current = current === 'X' ? 'O' : 'X';
  statusEl.innerHTML = `Player <span id="who">${current}</span>’s turn`;
  return false;
}

function maybeAIMove(){
  if (mode !== 'ai') return;
  if (current !== aiPlays) return;
  if (aiThinking) return;

  aiThinking = true;
  setBoardDisabled(true);

  setTimeout(() => {
    const move = pickAIMove();
    if (move != null) makeMove(move);
    aiThinking = false;
    setBoardDisabled(false);
  }, 250);
}

/* UI handlers */
function handleCellClick(e){
  const idx = +e.currentTarget.dataset.idx;
  if (board[idx]) return;
  const ended = makeMove(idx);
  if (!ended) maybeAIMove();
}
cells.forEach(btn => btn.addEventListener('click', handleCellClick));

/* =========================
   Buttons
========================= */
startBtn.addEventListener('click', () => {
  unlockAudio(); // enable audio after first gesture

  colors = {
    X: colorXInput.value || '#8ecae6',
    O: colorOInput.value || '#f7cad0'
  };
  applyThemeFromColors();

  mode = (vsAiInput && vsAiInput.checked) ? 'ai' : 'pvp';
  if (aiLevelSel) difficulty = aiLevelSel.value;
  const side = sideRadios() ? sideRadios().value : 'X';
  aiPlays = (mode === 'ai') ? (side === 'X' ? 'O' : 'X') : 'O';

  resetMatch(false);
  show('game');

  if (mode === 'ai' && aiPlays === 'X' && current === 'X'){
    maybeAIMove();
  }
});

newRoundBtn.addEventListener('click', () => {
  resetMatch(true);
  if (mode === 'ai' && aiPlays === 'X' && current === 'X'){
    maybeAIMove();
  }
});

landingBtn.addEventListener('click', () => {
  resetMatch(false);
  show('landing');
});

/* =========================
   Initial game board
========================= */
colors = {
  X: getComputedStyle(document.documentElement).getPropertyValue('--x').trim() || '#8ecae6',
  O: getComputedStyle(document.documentElement).getPropertyValue('--o').trim() || '#f7cad0'
};
applyThemeFromColors();
resetMatch(false);
