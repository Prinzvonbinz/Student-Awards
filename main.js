// --- Globale Variablen ---
let hostData = null;
let currentCode = null;
let voteSubmitted = false;

// --- Hilfsfunktionen ---
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for(let i=0; i<5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function saveHostData() {
  if (!hostData || !hostData.code) return;
  localStorage.setItem('student_awards_host_' + hostData.code, JSON.stringify(hostData));
}

function loadHostData(code) {
  const data = localStorage.getItem('student_awards_host_' + code);
  if (!data) return null;
  return JSON.parse(data);
}

function isDeadlinePassed(deadline) {
  if (!deadline) return false;
  const now = new Date();
  const end = new Date(deadline);
  return now >= end;
}

function getCodeFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code')?.toUpperCase() || null;
}

// --- Host Setup ---
document.getElementById('hostSetupForm').addEventListener('submit', e => {
  e.preventDefault();

  const year = document.getElementById('year').value.trim();
  const className = document.getElementById('className').value.trim();
  const categoriesRaw = document.getElementById('categories').value.trim();
  const studentsRaw = document.getElementById('students').value.trim();
  const deadline = document.getElementById('endDate').value;

  if (!year || !className || !categoriesRaw || !studentsRaw || !deadline) {
    alert('Bitte alle Felder ausfüllen.');
    return;
  }

  const categories = categoriesRaw.split(',').map(c => c.trim()).filter(c => c.length > 0);
  if (categories.length === 0) {
    alert('Bitte mindestens eine Kategorie angeben.');
    return;
  }

  const studentsLines = studentsRaw.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const students = [];
  for (const line of studentsLines) {
    const parts = line.split(',');
    if(parts.length !== 2) {
      alert(`Ungültiges Format bei Schüler "${line}". Bitte "Name, m" oder "Name, w" eingeben.`);
      return;
    }
    const name = parts[0].trim();
    const gender = parts[1].trim().toLowerCase();
    if(gender !== 'm' && gender !== 'w') {
      alert(`Ungültiges Geschlecht bei Schüler "${name}". Nur "m" oder "w" erlaubt.`);
      return;
    }
    students.push({name, gender});
  }

  const code = generateAccessCode();

  hostData = {
    year,
    className,
    categories,
    students,
    deadline,
    code,
    votes: []
  };

  saveHostData();

  // Link generieren: Gleiche Seite, mit ?code=XYZ
  const baseUrl = window.location.origin + window.location.pathname;
  const participantLink = `${baseUrl}?code=${code}`;

  document.getElementById('generatedLink').value = participantLink;
  document.getElementById('accessCode').textContent = code;
  document.getElementById('hostLinkSection').classList.remove('hidden');
});
  
// --- Teilnehmer Login ---
const participantLoginSection = document.getElementById('participantLoginSection');
const votingSection = document.getElementById('votingSection');
const resultsSection = document.getElementById('resultsSection');
const waitingSection = document.getElementById('waitingSection');

const accessCodeInput = document.getElementById('participantCode');
const participantLinkInput = document.getElementById('participantLink');
const codeSubmitBtn = document.getElementById('participantLoginBtn');
const loginError = document.getElementById('loginError');

codeSubmitBtn.addEventListener('click', () => {
  loginError.textContent = '';
  const code = accessCodeInput.value.trim().toUpperCase();
  if (!code) {
    loginError.textContent = 'Bitte Zugangscode eingeben.';
    return;
  }

  const data = loadHostData(code);
  if (!data) {
    loginError.textContent = 'Ungültiger Zugangscode.';
    return;
  }

  // Speichern global
  currentCode = code;
  hostData = data;

  // Prüfen Deadline
  if(isDeadlinePassed(data.deadline)) {
    showResults();
    participantLoginSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
  } else {
    // Teilnehmer zur Abstimmung führen
    participantLoginSection.classList.add('hidden');
    renderVotingForm();
    votingSection.classList.remove('hidden');
  }
});
// --- Voting Form rendern ---
function renderVotingForm() {
  const container = document.getElementById('votingForm');
  container.innerHTML = `<h2>Student-Awards ${hostData.className} ${hostData.year}</h2>`;

  hostData.categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'vote-category';

    // Kategorie links, dann Eingaben Junge/Mädchen rechts
    div.innerHTML = `
      <h3>${cat}</h3>
      <label>Junge:</label>
      <input type="text" data-cat="${cat}" data-gen="m" placeholder="Name Junge" autocomplete="off" />
      <label>Mädchen:</label>
      <input type="text" data-cat="${cat}" data-gen="w" placeholder="Name Mädchen" autocomplete="off" />
    `;
    container.appendChild(div);
  });

  container.innerHTML += `<button id="submitVotesBtn">Abgeben</button>`;

  // Event für Abstimmungssubmit
  document.getElementById('submitVotesBtn').addEventListener('click', submitVotes);
}

