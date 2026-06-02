// ================================
// STORAGE
// ================================
var STORAGE_KEY = 'almost_notes_v1';
var USER_KEY = 'almost_user_v1';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ================================
// RANDOM USERNAME (colour + plant + animal)
// ================================
var COLOURS = ['crimson','amber','indigo','sage','peach','olive','plum','teal','rose','mint','copper','slate'];
var PLANTS  = ['fern','willow','poppy','cactus','clover','lotus','maple','ivy','thistle','daisy','moss','cedar'];
var ANIMALS = ['otter','fox','heron','badger','newt','lynx','mole','hare','crane','wolf','toad','owl'];

function makeUsername() {
  var c = COLOURS[Math.floor(Math.random()*COLOURS.length)];
  var p = PLANTS[Math.floor(Math.random()*PLANTS.length)];
  var a = ANIMALS[Math.floor(Math.random()*ANIMALS.length)];
  return c + '-' + p + '-' + a;
}
function getUser() {
  var u = localStorage.getItem(USER_KEY);
  if (!u) { u = makeUsername(); localStorage.setItem(USER_KEY, u); }
  return u;
}

// ================================
// PAGE SWITCH
// ================================
function go(id) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('pg-' + id).classList.add('active');
  if (id === 'hall' || id === 'graveyard') renderBoards();
}

// ================================
// STICKY SETTINGS
// ================================
var stickyColours = ['#FDE68A', '#FCA5A5', '#86EFAC', '#93C5FD', '#C4B5FD'];
var rotations = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 1.2];

// ================================
// TRANSLATE / CREATE NOTE
// ================================
function doTranslate() {
  var thing = document.getElementById('inp-thing').value || 'going to the gym';
  var num = document.getElementById('inp-num').value;
  var unit = document.getElementById('inp-unit').value;
  var dNum = parseInt(document.getElementById('inp-deadline-num').value, 10) || 1;
  var dUnit = document.getElementById('inp-deadline-unit').value;

  var ms = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 }[dUnit];
  var deadline = Date.now() + dNum * ms;

  var notes = loadNotes();
  notes.push({
    id: Date.now() + '-' + Math.random().toString(36).slice(2,7),
    user: getUser(),
    thing: thing,
    num: num,
    unit: unit,
    deadlineNum: dNum,
    deadlineUnit: dUnit,
    deadline: deadline,
    colour: stickyColours[Math.floor(Math.random() * stickyColours.length)],
    completed: false,
    createdAt: Date.now()
  });
  saveNotes(notes);
  go('hall');
}

// ================================
// EXPIRY CHECK
// ================================
function checkExpiry() {
  var notes = loadNotes();
  var now = Date.now();
  var changed = false;
  notes.forEach(function (n) {
    if (!n.completed && !n.expired && n.deadline && now > n.deadline) {
      n.expired = true;
      changed = true;
    }
  });
  if (changed) saveNotes(notes);
}

// ================================
// FORMAT TIME LEFT
// ================================
function timeLeft(ms) {
  if (ms <= 0) return 'time up';
  var s = Math.floor(ms/1000);
  if (s < 60) return s + 's left';
  var m = Math.floor(s/60);
  if (m < 60) return m + 'm left';
  var h = Math.floor(m/60);
  if (h < 24) return h + 'h left';
  return Math.floor(h/24) + 'd left';
}

// ================================
// RENDER BOARDS
// ================================
function renderBoards() {
  checkExpiry();
  var notes = loadNotes();
  var me = getUser();

  var active = notes.filter(function(n){ return !n.expired; });
  var dead   = notes.filter(function(n){ return n.expired; });

  var board = document.getElementById('board');
  var grave = document.getElementById('graveyard-board');
  if (board) {
    board.innerHTML = '';
    active.forEach(function(n, i){ board.appendChild(buildNote(n, i, false, me)); });
    var hc = document.getElementById('hall-count');
    if (hc) hc.textContent = active.length + (active.length === 1 ? ' entry' : ' entries');
  }
  if (grave) {
    grave.innerHTML = '';
    dead.forEach(function(n, i){ grave.appendChild(buildNote(n, i, true, me)); });
    var gc = document.getElementById('grave-count');
    if (gc) gc.textContent = dead.length + ' buried';
  }
}

