// --- Allgemeine Utility-Funktionen ---

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadData(key) {
  const d = localStorage.getItem(key);
  return d ? JSON.parse(d) : null;
}

// --- Host-Seite ---

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for(let i=0; i<5; i++) {
    code += chars.charAt(Math.floor(Math.random()*chars.length));
  }
  return code;
}

function setupHostPage() {
  // Wird nur auf host.html aufgerufen
  const form = document.getElementById("hostForm");
  const createBtn = document.getElementById("createTableBtn");
  const codeDisplay = document.getElementById("generatedCode");
  const errorMsg = document.getElementById("hostError");

  if(!form) return;

  createBtn.addEventListener("click", () => {
    errorMsg.textContent = "";

    // Werte holen
    const jahr = form.jahr.value.trim();
    const klasse = form.klasse.value.trim();
    const kategorienRaw = form.kategorien.value.trim();
    const schuelerRaw = form.schueler.value.trim();
    const deadlineStr = form.deadline.value.trim();

    // Validieren
    if(!jahr || !klasse || !kategorienRaw || !schuelerRaw || !deadlineStr) {
      errorMsg.textContent = "Bitte alle Felder ausfüllen.";
      return;
    }
    const kategorien = kategorienRaw.split(",").map(s=>s.trim()).filter(s=>s.length>0);
    if(kategorien.length === 0) {
      errorMsg.textContent = "Mindestens eine Kategorie angeben.";
      return;
    }

    // Schüler parsen: Name, Geschlecht (m/w)
    // Format: "Max,m" pro Zeile
    const schuelerLines = schuelerRaw.split("\n").map(s=>s.trim()).filter(s=>s.length>0);
    const schueler = [];
    for(const line of schuelerLines) {
      const parts = line.split(",");
      if(parts.length !== 2) {
        errorMsg.textContent = `Ungültiges Format bei Schüler: ${line}. Format: Name,m/w`;
        return;
      }
      const name = parts[0].trim();
      const gender = parts[1].trim().toLowerCase();
      if(!name || (gender !== "m" && gender !== "w")) {
        errorMsg.textContent = `Ungültiges Format bei Schüler: ${line}. Geschlecht muss m oder w sein.`;
        return;
      }
      schueler.push({name, gender});
    }
    if(schueler.length === 0) {
      errorMsg.textContent = "Mindestens ein Schüler muss angegeben werden.";
      return;
    }

    // Deadline prüfen (Datum)
    const deadline = new Date(deadlineStr);
    if(isNaN(deadline.getTime())) {
      errorMsg.textContent = "Ungültiges Datum für Deadline.";
      return;
    }

    // Code generieren
    const code = generateCode();

    // Speichern unter 'host_'+code
    const hostData = {
      jahr,
      klasse,
      kategorien,
      schueler,
      deadline: deadlineStr,
      votes: {},      // key: voterId, value: voteObj
      voters: [],     // Liste voterIds, um Mehrfachabstimmung zu verhindern
    };
    saveData("host_" + code, hostData);

    // Anzeige
    codeDisplay.textContent = `Dein Host-Code: ${code}`;
    createBtn.disabled = true;
  });
}