// --- Votes absenden & validieren ---
function submitVotes() {
  const inputs = document.querySelectorAll('#votingForm input');
  const votes = {};

  for (let input of inputs) {
    const cat = input.dataset.cat;
    const gen = input.dataset.gen;
    const name = input.value.trim();

    if (!votes[cat]) votes[cat] = {};

    if (!name) {
      alert('Bitte alle Felder ausfüllen oder "-" eingeben.');
      return;
    }

    // Wenn Name nicht "-", dann prüfen ob Name und Geschlecht passen
    if (name !== '-' && !hostData.students.find(s => s.name === name && s.gender === gen)) {
      alert(`Der Name "${name}" passt nicht zur Kategorie "${cat}" und Geschlecht.`);
      return;
    }

    votes[cat][gen] = name;
  }

  // Stimmen speichern
  hostData.votes.push(votes);
  saveHostData();

  voteSubmitted = true;

  // Dankesnachricht anzeigen
  const container = document.getElementById('votingForm');
  container.innerHTML = '<h2>Danke fürs Abstimmen! 🎉</h2>';

  // Nach Abstimmung in Warteschleife (Countdown bis Deadline)
  votingSection.classList.add('hidden');
  waitingSection.classList.remove('hidden');

  updateCountdown();
}

// --- Countdown bis Ergebnis ---
function updateCountdown() {
  const now = new Date();
  const end = new Date(hostData.deadline);
  const diffMs = end - now;

  if (diffMs <= 0) {
    waitingSection.classList.add('hidden');
    showResults();
    resultsSection.classList.remove('hidden');
    return;
  }

  const diffDays = Math.floor(diffMs / (1000*60*60*24));
  const diffHours = Math.floor((diffMs % (1000*60*60*24)) / (1000*60*60));
  const diffMinutes = Math.floor((diffMs % (1000*60*60)) / (1000*60));
  const diffSeconds = Math.floor((diffMs % (1000*60)) / 1000);

  document.getElementById('resultDateDisplay').textContent = new Date(hostData.deadline).toLocaleDateString();
  document.getElementById('countdownTimer').textContent =
    `${diffDays} Tage ${diffHours}h ${diffMinutes}m ${diffSeconds}s`;

  setTimeout(updateCountdown, 1000);
}
// --- Ergebnisse anzeigen ---
function showResults() {
  const resultsDiv = document.getElementById('resultSection');
  resultsDiv.innerHTML = `<h2>Ergebnisse – Student-Awards ${hostData.className} ${hostData.year}</h2>`;

  // Stimmen zählen: Struktur {Kategorie: {m: {Name: Count}, w: {Name: Count}}}
  const resultsCount = {};
  hostData.categories.forEach(cat => {
    resultsCount[cat] = { male: {}, female: {} };
  });

  hostData.votes.forEach(vote => {
    for (const cat in vote) {
      if (!resultsCount[cat]) continue;
      for (const gen in vote[cat]) {
        const name = vote[cat][gen];
        if (name === '-') continue;
        const genderKey = gen === 'm' ? 'male' : 'female';
        resultsCount[cat][genderKey][name] = (resultsCount[cat][genderKey][name] || 0) + 1;
      }
    }
  });

  // Ergebnisse anzeigen
  for (const cat of hostData.categories) {
    const catDiv = document.createElement('div');
    catDiv.className = 'vote-category';
    catDiv.innerHTML = `<h3>${cat}</h3>`;

    // Jungen-Ergebnisse sortieren und anzeigen
    const maleEntries = Object.entries(resultsCount[cat].male).sort((a,b) => b[1] - a[1]);
    let maleHtml = '<strong>Jungen:</strong><br>';
    if(maleEntries.length === 0) maleHtml += 'Keine Stimmen<br>';
    else maleEntries.forEach(([name, count]) => {
      maleHtml += `${name}: ${count} Stimme${count > 1 ? 'n' : ''}<br>`;
    });

    // Mädchen-Ergebnisse sortieren und anzeigen
    const femaleEntries = Object.entries(resultsCount[cat].female).sort((a,b) => b[1] - a[1]);
    let femaleHtml = '<strong>Mädchen:</strong><br>';
    if(femaleEntries.length === 0) femaleHtml += 'Keine Stimmen<br>';
    else femaleEntries.forEach(([name, count]) => {
      femaleHtml += `${name}: ${count} Stimme${count > 1 ? 'n' : ''}<br>`;
    });

    catDiv.innerHTML += maleHtml + femaleHtml;
    resultsDiv.appendChild(catDiv);
  }

  // Button um zurück zum Login zu gehen (neue Abstimmung oder anderer Code)
  resultsDiv.innerHTML += `<button id="backToLoginBtn">Zurück zum Login</button>`;

  document.getElementById('backToLoginBtn').addEventListener('click', () => {
    resultsSection.classList.add('hidden');
    participantLoginSection.classList.remove('hidden');
    currentCode = null;
    hostData = null;
    voteSubmitted = false;
    document.getElementById('participantCode').value = '';
  });
}

// --- Seite initial laden ---
window.addEventListener('load', () => {
  const codeFromUrl = getCodeFromUrl();
  if (codeFromUrl) {
    // Teilnehmerseite anzeigen
    participantLoginSection.classList.remove('hidden');
  } else {
    // Host Setup anzeigen
    document.getElementById('hostSetupSection').classList.remove('hidden');
  }
});
