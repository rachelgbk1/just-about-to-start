// ================================
// SUPABASE CLIENT
// ================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ulnulbepagucnhvhfrpq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsbnVsYmVwYWd1Y25odmhmcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODE2NDUsImV4cCI6MjA5NzE1NzY0NX0.WWmwqyVuRTeHsX7cRu73o7Zb21tZj6Inor99o9jKQkk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'almost-auth' }
});

// expose handlers used from inline onclick handlers
window.supabase = supabase;

// ================================
// STATE
// ================================
let currentUser = null;   // auth.user object
let currentUsername = null;
let cachedNotes = [];

// ================================
// RANDOM USERNAME (colour + plant + animal)
// ================================
const COLOURS = ['crimson','amber','indigo','sage','peach','olive','plum','teal','rose','mint','copper','slate'];
const PLANTS  = ['fern','willow','poppy','cactus','clover','lotus','maple','ivy','thistle','daisy','moss','cedar'];
const ANIMALS = ['otter','fox','heron','badger','newt','lynx','mole','hare','crane','wolf','toad','owl'];

function makeUsername() {
  const parts = [
    COLOURS[Math.floor(Math.random()*COLOURS.length)],
    PLANTS[Math.floor(Math.random()*PLANTS.length)],
    ANIMALS[Math.floor(Math.random()*ANIMALS.length)]
  ];
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join('-');
}

// ================================
// AUTH
// ================================
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

async function doSignup() {
  const id = (document.getElementById('auth-id').value || '').trim().toLowerCase();
  const pw = document.getElementById('auth-password').value || '';
  const msg = document.getElementById('auth-msg');
  if (!validEmail(id)) { msg.textContent = '// signup needs a valid email'; return; }
  if (pw.length < 6) { msg.textContent = '// password must be at least 6 characters'; return; }

  const username = makeUsername();
  msg.textContent = '// creating account…';
  const { data, error } = await supabase.auth.signUp({
    email: id,
    password: pw,
    options: {
      data: { username },
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  });
  if (error) { msg.textContent = '// ' + error.message; return; }
  msg.textContent = '// account created _ your alias is ' + username;
  // if session is returned immediately, enter app
  if (data.session) {
    await onAuthReady();
  } else {
    // try sign-in (auto-confirm should be on)
    const { error: e2 } = await supabase.auth.signInWithPassword({ email: id, password: pw });
    if (!e2) await onAuthReady();
  }
}

async function doLogin() {
  const id = (document.getElementById('auth-id').value || '').trim().toLowerCase();
  const pw = document.getElementById('auth-password').value || '';
  const msg = document.getElementById('auth-msg');
  if (!id || !pw) { msg.textContent = '// enter email and password'; return; }
  if (!validEmail(id)) { msg.textContent = '// log in with your email'; return; }
  msg.textContent = '// logging in…';
  const { error } = await supabase.auth.signInWithPassword({ email: id, password: pw });
  if (error) { msg.textContent = '// ' + error.message; return; }
  await onAuthReady();
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  currentUsername = null;
  cachedNotes = [];
  showAuth();
}

function showAuth() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('pg-auth').classList.add('active');
  document.getElementById('nav-links').style.display = 'none';
}

async function onAuthReady() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { showAuth(); return; }
  currentUser = user;
  // fetch username from profiles
  const { data: profile } = await supabase
    .from('profiles').select('username').eq('user_id', user.id).maybeSingle();
  currentUsername = profile?.username || user.user_metadata?.username || 'unknown';
  document.getElementById('nav-links').style.display = 'flex';
  const lbl = document.getElementById('me-label');
  if (lbl) lbl.textContent = currentUsername;
  const nav = document.getElementById('nav-me');
  if (nav) nav.textContent = '☉ ' + currentUsername + ' _ sign out';
  go('home');
}

// ================================
// PAGE SWITCH
// ================================
async function go(id) {
  if (!currentUser) { showAuth(); return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('pg-' + id).classList.add('active');
  if (id === 'hall' || id === 'graveyard' || id === 'completed') {
    await fetchNotes();
    renderBoards();
  }
}

// ================================
// STICKY SETTINGS
// ================================
const stickyColours = ['#FDE68A','#FCA5A5','#86EFAC','#93C5FD','#C4B5FD','#EF4444','#3B82F6','#EAB308','#F97316','#EC4899','#14B8A6','#8B5CF6','#F43F5E','#06B6D4','#84CC16'];
const rotations = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 1.2];

