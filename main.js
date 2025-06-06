let hostData = {
  className: "",
  year: new Date().getFullYear(),
  categories: [],
  students: [],
  deadline: "",
  code: "",
  votes: [],
};

let voteSubmitted = false;

// --- Hilfsfunktionen ---

function generateAccessCode() {
  return Math.random().toString(36).slice(-5).toUpperCase();
}

function saveHostData() {
  localStorage.setItem("student_awards_host", JSON.stringify(hostData));
}

function loadHostData() {
  const data = localStorage.getItem("student_awards_host");
  if (data) {
    hostData = JSON.parse(data);
  }
}

// --- Host Setup ---

document.getElementById("hostSetupForm").addEventListener("submit", function (e) {
  e.preventDefault();

  hostData.year = parseInt(document.getElementById("year").value, 10);
  hostData.className = document.getElementById("className").value.trim();
  hostData.categories = document.getElementById("categories").value
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0);
  hostData.deadline = document.getElementById("endDate").value;

  const studentsRaw = document.getElementById("students").value.trim().split("\n");
  hostData.students = [];
  for (let line of studentsRaw) {
    let parts = line.split(",").map(s => s.trim());
    if (parts.length === 2 && (parts[1] === "m" || parts[1] === "w")) {
      hostData.students.push({ name: parts[0], gender: parts[1] });
    }
  }

  if (hostData.categories.length === 0 || hostData.students.length === 0) {
    alert("Bitte Kategorien und Schüler korrekt eingeben!");
    return;
  }

  hostData.code = generateAccessCode();
  hostData.votes = [];

  saveHostData();

  // Link generieren (hier: Link zur aktuellen Seite mit code als Parameter)
  const link = window.location.origin + window.location.pathname + "?code=" + hostData.code;

  document.getElementById("generatedLink").value = link;
  document.getElementById("accessCode").textContent = hostData.code;
  document.getElementById("hostLinkSection").classList.remove("hidden");

  // Nach Host-Setup Login-Teilnehmer-Section anzeigen
  document.getElementById("participantLoginSection").classList.remove("hidden");
  document.getElementById("hostSetupSection").classList.add("hidden");
});

// --- Teilnehmer Login ---

document.getElementById("participantLoginBtn").addEventListener("click", () => {
  loadHostData();

  const enteredLink = document.getElementById("participantLink").value.trim();
  const enteredCode = document.getElementById("participantCode").value.trim().toUpperCase();

  if (!enteredLink || !enteredCode) {
    document.getElementById("loginError").textContent = "Bitte Link und Code eingeben.";
    return;
  }

  // Prüfe, ob code im Link mit eingegebenem Code übereinstimmt (nur Demo, Link-Check einfach)
  if (!enteredLink.includes(enteredCode) || enteredCode !== hostData.code) {
    document.getElementById("loginError").textContent = "Link oder Code stimmen nicht überein.";
    return;
  }

  // Prüfen, ob Deadline erreicht
  const now = new Date();
  const deadlineDate = new Date(hostData.deadline);
  if (now > deadlineDate) {
    alert("Die Abstimmung ist beendet.");
    return;
  }

  // Login erfolgreich
  document.getElementById("participantLoginSection").classList.add("hidden");
  showVotingForm();
  document.getElementById("votingSection").classList.remove("hidden");
});

// --- Voting ---

function renderVotingInputs(categories) {
  const container = document.getElementById("categoriesContainer");
  container.innerHTML = ""; // vorher leeren

  categories.forEach(cat => {
    const div = document.createElement("div");
    div.className = "vote-category";

    // Kategorie-Name links (Label)
    const label = document.createElement("label");
    label.textContent = cat;

    // Eingabefeld Junge
    const inputBoy = document.createElement("input");
    inputBoy.type = "text";
    inputBoy.placeholder = "Name Junge";
    inputBoy.name = `boy-${cat}`;

    // Eingabefeld Mädchen
    const inputGirl = document.createElement("input");
    inputGirl.type = "text";
    inputGirl.placeholder = "Name Mädchen";
    inputGirl.name = `girl-${cat}`;

    div.appendChild(label);
    div.appendChild(inputBoy);
    div.appendChild(inputGirl);
    container.appendChild(div);
  });
}

function showVotingForm() {
  document.getElementById("voteResult").textContent = "";
  renderVotingInputs(hostData.categories);
}

document.getElementById("voteForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  let votes = {};

  for (let cat of hostData.categories) {
    const boyName = formData.get(`boy-${cat}`)?.trim();
    const girlName = formData.get(`girl-${cat}`)?.trim();

    if (!boyName || !girlName) {
      alert("Bitte alle Felder ausfüllen oder '-' eintragen.");
      return;
    }

    // Validierung: Name muss in hostData.students sein und zum Geschlecht passen oder '-'
    if (boyName !== "-" && !hostData.students.some(s => s.name === boyName && s.gender === "m")) {
      alert(`Jungen-Name "${boyName}" passt nicht zur Kategorie ${cat}.`);
      return;
    }
    if (girlName !== "-" && !hostData.students.some(s => s.name === girlName && s.gender === "w")) {
      alert(`Mädchen-Name "${girlName}" passt nicht zur Kategorie ${cat}.`);
      return;
    }

    votes[cat] = { m: boyName, w: girlName };
  }

  // Stimmen speichern
  hostData.votes.push(votes);
  saveHostData();
  voteSubmitted = true;

  // Bestätigung anzeigen
  document.getElementById("votingSection").innerHTML = "<h2>Danke fürs Abstimmen! 🎉</h2>";

  // Optional: Wartebereich anzeigen bis zum Ergebnis
  showWaitingSection();
});

