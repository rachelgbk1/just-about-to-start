// ================================
// STORAGE
// ================================
var STORAGE_KEY = 'almost_notes_v1';
var USER_KEY = 'almost_user_v1';
var ACCOUNTS_KEY = 'almost_accounts_v1';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveAccounts(a) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
}

// ================================
// RANDOM USERNAME (colour + plant + animal)
// ================================
var COLOURS = ['crimson','amber','indigo','sage','peach','olive','plum','teal','rose','mint','copper','slate'];
var PLANTS  = ['fern','willow','poppy','cactus','clover','lotus','maple','ivy','thistle','daisy','moss','cedar'];
var ANIMALS = ['otter','fox','heron','badger','newt','lynx','mole','hare','crane','wolf','toad','owl'];

function makeUsername() {
  var parts = [
    COLOURS[Math.floor(Math.random()*COLOURS.length)],
    PLANTS[Math.floor(Math.random()*PLANTS.length)],
    ANIMALS[Math.floor(Math.random()*ANIMALS.length)]
  ];
  for (var i = parts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = parts[i]; parts[i] = parts[j]; parts[j] = t;
  }
  return parts.join('-');
}
function getUser() {
  return localStorage.getItem(USER_KEY);
}

// ================================
// AUTH
// ================================
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

async function hashPassword(pw) {
  var buf = new TextEncoder().encode(pw);
  var digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

// Migrate old format { email: "username" } -> { email: { username, passwordHash } }
function migrateAccounts() {
  var a = loadAccounts();
  var changed = false;
  Object.keys(a).forEach(function(k){
    if (typeof a[k] === 'string') { a[k] = { username: a[k], passwordHash: null }; changed = true; }
  });
  if (changed) saveAccounts(a);
}

async function doSignup() {
  var id = (document.getElementById('auth-id').value || '').trim().toLowerCase();
  var pw = document.getElementById('auth-password').value || '';
  var msg = document.getElementById('auth-msg');
  if (!validEmail(id)) { msg.textContent = '// signup needs a valid email'; return; }
  if (pw.length < 6) { msg.textContent = '// password must be at least 6 characters'; return; }
  var accounts = loadAccounts();
  if (accounts[id]) { msg.textContent = '// account exists _ try log in'; return; }
  var username = makeUsername();
  var used = Object.keys(accounts).map(function(k){ return accounts[k].username; });
  var tries = 0;
  while (used.indexOf(username) !== -1 && tries < 20) { username = makeUsername(); tries++; }
  accounts[id] = { username: username, passwordHash: await hashPassword(pw) };
  saveAccounts(accounts);
  localStorage.setItem(USER_KEY, username);
  msg.textContent = '// account created _ your alias is ' + username;
  setTimeout(function(){ enterApp(); }, 800);
}

async function doLogin() {
  var id = (document.getElementById('auth-id').value || '').trim().toLowerCase();
  var pw = document.getElementById('auth-password').value || '';
  var msg = document.getElementById('auth-msg');
  if (!id || !pw) { msg.textContent = '// enter email/username and password'; return; }
  var accounts = loadAccounts();
  var entry = accounts[id];
  if (!entry) {
    // try lookup by username
    var match = Object.keys(accounts).find(function(k){ return accounts[k].username === id; });
    if (match) entry = accounts[match];
  }
  if (!entry) { msg.textContent = '// no account _ hit create account'; return; }
  var hash = await hashPassword(pw);
  if (entry.passwordHash && entry.passwordHash !== hash) {
    msg.textContent = '// wrong password'; return;
  }
  localStorage.setItem(USER_KEY, entry.username);
  enterApp();
}

function signOut() {
  localStorage.removeItem(USER_KEY);
  showAuth();
}

function showAuth() {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('pg-auth').classList.add('active');
  document.getElementById('nav-links').style.display = 'none';
}

function enterApp() {
  document.getElementById('nav-links').style.display = 'flex';
  var me = getUser();
  var lbl = document.getElementById('me-label');
  if (lbl) lbl.textContent = me;
  var nav = document.getElementById('nav-me');
  if (nav) nav.textContent = '☉ ' + me + ' _ sign out';
  go('home');
}

// ================================
// PAGE SWITCH
// ================================
function go(id) {
  if (!getUser()) { showAuth(); return; }
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.getElementById('pg-' + id).classList.add('active');
  if (id === 'hall' || id === 'graveyard' || id === 'completed') renderBoards();
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

  var done   = notes.filter(function(n){ return n.completed; });
  var dead   = notes.filter(function(n){ return n.expired && !n.completed; });
  var active = notes.filter(function(n){ return !n.expired && !n.completed; });

  var mine = active.filter(function(n){ return n.user === me; });
  var others = active.filter(function(n){ return n.user !== me; });

  var boardMine = document.getElementById('board-mine');
  var boardOthers = document.getElementById('board-others');
  var grave = document.getElementById('graveyard-board');
  var completedBoard = document.getElementById('completed-board');

  if (boardMine) {
    boardMine.innerHTML = '';
    if (mine.length === 0) {
      boardMine.innerHTML = '<p class="muted" style="grid-column:1/-1;">// nothing here yet _ add one from the home screen</p>';
    } else {
      mine.forEach(function(n, i){ boardMine.appendChild(buildNote(n, i, false, me)); });
    }
  }
  if (boardOthers) {
    boardOthers.innerHTML = '';
    others.forEach(function(n, i){ boardOthers.appendChild(buildNote(n, i, false, me)); });
  }
  var hc = document.getElementById('hall-count');
  if (hc) hc.textContent = active.length + (active.length === 1 ? ' entry' : ' entries');

  if (grave) {
    grave.innerHTML = '';
    dead.forEach(function(n, i){ grave.appendChild(buildNote(n, i, true, me)); });
    var gc = document.getElementById('grave-count');
    if (gc) gc.textContent = dead.length + ' buried';
  }

  if (completedBoard) {
    completedBoard.innerHTML = '';
    if (done.length === 0) {
      completedBoard.innerHTML = '<p class="muted" style="grid-column:1/-1;">// no completed tasks yet _ go finish something</p>';
    } else {
      done.forEach(function(n, i){ completedBoard.appendChild(buildNote(n, i, false, me)); });
    }
    var dc = document.getElementById('done-count');
    if (dc) dc.textContent = done.length + ' done';
  }
}

// ================================
// SEED FAKE NOTES FROM OTHER USERS
// ================================
var SEED_KEY = 'almost_seeded_v1';
var SAMPLE_THINGS = [
  'replying to that email','starting my dissertation','calling the dentist',
  'going for a run','cleaning my room','learning guitar','journaling',
  'finishing the book','cancelling the subscription','texting back',
  'doing my taxes','asking for a raise','meditating','sorting the laundry'
];
function seedOthers() {
  if (localStorage.getItem(SEED_KEY)) return;
  var notes = loadNotes();
  var n = 8 + Math.floor(Math.random()*4);
  for (var i = 0; i < n; i++) {
    var thing = SAMPLE_THINGS[Math.floor(Math.random()*SAMPLE_THINGS.length)];
    var num = 1 + Math.floor(Math.random()*11);
    var unit = ['days','weeks','months','years'][Math.floor(Math.random()*4)];
    var dNum = 1 + Math.floor(Math.random()*6);
    var dUnit = ['hours','days','weeks'][Math.floor(Math.random()*3)];
    var ms = { hours: 3600000, days: 86400000, weeks: 604800000 }[dUnit];
    notes.push({
      id: 'seed-' + i + '-' + Math.random().toString(36).slice(2,7),
      user: makeUsername(),
      thing: thing, num: num, unit: unit,
      deadlineNum: dNum, deadlineUnit: dUnit,
      deadline: Date.now() + dNum * ms,
      colour: stickyColours[Math.floor(Math.random() * stickyColours.length)],
      completed: false, createdAt: Date.now()
    });
  }
  saveNotes(notes);
  localStorage.setItem(SEED_KEY, '1');
}

function buildNote(n, i, isDead, me) {
  var rotation = rotations[i % rotations.length];
  var note = document.createElement('div');
  note.className = 'sticky' + (isDead ? ' dead' : '') + (n.completed ? ' done' : '');
  var bg = '#BDBDBD';
  if (n.completed) bg = '#86EFAC';
  else if (isDead) bg = '#8A8A8A';
  note.style.background = bg;
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
  migrateAccounts();
  seedOthers();
  checkExpiry();
  if (getUser()) {
    enterApp();
  } else {
    showAuth();
  }
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