// ================================
// CREATE NOTE
// ================================
async function doTranslate() {
  if (!currentUser) { showAuth(); return; }
  const thing = document.getElementById('inp-thing').value || 'going to the gym';
  const num = parseInt(document.getElementById('inp-num').value, 10) || 1;
  const unit = document.getElementById('inp-unit').value;
  const dNum = parseInt(document.getElementById('inp-deadline-num').value, 10) || 1;
  const dUnit = document.getElementById('inp-deadline-unit').value;
  const ms = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 604800000 }[dUnit];
  const deadline = new Date(Date.now() + dNum * ms).toISOString();
  const colour = stickyColours[Math.floor(Math.random() * stickyColours.length)];

  const { error } = await supabase.from('notes').insert({
    user_id: currentUser.id,
    username: currentUsername,
    thing, num, unit,
    deadline_num: dNum,
    deadline_unit: dUnit,
    deadline,
    colour,
    completed: false
  });
  if (error) { alert('Could not save: ' + error.message); return; }
  go('hall');
}

// ================================
// FETCH NOTES
// ================================
async function fetchNotes() {
  const { data, error } = await supabase
    .from('notes').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); cachedNotes = []; return; }
  cachedNotes = (data || []).map(n => ({
    id: n.id,
    user_id: n.user_id,
    user: n.username,
    thing: n.thing,
    num: n.num,
    unit: n.unit,
    deadlineNum: n.deadline_num,
    deadlineUnit: n.deadline_unit,
    deadline: new Date(n.deadline).getTime(),
    colour: n.colour,
    completed: n.completed,
    completedAt: n.completed_at ? new Date(n.completed_at).getTime() : null,
    createdAt: new Date(n.created_at).getTime()
  }));
}

// ================================
// FORMAT TIME LEFT
// ================================
function timeLeft(ms) {
  if (ms <= 0) return 'time up';
  const s = Math.floor(ms/1000);
  if (s < 60) return s + 's left';
  const m = Math.floor(s/60);
  if (m < 60) return m + 'm left';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h left';
  return Math.floor(h/24) + 'd left';
}

// ================================
// RENDER BOARDS
// ================================
function renderBoards() {
  const now = Date.now();
  const meId = currentUser?.id;

  const done   = cachedNotes.filter(n => n.completed);
  const dead   = cachedNotes.filter(n => !n.completed && n.deadline && now > n.deadline);
  const active = cachedNotes.filter(n => !n.completed && (!n.deadline || now <= n.deadline));

  const mine = active.filter(n => n.user_id === meId);
  const others = active.filter(n => n.user_id !== meId);

  const boardMine = document.getElementById('board-mine');
  const boardOthers = document.getElementById('board-others');
  const grave = document.getElementById('graveyard-board');
  const completedBoard = document.getElementById('completed-board');

  if (boardMine) {
    boardMine.innerHTML = '';
    if (mine.length === 0) {
      boardMine.innerHTML = '<p class="muted" style="grid-column:1/-1;">// nothing here yet _ add one from the home screen</p>';
    } else {
      mine.forEach((n, i) => boardMine.appendChild(buildNote(n, i, false, meId)));
    }
  }
  if (boardOthers) {
    boardOthers.innerHTML = '';
    if (others.length === 0) {
      boardOthers.innerHTML = '<p class="muted" style="grid-column:1/-1;">// no one else has posted yet _ invite a friend</p>';
    } else {
      others.forEach((n, i) => boardOthers.appendChild(buildNote(n, i, false, meId)));
    }
  }
  const hc = document.getElementById('hall-count');
  if (hc) hc.textContent = active.length + (active.length === 1 ? ' entry' : ' entries');

  if (grave) {
    grave.innerHTML = '';
    dead.forEach((n, i) => grave.appendChild(buildNote(n, i, true, meId)));
    const gc = document.getElementById('grave-count');
    if (gc) gc.textContent = dead.length + ' buried';
  }

  if (completedBoard) {
    completedBoard.innerHTML = '';
    if (done.length === 0) {
      completedBoard.innerHTML = '<p class="muted" style="grid-column:1/-1;">// no completed tasks yet _ go finish something</p>';
    } else {
      done.forEach((n, i) => completedBoard.appendChild(buildNote(n, i, false, meId)));
    }
    const dc = document.getElementById('done-count');
    if (dc) dc.textContent = done.length + ' done';
  }
}