function buildNote(n, i, isDead, me) {
  var rotation = rotations[i % rotations.length];
  var note = document.createElement('div');
  note.className = 'sticky' + (isDead ? ' dead' : '') + (n.completed ? ' done' : '');
  note.style.background = isDead ? '#BDBDBD' : n.colour;
  note.style.setProperty('--rot', rotation + 'deg');
  note.style.transform = 'rotate(' + rotation + 'deg)';

  var left = isDead ? 'expired' : timeLeft(n.deadline - Date.now());
  var mine = n.user === me;

  note.innerHTML =
    '<div class="s-pin"></div>' +
    '<div class="s-no">' + (mine ? '★ ' : '') + n.user + '</div>' +
    '<div class="s-thing">' + escapeHtml(n.thing) + '</div>' +
    '<div class="s-time">avoided ' + n.num + ' ' + n.unit + '</div>' +
    '<div class="s-time">' + left + '</div>' +
    (mine && !isDead && !n.completed
      ? '<button class="s-done">mark done</button>'
      : (n.completed ? '<div class="s-time">✓ completed</div>' : ''));

  if (mine && !isDead && !n.completed) {
    note.querySelector('.s-done').onclick = function (e) {
      e.stopPropagation();
      markDone(n.id);
    };
  }
  return note;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}

function markDone(id) {
  var notes = loadNotes();
  notes.forEach(function(n){ if (n.id === id) n.completed = true; });
  saveNotes(notes);
  renderBoards();
}

// ================================
// TIMER
// ================================
var TIMER_START = 5 * 60;
var timerSeconds = TIMER_START;
var timerInterval = null;
var timerRunning = false;

function fmt(s) {
  var m = Math.floor(s/60); var r = s%60;
  return m + ':' + (r < 10 ? '0' + r : r);
}
function updateTimerDisplay() {
  document.getElementById('timer-display').textContent = fmt(timerSeconds);
}
function toggleTimer() {
  var btn = document.getElementById('timer-toggle');
  var display = document.getElementById('timer-display');
  var status = document.getElementById('timer-status');
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false;
    btn.textContent = 'resume →';
    status.textContent = '// paused _ take a breath';
    display.classList.remove('running');
    return;
  }
  if (timerSeconds === 0) resetTimer();
  timerRunning = true;
  btn.textContent = 'pause';
  status.textContent = "// you're doing it. that's the whole point.";
  display.classList.add('running'); display.classList.remove('done');
  timerInterval = setInterval(function () {
    timerSeconds--; updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval); timerRunning = false;
      display.classList.remove('running'); display.classList.add('done');
      btn.textContent = 'start →';
      status.textContent = '// five minutes done _ you actually started';
    }
  }, 1000);
}
function resetTimer() {
  clearInterval(timerInterval); timerRunning = false;
  timerSeconds = TIMER_START; updateTimerDisplay();
  document.getElementById('timer-toggle').textContent = 'start →';
  document.getElementById('timer-status').textContent = "// click start when you're ready";
  var display = document.getElementById('timer-display');
  display.classList.remove('running'); display.classList.remove('done');
}

// ================================
// INIT
// ================================
(function init() {
  var me = getUser();
  var lbl = document.getElementById('me-label');
  if (lbl) lbl.textContent = me;
  var nav = document.getElementById('nav-me');
  if (nav) nav.textContent = '☉ ' + me;
  checkExpiry();
  // re-check expiry every 30s
  setInterval(function(){
    checkExpiry();
    var hall = document.getElementById('pg-hall');
    var grave = document.getElementById('pg-graveyard');
    if ((hall && hall.classList.contains('active')) ||
        (grave && grave.classList.contains('active'))) {
      renderBoards();
    }
  }, 30000);
})();