// --- Warteschleife ---

function showWaitingSection() {
  document.getElementById("votingSection").classList.add("hidden");
  document.getElementById("waitingSection").classList.remove("hidden");

  // Ergebnisdatum anzeigen (Deadline)
  const deadlineDate = new Date(hostData.deadline);
  document.getElementById("resultDateDisplay").textContent = deadlineDate.toLocaleString();

  // Countdown starten
  const countdownEl = document.getElementById("countdownTimer");

  function updateCountdown() {
    const now = new Date();
    const diff = deadlineDate - now;
    if (diff <= 0) {
      clearInterval(timerId);
      countdownEl.textContent = "Abstimmung beendet! Ergebnisse werden angezeigt...";
      showResults();
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    countdownEl.textContent = `${hours}h ${mins}m ${secs}s`;
  }

  updateCountdown();
  const timerId = setInterval(updateCountdown, 1000);
}

// --- Ergebnisse auswerten und anzeigen ---

function showResults() {
  document.getElementById("waitingSection").classList.add("hidden");
  document.getElementById("resultsSection").classList.remove("hidden");

  const resultsDiv = document.getElementById("resultSection");
  resultsDiv.innerHTML = "";

  if (!hostData.votes || hostData.votes.length === 0) {
    resultsDiv.textContent = "Keine Stimmen vorhanden.";
    return;
  }

  // Ergebnisse berechnen: für jede Kategorie -> Name und Anzahl der Nennungen (m/w getrennt)
  const summary = {};
  hostData.categories.forEach(cat => {
    summary[cat] = { m: {}, w: {} };
  });

  hostData.votes.forEach(vote => {
    for (const cat in vote) {
      if (vote[cat].m !== "-" && vote[cat].m.trim() !== "") {
        summary[cat].m[vote[cat].m] = (summary[cat].m[vote[cat].m] || 0) + 1;
      }
      if (vote[cat].w !== "-" && vote[cat].w.trim() !== "") {
        summary[cat].w[vote[cat].w] = (summary[cat].w[vote[cat].w] || 0) + 1;
      }
    }
  });

  // Ergebnis als Tabelle darstellen
  hostData.categories.forEach(cat => {
    const catDiv = document.createElement("div");
    catDiv.style.marginBottom = "20px";

    const title = document.createElement("h3");
    title.textContent = cat;
    catDiv.appendChild(title);

    // Tabelle für m/w Ergebnisse
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    const header = document.createElement("tr");
    header.innerHTML = "<th style='border: 1px solid #ccc; padding: 5px;'>Jungen</th><th style='border: 1px solid #ccc; padding: 5px;'>Stimmen</th><th style='border: 1px solid #ccc; padding: 5px;'>Mädchen</th><th style='border: 1px solid #ccc; padding: 5px;'>Stimmen</th>";
    table.appendChild(header);

    // Alle Namen der Kategorie (m/w) sammeln
    const boys = Object.entries(summary[cat].m).sort((a,b) => b[1] - a[1]);
    const girls = Object.entries(summary[cat].w).sort((a,b) => b[1] - a[1]);

    // Maximale Zeilenanzahl (um beide Spalten gleich lang zu machen)
    const maxRows = Math.max(boys.length, girls.length);

    for (let i = 0; i < maxRows; i++) {
      const row = document.createElement("tr");

      // Junge Name + Stimmen
      if (boys[i]) {
        row.innerHTML += `<td style='border: 1px solid #ccc; padding: 5px;'>${boys[i][0]}</td><td style='border: 1px solid #ccc; padding: 5px; text-align: center;'>${boys[i][1]}</td>`;
      } else {
        row.innerHTML += `<td style='border: 1px solid #ccc; padding: 5px;'>&nbsp;</td><td style='border: 1px solid #ccc; padding: 5px;'>&nbsp;</td>`;
      }

      // Mädchen Name + Stimmen
      if (girls[i]) {
        row.innerHTML += `<td style='border: 1px solid #ccc; padding: 5px;'>${girls[i][0]}</td><td style='border: 1px solid #ccc; padding: 5px; text-align: center;'>${girls[i][1]}</td>`;
      } else {
        row.innerHTML += `<td style='border: 1px solid #ccc; padding: 5px;'>&nbsp;</td><td style='border: 1px solid #ccc; padding: 5px;'>&nbsp;</td>`;
      }

      table.appendChild(row);
    }

    catDiv.appendChild(table);
    resultsDiv.appendChild(catDiv);
  });
}

// --- Reset ---

document.getElementById("resetBtn").addEventListener("click", () => {
  localStorage.removeItem("student_awards_host");
  location.reload();
});

// --- Auto-Load Host Data wenn vorhanden ---

window.addEventListener("load", () => {
  loadHostData();
  if (hostData.code) {
    // Link & Code anzeigen, Teilnehmerlogin anzeigen
    const link = window.location.origin + window.location.pathname + "?code=" + hostData.code;
    document.getElementById("generatedLink").value = link;
    document.getElementById("accessCode").textContent = hostData.code;
    document.getElementById("hostLinkSection").classList.remove("hidden");
    document.getElementById("participantLoginSection").classList.remove("hidden");
    document.getElementById("hostSetupSection").classList.add("hidden");
  }
});