function buildNote(n, i, isDead, meId) {
  const rotation = rotations[i % rotations.length];
  const note = document.createElement('div');
  note.className = 'sticky' + (isDead ? ' dead' : '') + (n.completed ? ' done' : '');
  let bg = n.colour || stickyColours[Math.floor(Math.random() * stickyColours.length)];
  if (n.completed) bg = '#86EFAC';
  else if (isDead) bg = '#8A8A8A';
  note.style.background = bg;
  note.style.setProperty('--rot', rotation + 'deg');
  note.style.transform = 'rotate(' + rotation + 'deg)';

  const left = isDead ? 'expired' : timeLeft(n.deadline - Date.now());
  const mine = n.user_id === meId;

  note.innerHTML =
    '<div class="s-pin"></div>' +
    '<div class="s-no">' + (mine ? '★ ' : '') + escapeHtml(n.user) + '</div>' +
    '<div class="s-thing">' + escapeHtml(n.thing) + '</div>' +
    '<div class="s-time">avoided ' + n.num + ' ' + n.unit + '</div>' +
    '<div class="s-time">' + left + '</div>' +
    (mine && !isDead && !n.completed
      ? '<button class="s-done">mark done</button>'
      : (n.completed ? '<div class="s-time">✓ completed</div>' : ''));

  if (mine && !isDead && !n.completed) {
    note.querySelector('.s-done').onclick = (e) => {
      e.stopPropagation();
      markDone(n.id);
    };
  }
  return note;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}

async function markDone(id) {
  const { error } = await supabase.from('notes')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { alert('Could not update: ' + error.message); return; }
  await fetchNotes();
  renderBoards();
}

// ================================
// TIMER
// ================================
const TIMER_START = 5 * 60;
let timerSeconds = TIMER_START;
let timerInterval = null;
let timerRunning = false;

function fmt(s) {
  const m = Math.floor(s/60), r = s%60;
  return m + ':' + (r < 10 ? '0' + r : r);
}
function updateTimerDisplay() {
  document.getElementById('timer-display').textContent = fmt(timerSeconds);
}
function toggleTimer() {
  const btn = document.getElementById('timer-toggle');
  const display = document.getElementById('timer-display');
  const status = document.getElementById('timer-status');
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
  timerInterval = setInterval(() => {
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
  const display = document.getElementById('timer-display');
  display.classList.remove('running'); display.classList.remove('done');
}

// ================================
// SETTINGS MENU
// ================================
const THEME_KEY = 'almost_theme_v1';

function applyTheme(t) {
  if (t === 'dark') document.body.classList.add('theme-dark');
  else document.body.classList.remove('theme-dark');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? 'light' : 'dark';
}
function toggleTheme() {
  const cur = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
function toggleSettings(e) {
  if (e) e.stopPropagation();
  const m = document.getElementById('settings-menu');
  m.classList.toggle('open');
}
document.addEventListener('click', (e) => {
  const m = document.getElementById('settings-menu');
  const dots = document.getElementById('nav-settings');
  if (!m || !m.classList.contains('open')) return;
  if (m.contains(e.target) || (dots && dots.contains(e.target))) return;
  m.classList.remove('open');
});

async function changeEmail() {
  const msg = document.getElementById('set-msg');
  const newEmail = (document.getElementById('set-email').value || '').trim().toLowerCase();
  if (!validEmail(newEmail)) { msg.textContent = '// enter a valid email'; return; }
  msg.textContent = '// updating…';
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) { msg.textContent = '// ' + error.message; return; }
  document.getElementById('set-email').value = '';
  document.getElementById('set-email-pw').value = '';
  msg.textContent = '// check your new email to confirm the change';
}

async function changePassword() {
  const msg = document.getElementById('set-msg');
  const newPw = document.getElementById('set-pw-new').value || '';
  if (newPw.length < 6) { msg.textContent = '// new password must be 6+ chars'; return; }
  msg.textContent = '// updating…';
  const { error } = await supabase.auth.updateUser({ password: newPw });
  if (error) { msg.textContent = '// ' + error.message; return; }
  document.getElementById('set-pw-old').value = '';
  document.getElementById('set-pw-new').value = '';
  msg.textContent = '// password updated';
}

// ================================
// INIT
// ================================
applyTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');

// expose to inline handlers
Object.assign(window, {
  go, doLogin, doSignup, signOut, doTranslate,
  toggleTimer, resetTimer, toggleTheme, toggleSettings,
  changeEmail, changePassword
});

(async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await onAuthReady();
  } else {
    showAuth();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') showAuth();
  });

  // periodically refresh the boards if visible
  setInterval(async () => {
    const hall = document.getElementById('pg-hall');
    const grave = document.getElementById('pg-graveyard');
    const completed = document.getElementById('pg-completed');
    if (currentUser && (
      (hall && hall.classList.contains('active')) ||
      (grave && grave.classList.contains('active')) ||
      (completed && completed.classList.contains('active'))
    )) {
      await fetchNotes();
      renderBoards();
    }
  }, 15000);
})();
