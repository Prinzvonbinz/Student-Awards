// Gemeinsame Daten-Variable (hostData)
let hostData = null;
let currentCode = null;
let voteSubmitted = false;

// --- Hilfsfunktionen ---

function saveHostData(data) {
  // Speicherung im localStorage unter key "student_awards_HOSTCODE"
  if (!data.code) return;
  localStorage.setItem("student_awards_" + data.code, JSON.stringify(data));
}

function loadHostData(code) {
  let raw = localStorage.getItem("student_awards_" + code);
  if (!raw) return null;
  return JSON.parse(raw);
}

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i=0; i<5; i++) {
    code += chars.charAt(Math.floor(Math.random()*chars.length));
  }
  return code;
}

function parseStudents(text) {
  // Erwartet: je Zeile "Name, m" oder "Name, w"
  let lines = text.split("\n");
  let students = [];
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    let parts = line.split(",");
    if (parts.length !== 2) continue;
    let name = parts[0].trim();
    let gender = parts[1].trim().toLowerCase();
    if (gender !== "m" && gender !== "w") continue;
    students.push({ name, gender });
  }
  return students;
}

function parseCategories(text) {
  // Kommagetrennte Kategorien
  return text.split(",").map(s => s.trim()).filter(s => s.length > 0);
}

// --- INDEX.HTML Funktionen ---

if (document.getElementById("hostSetupForm")) {
  // Host-Seite

  const hostSetupForm = document.getElementById("hostSetupForm");
  const hostLinkSection = document.getElementById("hostLinkSection");
  const generatedLinkInput = document.getElementById("generatedLink");
  const accessCodeSpan = document.getElementById("accessCode");

  hostSetupForm.addEventListener("submit", e => {
    e.preventDefault();

    // Daten aus Formular
    let year = parseInt(document.getElementById("year").value);
    let className = document.getElementById("className").value.trim();
    let categories = parseCategories(document.getElementById("categories").value);
    let students = parseStudents(document.getElementById("students").value);
    let deadline = document.getElementById("endDate").value;

    if (!year || !className || categories.length === 0 || students.length === 0 || !deadline) {
      alert("Bitte alle Felder korrekt ausfüllen!");
      return;
    }

    // Code generieren & prüfen, ob schon belegt
    let code = generateCode();
    while(loadHostData(code)) {
      code = generateCode();
    }

    // hostData aufbauen
    hostData = {
      year,
      className,
      categories,
      students,
      deadline,
      code,
      votes: []
    };

    // Speichern
    saveHostData(hostData);

    // Link generieren (relative URL)
    const baseURL = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    const link = baseURL + "vote.html?code=" + code;

    // Anzeigen
    generatedLinkInput.value = link;
    accessCodeSpan.textContent = code;
    hostLinkSection.classList.remove("hidden");

    alert("Setup erfolgreich! Teile den Link und Code mit deinen Mitschülern.");
  });

  // Teilnehmer Login
  const participantLoginSection = document.getElementById("participantLoginSection");
  const participantCodeInput = document.getElementById("participantCode");
  const participantLoginBtn = document.getElementById("participantLoginBtn");
  const loginError = document.getElementById("loginError");

  participantLoginBtn.addEventListener("click", () => {
    let inputCode = participantCodeInput.value.trim().toUpperCase();
    if (!inputCode) {
      loginError.textContent = "Bitte gib einen Zugangscode ein.";
      return;
    }

    // Prüfen ob der Code existiert
    if (!loadHostData(inputCode)) {
      loginError.textContent = "Ungültiger Zugangscode.";
      return;
    }

    loginError.textContent = "";

    // Weiterleitung zur Abstimmung
    const baseURL = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    window.location.href = baseURL + "vote.html?code=" + inputCode;
  });
}

// --- VOTE.HTML Funktionen ---

