// Helfer-Funktion: URL-Parameter auslesen
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Funktion: 5-stelliger Code (A-Z)
function generateCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// --- Index.html Skript ---
function setupHost() {
  const form = document.getElementById("hostSetupForm");
  form.addEventListener("submit", function(e) {
    e.preventDefault();

    // Daten holen
    const year = document.getElementById("year").value.trim();
    const className = document.getElementById("className").value.trim();
    const categoriesRaw = document.getElementById("categories").value.trim();
    const studentsRaw = document.getElementById("students").value.trim();
    const endDate = document.getElementById("endDate").value;

    if (!year || !className || !categoriesRaw || !studentsRaw || !endDate) {
      alert("Bitte alle Felder ausfüllen!");
      return;
    }

    const categories = categoriesRaw.split(",").map(c => c.trim()).filter(c => c.length > 0);
    if (categories.length === 0) {
      alert("Bitte mindestens eine Kategorie angeben.");
      return;
    }

    const students = [];
    const lines = studentsRaw.split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const parts = line.split(",");
      if (parts.length !== 2) {
        alert(`Ungültiges Schülerformat: "${line}" (Name,Geschlecht) erwartet.`);
        return;
      }
      const name = parts[0].trim();
      const gender = parts[1].trim().toLowerCase();
      if (!name || (gender !== "m" && gender !== "w")) {
        alert(`Ungültige Schülerdaten: "${line}". Geschlecht muss "m" oder "w" sein.`);
        return;
      }
      students.push({ name, gender });
    }

    if (students.length === 0) {
      alert("Bitte mindestens einen Schüler angeben.");
      return;
    }

    // Code generieren, doppelte vermeiden
    let code;
    do {
      code = generateCode();
    } while (localStorage.getItem("student_awards_" + code));

    // Daten speichern
    const hostData = {
      year,
      className,
      categories,
      students,
      endDate,
      votes: []  // Array für gespeicherte Stimmen
    };

    localStorage.setItem("student_awards_" + code, JSON.stringify(hostData));

    // Link anzeigen
    const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
    const link = baseUrl + "vote.html?code=" + code;

    document.getElementById("hostLinkSection").style.display = "block";
    document.getElementById("generatedLink").value = link;
    document.getElementById("accessCode").textContent = code;
  });
}

