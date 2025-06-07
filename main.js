// --- Allgemeine Hilfsfunktionen ---
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadData(key) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item);
  } catch {
    return null;
  }
}

// --- Host-Seite (index.html) ---
if (document.getElementById("hostForm")) {
  const form = document.getElementById("hostForm");
  const msg = document.getElementById("hostMessage");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "";
    const jahr = document.getElementById("jahr").value.trim();
    const klasse = document.getElementById("klasse").value.trim();
    const kategorienRaw = document.getElementById("kategorien").value.trim();
    const schuelerRaw = document.getElementById("schueler").value.trim();
    const deadline = document.getElementById("deadline").value;

    if (!jahr || !klasse || !kategorienRaw || !schuelerRaw || !deadline) {
      msg.textContent = "Bitte alle Felder ausfüllen.";
      msg.style.color = "red";
      return;
    }

    const kategorien = kategorienRaw.split(",").map(k => k.trim()).filter(k => k);
    if (kategorien.length === 0) {
      msg.textContent = "Bitte mindestens eine Kategorie eingeben.";
      msg.style.color = "red";
      return;
    }

    // Schüler parsen (Name, Geschlecht)
    const schuelerLines = schuelerRaw.split("\n").map(l => l.trim()).filter(l => l);
    const schueler = [];
    for (const line of schuelerLines) {
      const parts = line.split(",");
      if (parts.length !== 2) {
        msg.textContent = "Schülerformat ungültig: " + line;
        msg.style.color = "red";
        return;
      }
      const name = parts[0].trim();
      const geschlecht = parts[1].trim().toLowerCase();
      if (!name || (geschlecht !== "m" && geschlecht !== "w")) {
        msg.textContent = "Ungültiger Schüler-Eintrag: " + line;
        msg.style.color = "red";
        return;
      }
      schueler.push({ name, geschlecht });
    }

    // Deadline validieren
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      msg.textContent = "Ungültiges Deadline-Datum.";
      msg.style.color = "red";
      return;
    }

    // Code generieren (6-stellig, Buchstaben + Zahlen)
    let code;
    do {
      code = "";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (loadData("host_" + code) !== null);

    // Daten speichern
    const hostData = {
      jahr,
      klasse,
      kategorien,
      schueler,
      deadline,
      voters: [],
      votes: {},
    };
    saveData("host_" + code, hostData);

    msg.style.color = "green";
    msg.innerHTML = `Host erfolgreich erstellt! Dein Code:<br><b>${code}</b><br>
      Zum Abstimmen:<br>
      <a href="vote.html">vote.html</a><br>
      Gib dort den Code ein.<br>
      Zum Ergebnisse ansehen:<br>
      <a href="result.html">result.html</a>`;

    form.reset();
  });
}

// --- Abstimmungsseite (vote.html) ---
if (document.getElementById("voteCodeInput")) {
  const voteCodeInput = document.getElementById("voteCodeInput");
  const loadVoteBtn = document.getElementById("loadVote");
  const codeError = document.getElementById("codeError");
  const voteSection = document.getElementById("voteSection");
  const voteTable = document.getElementById("voteTable");
  const submitBtn = document.getElementById("submitVote");
  const voteMessage = document.getElementById("voteMessage");
  const tabBoys = document.getElementById("tabBoys");
  const tabGirls = document.getElementById("tabGirls");

  let currentHostData = null;
  let currentCode = null;
  let currentGender = "m";

  function clearVoteTable() {
    voteTable.innerHTML = "";
  }

  function buildVoteTable() {
    clearVoteTable();

    if (!currentHostData) return;

    const headerRow = document.createElement("tr");
    const catTh = document.createElement("th");
    catTh.textContent = "Kategorie";
    headerRow.appendChild(catTh);

    currentHostData.schueler
      .filter((s) => s.geschlecht === currentGender)
      .forEach((schueler) => {
        const th = document.createElement("th");
        th.textContent = schueler.name;
        headerRow.appendChild(th);
      });

    voteTable.appendChild(headerRow);

    currentHostData.kategorien.forEach((kat) => {
      const tr = document.createElement("tr");
      const katTd = document.createElement("td");
      katTd.textContent = kat;
      tr.appendChild(katTd);

      currentHostData.schueler
        .filter((s) => s.geschlecht === currentGender)
        .forEach((schueler) => {
          const td = document.createElement("td");
          const select = document.createElement("select");
          select.name = `${kat}_${schueler.name}`;
          select.innerHTML = `<option value="">-</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>`;
          td.appendChild(select);
          tr.appendChild(td);
        });

      voteTable.appendChild(tr);
    });
  }

  function showGender(gender) {
    currentGender = gender;
    if (gender === "m") {
      tabBoys.classList.add("active");
      tabGirls.classList.remove("active");
    } else {
      tabGirls.classList.add("active");
      tabBoys.classList.remove("active");
    }
    buildVoteTable();
  }

  loadVoteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    codeError.textContent = "";
    voteMessage.textContent = "";
    voteSection.style.display = "none";
    currentCode = voteCodeInput.value.trim().toUpperCase();
    if (currentCode.length !== 6) {
      codeError.textContent = "Bitte einen gültigen 6-stelligen Code eingeben.";
      return;
    }
    const hostData = loadData("host_" + currentCode);
    if (!hostData) {
      codeError.textContent = "Code nicht gefunden.";
      return;
    }
    currentHostData = hostData;
    voteSection.style.display = "block";
    showGender("m");
  });

  tabBoys.addEventListener("click", () => showGender("m"));
  tabGirls.addEventListener("click", () => showGender("w"));

  submitBtn.addEventListener("click", () => {
    voteMessage.style.color = "red";
    voteMessage.textContent = "";

    if (!currentHostData) {
      voteMessage.textContent = "Kein Host geladen.";
      return;
    }

    // Check deadline
    const now = new Date();
    const deadline = new Date(currentHostData.deadline);
    if (now > deadline) {
      voteMessage.textContent = "Abstimmung ist beendet (Deadline überschritten).";
      return;
    }

    // Erfassung aller Bewertungen
    const votes = {};
    // Structure: votes[category][gender][studentName] = score

    currentHostData.kategorien.forEach((kat) => {
      votes[kat] = { m: {}, w: {} };
      ["m", "w"].forEach((g) => {
        currentHostData.schueler
          .filter((s) => s.geschlecht === g)
          .forEach((schueler) => {
            votes[kat][g][schueler.name] = null;
          });
      });
    });

    // Alle Bewertungen aus dem Table sammeln
    ["m", "w"].forEach((g) => {
      currentHostData.kategorien.forEach((kat) => {
        currentHostData.schueler
          .filter((s) => s.geschlecht === g)
          .forEach((schueler) => {
            const selectName = `${kat}_${schueler.name}`;
            let val = null;
            if (g === currentGender) {
              // Nur im aktuellen Tab sind die Selects sichtbar
              const sel = document.getElementsByName(selectName)[0];
              val = sel ? sel.value : "";
            } else {
              // Andere Gender Tab: Wähle "-" = keine Stimme
              val = "";
            }
            votes[kat][g][schueler.name] = val === "" ? null : parseInt(val);
          });
      });
    });

    // Speichere die Abstimmung des Users
    if (!currentHostData.votes) currentHostData.votes = [];

    // Verhindern, dass derselbe Nutzer mehrmals abstimmt - hier per simple ID nicht möglich,
    // könnte man erweitern mit Name oder zufälliger ID

    currentHostData.votes.push(votes);
    saveData("host_" + currentCode, currentHostData);

    voteMessage.style.color = "green";
    voteMessage.textContent = "Abstimmung erfolgreich abgegeben. Danke!";
    voteSection.style.display = "none";
    voteCodeInput.value = "";
  });
}

