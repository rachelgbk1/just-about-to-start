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
  note.className = 'sticky';
  note.style.background = colour;
  note.style.transform = 'rotate(' + rotation + 'deg)';

  note.innerHTML =
    '<div class="s-pin"></div>' +
    '<div class="s-no">#' + String(noteCount).padStart(3, '0') + '</div>' +
    '<div class="s-thing">' + thing + '</div>' +
    '<div class="s-time">' + num + ' ' + unit + '</div>';

  note.onclick = function () {
    openModal(thing, num, unit, colour);
  };

  document.getElementById('board').appendChild(note);
}

// placeholder so clicking a note doesn't crash
function openModal(thing, num, unit, colour) {
  alert('I have been avoiding ' + thing + ' for ' + num + ' ' + unit);
}