function setupVotePage() {
  const loadBtn = document.getElementById("loadVote");
  const codeInput = document.getElementById("voteCode");
  const codeError = document.getElementById("codeError");
  const voteSection = document.getElementById("voteSection");
  const voteTable = document.getElementById("voteTable");
  const submitBtn = document.getElementById("submitVote");
  const voteMessage = document.getElementById("voteMessage");
  const tabBoys = document.getElementById("tabBoys");
  const tabGirls = document.getElementById("tabGirls");

  let hostData = null;
  let currentCode = null;
  let currentGender = "m"; // 'm' Junge, 'w' Mädchen
  let currentVotes = {}; // Kategorie => Name or '-' (Enthaltung)

  function renderTable() {
    voteTable.innerHTML = "";

    // Überschriften
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const thCat = document.createElement("th");
    thCat.textContent = "Kategorie";
    headRow.appendChild(thCat);
    const thSel = document.createElement("th");
    thSel.textContent = currentGender === "m" ? "Junge wählen" : "Mädchen wählen";
    headRow.appendChild(thSel);
    thead.appendChild(headRow);
    voteTable.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    for(const kat of hostData.kategorien) {
      const tr = document.createElement("tr");

      const tdCat = document.createElement("td");
      tdCat.textContent = kat;
      tr.appendChild(tdCat);

      const tdSelect = document.createElement("td");

      // Auswahl: Namen der Schüler filtern nach gender & sortieren
      const names = hostData.schueler
        .filter(s => s.gender === currentGender)
        .map(s => s.name)
        .sort();

      // Auswahlfeld (Select)
      const select = document.createElement("select");
      select.dataset.kategorie = kat;
      const optionEnthaltung = document.createElement("option");
      optionEnthaltung.value = "-";
      optionEnthaltung.textContent = "- (Enthaltung)";
      select.appendChild(optionEnthaltung);

      for(const name of names) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      }

      // Vorbelegung falls schon gewählt
      if(currentVotes[kat]) {
        select.value = currentVotes[kat];
      } else {
        select.value = "-";
      }

      select.addEventListener("change", () => {
        currentVotes[kat] = select.value;
        validateComplete();
      });

      tdSelect.appendChild(select);
      tr.appendChild(tdSelect);
      tbody.appendChild(tr);
    }

    voteTable.appendChild(tbody);
  }

  function validateComplete() {
    // Alle Kategorien müssen eine Auswahl haben (auch Enthaltung erlaubt)
    const allFilled = hostData.kategorien.every(kat => currentVotes.hasOwnProperty(kat));
    submitBtn.disabled = !allFilled;
  }

  loadBtn.addEventListener("click", () => {
    const code = codeInput.value.trim().toUpperCase();
    codeError.textContent = "";
    voteMessage.textContent = "";

    if(code.length !== 5) {
      codeError.textContent = "Code muss 5 Zeichen lang sein.";
      return;
    }

    const data = loadData("host_" + code);
    if(!data) {
      codeError.textContent = "Kein gültiger Code gefunden.";
      return;
    }

    // Deadline prüfen: Ist noch offen?
    const deadlineDate = new Date(data.deadline);
    const now = new Date();
    if(now > deadlineDate) {
      codeError.textContent = "Deadline für Abstimmung ist vorbei.";
      return;
    }

    // Prüfen, ob schon abgestimmt wurde: voterId = zufällige ID pro Nutzer im LocalStorage
    currentCode = code;
    hostData = data;

    // VoterId im LocalStorage oder neu
    let voterId = localStorage.getItem("voterId");
    if(!voterId) {
      voterId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem("voterId", voterId);
    }

    if(hostData.voters.includes(voterId)) {
      codeError.textContent = "Sie haben bereits abgestimmt.";
      return;
    }

    // Vote-Bereich zeigen, Code-Eingabe ausblenden
    document.getElementById("codeInputSection").style.display = "none";
    voteSection.style.display = "block";

    // Startwerte
    currentVotes = {};
    currentGender = "m";

    renderTable();
    validateComplete();
  });

  // Tabs für Junge / Mädchen
  tabBoys.addEventListener("click", () => {
    currentGender = "m";
    tabBoys.classList.add("active");
    tabGirls.classList.remove("active");
    renderTable();
  });

  tabGirls.addEventListener("click", () => {
    currentGender = "w";
    tabGirls.classList.add("active");
    tabBoys.classList.remove("active");
    renderTable();
  });

  submitBtn.addEventListener("click", () => {
    voteMessage.textContent = "";

    // Prüfen, ob alle Kategorien ausgefüllt sind
    const missing = hostData.kategorien.filter(kat => !currentVotes[kat]);
    if(missing.length > 0) {
      voteMessage.textContent = "Bitte für alle Kategorien eine Auswahl treffen.";
      return;
    }

    // VoterId aus LocalStorage
    let voterId = localStorage.getItem("voterId");
    if(!voterId) {
      voteMessage.textContent = "Fehler: Keine Voter-ID gefunden.";
      return;
    }

    if(hostData.voters.includes(voterId)) {
      voteMessage.textContent = "Sie haben bereits abgestimmt.";
      return;
    }

    // Abstimmung speichern
    hostData.votes[voterId] = {...currentVotes};
    hostData.voters.push(voterId);

    saveData("host_" + currentCode, hostData);

    submitBtn.disabled = true;
    voteMessage.textContent = "Vielen Dank für Ihre Abstimmung!";
  });
}