if (document.getElementById("votingSection")) {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  currentCode = code;

  if (!code) {
    alert("Kein Zugangscode in der URL gefunden!");
  }

  hostData = loadHostData(code);

  const votingSection = document.getElementById("votingSection");
  const votingForm = document.getElementById("votingForm");
const submitVotesBtn = document.getElementById("submitVotesBtn");
const voteMessage = document.getElementById("voteMessage");
const waitingSection = document.getElementById("waitingSection");
const resultsSection = document.getElementById("resultsSection");
const resultDateDisplay = document.getElementById("resultDateDisplay");
const countdownTimer = document.getElementById("countdownTimer");
const resultSection = document.getElementById("resultSection");

if (!hostData) {
  alert("Ungültiger oder nicht vorhandener Zugangscode.");
} else {
  // Zeige Abstimmungsformular oder Ergebnis basierend auf Datum

  const now = new Date();
  const deadlineDate = new Date(hostData.deadline + "T23:59:59");

  if (now > deadlineDate) {
    // Zeige Ergebnisse
    showResults();
  } else {
    // Zeige Abstimmung
    showVotingForm();
    showCountdown();
  }
}

// Funktionen

function showVotingForm() {
  votingSection.classList.remove("hidden");
  waitingSection.classList.add("hidden");
  resultsSection.classList.add("hidden");

  // Kategorien links, Eingabefelder Junge/Mädchen rechts

  votingForm.innerHTML = ""; // Clear

  // Tabellenkopf
  const table = document.createElement("table");
  table.className = "vote-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Kategorie", "Junge (Name)", "Mädchen (Name)"].forEach(txt => {
    const th = document.createElement("th");
    th.textContent = txt;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  // For jede Kategorie eine Zeile
  hostData.categories.forEach(cat => {
    const tr = document.createElement("tr");

    const tdCat = document.createElement("td");
    tdCat.textContent = cat;
    tr.appendChild(tdCat);

    // Junge Input
    const tdBoy = document.createElement("td");
    const boyInput = document.createElement("input");
    boyInput.type = "text";
    boyInput.placeholder = "Name oder -";
    boyInput.className = "boyInput";
    tdBoy.appendChild(boyInput);
    tr.appendChild(tdBoy);

    // Mädchen Input
    const tdGirl = document.createElement("td");
    const girlInput = document.createElement("input");
    girlInput.type = "text";
    girlInput.placeholder = "Name oder -";
    girlInput.className = "girlInput";
    tdGirl.appendChild(girlInput);
    tr.appendChild(tdGirl);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  votingForm.appendChild(table);
}

// Prüfen ob Name gültig ist (steht in der Schülerliste und stimmt mit Geschlecht überein)
function isValidName(name, gender) {
  if (name === "-") return true;
  return hostData.students.some(s => s.name.toLowerCase() === name.toLowerCase() && s.gender === gender);
}

submitVotesBtn.addEventListener("click", () => {
  voteMessage.textContent = "";

  // Sammle Eingaben pro Kategorie
  const rows = votingForm.querySelectorAll("tbody tr");
  let votesForThisUser = [];

  for (let tr of rows) {
    const cat = tr.children[0].textContent;
    const boyName = tr.querySelector(".boyInput").value.trim();
    const girlName = tr.querySelector(".girlInput").value.trim();

    if (!boyName || !girlName) {
      voteMessage.textContent = "Bitte bei jeder Kategorie beide Namen eingeben (oder '-' für keinen).";
      return;
    }
    if (!isValidName(boyName, "m")) {
      voteMessage.textContent = `Ungültiger Jungenname in Kategorie "${cat}": ${boyName}`;
      return;
    }
    if (!isValidName(girlName, "w")) {
      voteMessage.textContent = `Ungültiger Mädchennamen in Kategorie "${cat}": ${girlName}`;
      return;
    }

    votesForThisUser.push({
      category: cat,
      boy: boyName === "-" ? null : boyName,
      girl: girlName === "-" ? null : girlName
    });
  }

  // Speichern der Stimme:
  // Jede Stimme = {timestamp, votesForThisUser}

  if (!hostData.votes) hostData.votes = [];

  // Einfach: ein Teilnehmer kann mehrfach abstimmen (kein Teilnehmernamenlogin)
  hostData.votes.push({
    timestamp: new Date().toISOString(),
    votes: votesForThisUser
  });

  saveHostData(hostData);

  voteSubmitted = true;
  showWaiting();
  alert("Danke für deine Abstimmung!");
});

function showWaiting() {
  votingSection.classList.add("hidden");
  waitingSection.classList.remove("hidden");
  resultsSection.classList.add("hidden");

  // Countdown aktualisieren
  showCountdown();
}

function showCountdown() {
  if (!hostData || !hostData.deadline) return;
  const deadline = new Date(hostData.deadline + "T23:59:59");
  const interval = setInterval(() => {
    const now = new Date();
    const diff = deadline - now;
    if (diff <= 0) {
      clearInterval(interval);
      // Zeige Ergebnisse sobald Deadline erreicht
      showResults();
      return;
    }
    resultDateDisplay.textContent = deadline.toLocaleDateString();
    countdownTimer.textContent = formatDuration(diff);
  }, 1000);
}

function formatDuration(ms) {
  let totalSeconds = Math.floor(ms / 1000);
  let days = Math.floor(totalSeconds / (3600 * 24));
  let hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  let minutes = Math.floor((totalSeconds % 3600) / 60);
  let seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function showResults() {
  votingSection.classList.add("hidden");
  waitingSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  if (!hostData.votes || hostData.votes.length === 0) {
    resultSection.innerHTML = "<p>Keine Stimmen abgegeben.</p>";
    return;
  }

  // Auswertung:
  // Für jede Kategorie: Zähle Stimmen für jeden Jungen und jedes Mädchen

  const categoryResults = {};

  hostData.categories.forEach(cat => {
    categoryResults[cat] = {
      boys: {}, // name -> count
      girls: {}
    };
  });

  // Alle Stimmen durchgehen
  hostData.votes.forEach(voteEntry => {
    voteEntry.votes.forEach(v => {
      if (!categoryResults[v.category]) return;
      if (v.boy) {
        categoryResults[v.category].boys[v.boy] = (categoryResults[v.category].boys[v.boy] || 0) + 1;
      }
      if (v.girl) {
        categoryResults[v.category].girls[v.girl] = (categoryResults[v.category].girls[v.girl] || 0) + 1;
      }
    });
  });

  // Ergebnis-HTML bauen
  let html = `<table class="result-table"><thead><tr><th>Kategorie</th><th>Junge (mit Stimmen)</th><th>Mädchen (mit Stimmen)</th></tr></thead><tbody>`;

  for (const cat of hostData.categories) {
    // Sortiere nach Stimmen absteigend
    const boys = Object.entries(categoryResults[cat].boys).sort((a,b) => b[1]-a[1]);
    const girls = Object.entries(categoryResults[cat].girls).sort((a,b) => b[1]-a[1]);

    const boyResult = boys.length === 0 ? "-" : boys.map(x => `${x[0]} (${x[1]})`).join(", ");
    const girlResult = girls.length === 0 ? "-" : girls.map(x => `${x[0]} (${x[1]})`).join(", ");

    html += `<tr><td>${cat}</td><td>${boyResult}</td><td>${girlResult}</td></tr>`;
  }

  html += "</tbody></table>";

  resultSection.innerHTML = html;
}
