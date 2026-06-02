// ================================
// SWITCH BETWEEN PAGES
// ================================
function go(id) {
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });
  document.getElementById('pg-' + id).classList.add('active');
}

// ================================
// STICKY NOTE SETTINGS
// ================================
var stickyColours = ['#FDE68A', '#FCA5A5', '#86EFAC', '#93C5FD', '#C4B5FD'];
var rotations = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 1.2];
var noteCount = 0;

// ================================
// SCREEN 1 — TRANSLATE BUTTON
// ================================
function doTranslate() {
  var thing = document.getElementById('inp-thing').value;
  var num = document.getElementById('inp-num').value;
  var unit = document.getElementById('inp-unit').value;

  if (thing === '') {
    thing = 'going to the gym';
  }

  addStickyNote(thing, num, unit);
  go('hall');
}

// ================================
// ADD A STICKY NOTE TO THE HALL
// ================================
function addStickyNote(thing, num, unit) {
  noteCount++;

  var colour = stickyColours[Math.floor(Math.random() * stickyColours.length)];
  var rotation = rotations[noteCount % rotations.length];

  var note = document.createElement('div');
  note.className = 'sticky slam';
  note.style.background = colour;
  note.style.setProperty('--rot', rotation + 'deg');
  note.style.transform = 'rotate(' + rotation + 'deg)';

  note.innerHTML =
    '<div class="s-pin"></div>' +
    '<div class="s-no">#' + String(noteCount).padStart(3, '0') + '</div>' +
    '<div class="s-thing">' + thing + '</div>' +
    '<div class="s-time">' + num + ' ' + unit + '</div>';

  note.onclick = function () {
    openModal(thing, num, unit, colour);
  };

  var board = document.getElementById('board');
  board.appendChild(note);

  // shake the board when a note slams in
  board.classList.remove('shake');
  void board.offsetWidth; // restart animation
  board.classList.add('shake');

  // clean up the slam class so hover-scale works again
  setTimeout(function () {
    note.classList.remove('slam');
  }, 500);
}

function openModal(thing, num, unit, colour) {
  alert('I have been avoiding ' + thing + ' for ' + num + ' ' + unit);
}

// ================================
// 5-MINUTE TIMER
// ================================
var TIMER_START = 5 * 60; // seconds
var timerSeconds = TIMER_START;
var timerInterval = null;
var timerRunning = false;

function fmt(s) {
  var m = Math.floor(s / 60);
  var r = s % 60;
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
    clearInterval(timerInterval);
    timerRunning = false;
    btn.textContent = 'resume →';
    status.textContent = '// paused _ take a breath';
    display.classList.remove('running');
    return;
  }

  if (timerSeconds === 0) {
    resetTimer();
  }

  timerRunning = true;
  btn.textContent = 'pause';
  status.textContent = "// you're doing it. that's the whole point.";
  display.classList.add('running');
  display.classList.remove('done');

  timerInterval = setInterval(function () {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      display.classList.remove('running');
      display.classList.add('done');
      btn.textContent = 'start →';
      status.textContent = '// five minutes done _ you actually started';
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = TIMER_START;
  updateTimerDisplay();
  document.getElementById('timer-toggle').textContent = 'start →';
  document.getElementById('timer-status').textContent = "// click start when you're ready";
  var display = document.getElementById('timer-display');
  display.classList.remove('running');
  display.classList.remove('done');
}