function setupResultPage() {
  const hostCodeInput = document.getElementById("hostCodeInput");
  const loadResultsBtn = document.getElementById("loadResults");
  const hostCodeError = document.getElementById("hostCodeError");
  const resultsSection = document.getElementById("resultsSection");
  const resultsOutput = document.getElementById("resultsOutput");
  const voteCountSpan = document.getElementById("voteCount");
  const deadlineInfo = document.getElementById("deadlineInfo");

  loadResultsBtn.addEventListener("click", () => {
    hostCodeError.textContent = "";
    resultsOutput.innerHTML = "";
    voteCountSpan.textContent = "";
    deadlineInfo.textContent = "";

    const code = hostCodeInput.value.trim().toUpperCase();
    if(code.length !== 5) {
      hostCodeError.textContent = "Code muss 5 Zeichen lang sein.";
      return;
    }

    const data = loadData("host_" + code);
    if(!data) {
      hostCodeError.textContent = "Kein gültiger Host-Code gefunden.";
      return;
    }

    // Deadline anzeigen
    deadlineInfo.textContent = "Abstimmungsdeadline: " + data.deadline;

    // Anzahl Abstimmungen
    const voteCount = data.voters.length;
    voteCountSpan.textContent = voteCount;

    if(voteCount === 0) {
      resultsOutput.textContent = "Noch keine Abstimmungen vorhanden.";
      resultsSection.style.display = "block";
      return;
    }

    // Ergebnis-Auswertung: pro Kategorie die Stimmen zählen
    const counts = {}; // kat -> name -> count

    for(const kat of data.kategorien) {
      counts[kat] = {};
    }

    for(const voteId in data.votes) {
      const vote = data.votes[voteId];
      for(const kat in vote) {
        const name = vote[kat];
        if(name && name !== "-") {
          if(!counts[kat][name]) counts[kat][name] = 0;
          counts[kat][name]++;
        }
      }
    }

    // Ergebnisse tabellarisch ausgeben
    for(const kat of data.kategorien) {
      const katDiv = document.createElement("div");
      katDiv.classList.add("result-category");
      const title = document.createElement("h3");
      title.textContent = kat;
      katDiv.appendChild(title);

      const ul = document.createElement("ul");

      // Sortiere Namen nach Anzahl absteigend
      const sorted = Object.entries(counts[kat]).sort((a,b) => b[1]-a[1]);

      if(sorted.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Keine Stimmen";
        ul.appendChild(li);
      } else {
        for(const [name,count] of sorted) {
          const li = document.createElement("li");
          li.textContent = `${name}: ${count} Stimme${count > 1 ? "n" : ""}`;
          ul.appendChild(li);
        }
      }

      katDiv.appendChild(ul);
      resultsOutput.appendChild(katDiv);
    }

    resultsSection.style.display = "block";
  });
}

// --- Initialisierung je nach Seite ---
document.addEventListener("DOMContentLoaded", () => {
  if(document.body.querySelector("#hostForm")) {
    setupHostPage();
  }
  if(document.body.querySelector("#loadVote")) {
    setupVotePage();
  }
  if(document.body.querySelector("#loadResults")) {
    setupResultPage();
  }
});