// --- Ergebnisseite (result.html) ---
if (document.getElementById("resultCodeInput")) {
  const resultCodeInput = document.getElementById("resultCodeInput");
  const loadResultsBtn = document.getElementById("loadResults");
  const resultError = document.getElementById("resultError");
  const resultSection = document.getElementById("resultSection");
  const resultTable = document.getElementById("resultTable");
  const voterCountP = document.getElementById("voterCount");
  const deadlineInfoP = document.getElementById("deadlineInfo");

  loadResultsBtn.addEventListener("click", () => {
    resultError.textContent = "";
    resultSection.style.display = "none";
    const code = resultCodeInput.value.trim().toUpperCase();
    if (code.length !== 6) {
      resultError.textContent = "Bitte einen gültigen 6-stelligen Code eingeben.";
      return;
    }
    const hostData = loadData("host_" + code);
    if (!hostData) {
      resultError.textContent = "Code nicht gefunden.";
      return;
    }

    const votesArray = hostData.votes || [];
    const kategorien = hostData.kategorien;
    const schueler = hostData.schueler;
    const deadline = new Date(hostData.deadline);
    const now = new Date();

    voterCountP.textContent = `Abstimmungen insgesamt: ${votesArray.length}`;
    deadlineInfoP.textContent = `Abstimmungsende: ${deadline.toLocaleDateString()}`;

    // Tabelle vorbereiten
    resultTable.innerHTML = "";

    // Header
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th")); // Leer
    kategorien.forEach((kat) => {
      const th = document.createElement("th");
      th.textContent = kat;
      headerRow.appendChild(th);
    });
    resultTable.appendChild(headerRow);

    // Ergebnis aggregieren (Summe aller Stimmen pro Schüler und Kategorie getrennt nach Geschlecht)
    // Structure: results[gender][studentName][category] = sum
    const results = { m: {}, w: {} };
    ["m", "w"].forEach((g) => {
      schueler
        .filter((s) => s.geschlecht === g)
        .forEach((s) => {
          results[g][s.name] = {};
          kategorien.forEach((kat) => {
            results[g][s.name][kat] = 0;
          });
        });
    });

    // Summiere alle Stimmen
    votesArray.forEach((vote) => {
      kategorien.forEach((kat) => {
        ["m", "w"].forEach((g) => {
          for (const name in vote[kat][g]) {
            const val = vote[kat][g][name];
            if (val !== null && !isNaN(val)) {
              results[g][name][kat] += val;
            }
          }
        });
      });
    });

    // Zeilen m = Junge
    ["m", "w"].forEach((g) => {
      const genderLabel = g === "m" ? "Junge" : "Mädchen";
      const schuelerFiltered = schueler.filter((s) => s.geschlecht === g);

      // Geschlechtstitelzeile
      const genderRow = document.createElement("tr");
      const genderCell = document.createElement("td");
      genderCell.textContent = genderLabel;
      genderCell.colSpan = kategorien.length + 1;
      genderCell.style.fontWeight = "bold";
      genderRow.appendChild(genderCell);
      resultTable.appendChild(genderRow);

      schuelerFiltered.forEach((sch) => {
        const tr = document.createElement("tr");
        const nameTd = document.createElement("td");
        nameTd.textContent = sch.name;
        tr.appendChild(nameTd);

        kategorien.forEach((kat) => {
          const td = document.createElement("td");
          td.textContent = results[g][sch.name][kat];
          tr.appendChild(td);
        });

        resultTable.appendChild(tr);
      });
    });

    resultSection.style.display = "block";
  });
}