// --- vote.html Skript ---
function setupVote() {
  const info = document.getElementById("info");
  const voteForm = document.getElementById("voteForm");
  const submitBtn = document.getElementById("submitVoteBtn");
  const deadlineWarning = document.getElementById("deadlineWarning");
  const resultSection = document.getElementById("resultSection");
  const resultsDiv = document.getElementById("results");

  // Code aus URL holen
  const code = getQueryParam("code");
  if (!code) {
    info.textContent = "Kein Code angegeben.";
    return;
  }

  // Daten aus localStorage laden
  const dataRaw = localStorage.getItem("student_awards_" + code.toUpperCase());
  if (!dataRaw) {
    info.textContent = "Kein gültiger Code gefunden.";
    return;
  }

  const data = JSON.parse(dataRaw);

  // Deadline prüfen
  const today = new Date();
  const deadlineDate = new Date(data.endDate + "T23:59:59");
  if (today > deadlineDate) {
    deadlineWarning.style.display = "block";
  }

  info.innerHTML = `
    Jahr: ${data.year} <br>
    Klasse: ${data.className} <br>
    Kategorien: ${data.categories.join(", ")} <br>
    Anzahl Schüler: ${data.students.length} <br>
    Abstimmungsende: ${data.endDate}
  `;

  if (today > deadlineDate) {
    submitBtn.style.display = "none";
  } else {
    submitBtn.style.display = "block";
  }

  // Falls schon abgestimmt (Pro Schüler Name) - hier keine Einschränkung, du kannst das anpassen

  // Tabelle bauen mit je Kategorie eine Spalte, je Schüler eine Zeile
  // Für jede Zelle: Radio Buttons mit Schülernamen pro Kategorie

  // Tabelle aufbauen
  const table = document.createElement("table");

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th")); // leere linke obere Ecke
  for (const cat of data.categories) {
    const th = document.createElement("th");
    th.textContent = cat;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  // Pro Kategorie eine Spalte mit Radios, wir müssen aber pro Kategorie einen Radiobutton pro Schüler machen
  // Die klassische Logik ist: pro Kategorie kann nur ein Schüler gewählt werden.
  // Also pro Kategorie: eine Gruppe Radio mit name=category_X

  // Wir bauen pro Kategorie eine Spalte, das heißt für jeden Schüler wird eine Zeile erzeugt, die Zellen haben Radio in der Spalte je Kategorie.

  // Um das umzusetzen: Für jede Schüler-Zeile, in jeder Kategorie-Zelle, Radio, die alle für dieselbe Kategorie die gleiche "name" haben, Value = Schülername

  for (let i = 0; i < data.students.length; i++) {
    const student = data.students[i];
    const tr = document.createElement("tr");

    // Erste Spalte: Schülername
    const tdName = document.createElement("td");
    tdName.textContent = student.name + (student.gender === "w" ? " (w)" : " (m)");
    tdName.style.textAlign = "left";
    tr.appendChild(tdName);

    // Pro Kategorie Radios
    for (let c = 0; c < data.categories.length; c++) {
      const td = document.createElement("td");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "category_" + c;
      radio.value = student.name;
      td.appendChild(radio);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  voteForm.appendChild(table);

  // Beim Klick auf Abstimmen speichern wir die Stimmen in data.votes

  submitBtn.onclick = () => {
    // Check, dass pro Kategorie was gewählt ist
    for (let c = 0; c < data.categories.length; c++) {
      const radios = document.getElementsByName("category_" + c);
      if (![...radios].some(r => r.checked)) {
        alert(`Bitte wähle einen Schüler für die Kategorie "${data.categories[c]}" aus.`);
        return;
      }
    }

    // Stimmen zusammenstellen
    // Stimmen-Array: pro Kategorie ein Objekt { category: "Kategorie", student: "Name" }
    const votesEntry = [];
    for (let c = 0; c < data.categories.length; c++) {
      const radios = document.getElementsByName("category_" + c);
      const checked = [...radios].find(r => r.checked);
      votesEntry.push({
        category: data.categories[c],
        student: checked.value
      });
    }

    // In data.votes speichern
    data.votes.push(votesEntry);

    // Speichern zurück in localStorage
    localStorage.setItem("student_awards_" + code.toUpperCase(), JSON.stringify(data));

    // Ergebnis anzeigen
    showResults(data);

    // Abstimmen-Button ausblenden und Formular deaktivieren
    submitBtn.style.display = "none";
    voteForm.querySelectorAll("input").forEach(i => i.disabled = true);
  };

  // Funktion zur Ergebnisauswertung
  function showResults(data) {
    resultSection.style.display = "block";
    resultsDiv.innerHTML = "";

    // Wir zählen pro Kategorie die Stimmen je Schüler
    const tally = {}; // { Kategorie: { Schülername: Anzahl } }

    for (const cat of data.categories) {
      tally[cat] = {};
      for (const s of data.students) {
        tally[cat][s.name] = 0;
      }
    }

    for (const voteEntry of data.votes) {
      for (const vote of voteEntry) {
        if (tally[vote.category] && tally[vote.category][vote.student] !== undefined) {
          tally[vote.category][vote.student]++;
        }
      }
    }

    // Ergebnis-Tabelle bauen
    const resTable = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    headRow.appendChild(document.createElement("th")); // leer links
    for (const s of data.students) {
      const th = document.createElement("th");
      th.textContent = s.name;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    resTable.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const cat of data.categories) {
      const tr = document.createElement("tr");
      const tdCat = document.createElement("td");
      tdCat.textContent = cat;
      tdCat.style.fontWeight = "bold";
      tr.appendChild(tdCat);

      for (const s of data.students) {
        const td = document.createElement("td");
        td.textContent = tally[cat][s.name];
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }
    resTable.appendChild(tbody);

    resultsDiv.appendChild(resTable);
  }
}

// Main: Je nach Datei initialisieren
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  if (path.endsWith("index.html") || path.endsWith("/")) {
    setupHost();
  } else if (path.endsWith("vote.html")) {
    setupVote();
  }
});
