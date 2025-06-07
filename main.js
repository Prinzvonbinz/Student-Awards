// main.js - Teil 1: Host Setup und Link-Generierung

// Hilfsfunktion: 5-stelliger Code (Zahlen + Großbuchstaben)
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Formular-Handling
document.getElementById('hostForm').addEventListener('submit', function(e) {
  e.preventDefault();

  // Eingabewerte holen
  const year = document.getElementById('year').value.trim();
  const className = document.getElementById('className').value.trim();
  const categoriesRaw = document.getElementById('categories').value.trim();
  const studentsRaw = document.getElementById('students').value.trim();
  const deadline = document.getElementById('deadline').value;

  if (!year || !className || !categoriesRaw || !studentsRaw || !deadline) {
    alert('Bitte alle Felder korrekt ausfüllen!');
    return;
  }

  // Kategorien in Array splitten (Komma-getrennt)
  const categories = categoriesRaw.split(',').map(c => c.trim()).filter(c => c.length > 0);
  if (categories.length === 0) {
    alert('Bitte mindestens eine Kategorie angeben.');
    return;
  }

  // Schüler parsen: Jede Zeile = "Name, m" oder "Name, w"
  const studentLines = studentsRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const students = [];
  for (const line of studentLines) {
    const parts = line.split(',');
    if (parts.length !== 2) {
      alert('Schüler müssen im Format "Name, m" oder "Name, w" angegeben werden, eine pro Zeile.');
      return;
    }
    const name = parts[0].trim();
    const gender = parts[1].trim().toLowerCase();
    if (!name || (gender !== 'm' && gender !== 'w')) {
      alert('Schüler müssen im Format "Name, m" oder "Name, w" angegeben werden, eine pro Zeile.');
      return;
    }
    students.push({ name, gender });
  }
  if (students.length === 0) {
    alert('Bitte mindestens einen Schüler angeben.');
    return;
  }

  // Access Code generieren
  const accessCode = generateAccessCode();

  // Alle Daten zusammenpacken
  const data = {
    year,
    className,
    categories,
    students,
    deadline,
    accessCode,
    votes: {} // Start leer
  };

  // Daten in localStorage speichern (Key: "studentAwards_{Code}")
  localStorage.setItem('studentAwards_' + accessCode, JSON.stringify(data));

  // Link zusammenbauen (zur vote.html mit Code als URL-Parameter)
  const baseUrl = location.origin + location.pathname.replace(/\/[^/]*$/, '/') + 'vote.html';
  const participationLink = `${baseUrl}?code=${accessCode}`;

  // Ausgabe anzeigen
  document.getElementById('participationLink').value = participationLink;
  document.getElementById('accessCode').textContent = accessCode;
  document.getElementById('output').style.display = 'block';

  // Formular ausblenden (optional)
  this.style.display = 'none';
});
// main.js - Teil 2: Teilnehmer Login & Abstimmung

// Hilfsfunktion zum Lesen von URL-Parametern
function getUrlParameter(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Global
let currentData = null;
let currentCode = null;
let currentStudent = null;

// Seite initialisieren
window.addEventListener('DOMContentLoaded', () => {
  currentCode = getUrlParameter('code');
  if (!currentCode) {
    alert('Kein Zugangscode gefunden. Bitte mit gültigem Link aufrufen.');
    return;
  }

  // Daten aus localStorage laden
  const stored = localStorage.getItem('studentAwards_' + currentCode);
  if (!stored) {
    alert('Ungültiger oder abgelaufener Zugangscode.');
    return;
  }
  currentData = JSON.parse(stored);

  showLoginForm();
});

// Loginformular anzeigen
function showLoginForm() {
  const loginDiv = document.getElementById('loginDiv');
  loginDiv.style.display = 'block';

  // Login-Button Event
  document.getElementById('loginBtn').addEventListener('click', () => {
    const inputName = document.getElementById('studentName').value.trim();
    if (!inputName) {
      alert('Bitte deinen Namen eingeben.');
      return;
    }

    // Schüler prüfen (exakt match mit Namen, case-insensitive)
    const found = currentData.students.find(s => s.name.toLowerCase() === inputName.toLowerCase());
    if (!found) {
      alert('Name nicht gefunden. Bitte überprüfe die Schreibweise.');
      return;
    }

    currentStudent = found;
    loginDiv.style.display = 'none';
    showVoteForm();
  });
}

// Abstimmungsformular anzeigen
function showVoteForm() {
  const voteDiv = document.getElementById('voteDiv');
  voteDiv.style.display = 'block';

  // Kategorien links, daneben je zwei Eingabefelder: Junge / Mädchen (für jeden Kategorie je Name)
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';

  currentData.categories.forEach(category => {
    const catRow = document.createElement('div');
    catRow.className = 'category-row';

    // Kategorie Name
    const catName = document.createElement('div');
    catName.textContent = category;
    catName.className = 'category-name';
    catRow.appendChild(catName);

    // Eingabefeld Junge
    const inputBoy = document.createElement('input');
    inputBoy.type = 'text';
    inputBoy.placeholder = 'Jungenname';
    inputBoy.className = 'input-boy';
    inputBoy.name = `boy_${category}`;
    catRow.appendChild(inputBoy);

    // Eingabefeld Mädchen
    const inputGirl = document.createElement('input');
    inputGirl.type = 'text';
    inputGirl.placeholder = 'Mädchenname';
    inputGirl.className = 'input-girl';
    inputGirl.name = `girl_${category}`;
    catRow.appendChild(inputGirl);

    container.appendChild(catRow);
  });

  // Abstimmungs-Button
  document.getElementById('submitVoteBtn').addEventListener('click', submitVote);
}

// Vote absenden und speichern
function submitVote() {
  // Für jede Kategorie: Werte prüfen
  const votes = {};
  let valid = true;
  let msg = '';

  for (const category of currentData.categories) {
    const boyInput = document.querySelector(`input[name="boy_${category}"]`).value.trim();
    const girlInput = document.querySelector(`input[name="girl_${category}"]`).value.trim();

    // Prüfen: Namen müssen in currentData.students vorhanden sein, mit Geschlecht passend
    const boyValid = currentData.students.some(s => s.name.toLowerCase() === boyInput.toLowerCase() && s.gender === 'm');
    const girlValid = currentData.students.some(s => s.name.toLowerCase() === girlInput.toLowerCase() && s.gender === 'w');

    if (!boyValid) {
      valid = false;
      msg = `Ungültiger Jungenname in Kategorie "${category}"`;
      break;
    }
    if (!girlValid) {
      valid = false;
      msg = `Ungültiger Mädchennamen in Kategorie "${category}"`;
      break;
    }

    votes[category] = { boy: boyInput, girl: girlInput };
  }

  if (!valid) {
    alert(msg);
    return;
  }

  // Speichern der Stimmen in currentData.votes unter currentStudent.name
  currentData.votes[currentStudent.name] = votes;

  // Daten zurück in localStorage speichern
  localStorage.setItem('studentAwards_' + currentCode, JSON.stringify(currentData));

  alert('Deine Stimmen wurden erfolgreich gespeichert. Danke fürs Mitmachen!');

  // Optional: Seite neu laden oder andere Aktion
  location.reload();
}
// main.js - Teil 3: Ergebnisse auswerten und anzeigen

// Ergebnisse anzeigen (z.B. nach Abstimmung oder als separate Funktion)
function showResults() {
  if (!currentData) {
    alert('Keine Daten geladen.');
    return;
  }

  const resultsDiv = document.getElementById('resultsDiv');
  resultsDiv.style.display = 'block';

  // Stimmen aller Teilnehmer sammeln
  const votes = currentData.votes; // { TeilnehmerName: {Kategorie: {boy, girl}} }

  // Ergebnis-Objekt aufbauen: pro Kategorie je Junge und Mädchen eine Zählung
  const tally = {};
  currentData.categories.forEach(cat => {
    tally[cat] = { boys: {}, girls: {} };
  });

  // Stimmen zählen
  Object.values(votes).forEach(voteSet => {
    for (const cat in voteSet) {
      const boyName = voteSet[cat].boy;
      const girlName = voteSet[cat].girl;

      // Junge zählen
      if (!tally[cat].boys[boyName]) tally[cat].boys[boyName] = 0;
      tally[cat].boys[boyName]++;

      // Mädchen zählen
      if (!tally[cat].girls[girlName]) tally[cat].girls[girlName] = 0;
      tally[cat].girls[girlName]++;
    }
  });

  // Ausgabe erzeugen
  resultsDiv.innerHTML = '<h2>Ergebnisse</h2>';

  for (const cat of currentData.categories) {
    const catResult = document.createElement('div');
    catResult.className = 'category-result';

    const catTitle = document.createElement('h3');
    catTitle.textContent = cat;
    catResult.appendChild(catTitle);

    // Jungen Gewinner
    let maxBoyCount = 0;
    let winnerBoy = '';
    for (const boy in tally[cat].boys) {
      if (tally[cat].boys[boy] > maxBoyCount) {
        maxBoyCount = tally[cat].boys[boy];
        winnerBoy = boy;
      }
    }
    const boyRes = document.createElement('p');
    boyRes.textContent = `Jungen-Gewinner: ${winnerBoy} (${maxBoyCount} Stimmen)`;
    catResult.appendChild(boyRes);

    // Mädchen Gewinner
    let maxGirlCount = 0;
    let winnerGirl = '';
    for (const girl in tally[cat].girls) {
      if (tally[cat].girls[girl] > maxGirlCount) {
        maxGirlCount = tally[cat].girls[girl];
        winnerGirl = girl;
      }
    }
    const girlRes = document.createElement('p');
    girlRes.textContent = `Mädchen-Gewinner: ${winnerGirl} (${maxGirlCount} Stimmen)`;
    catResult.appendChild(girlRes);

    resultsDiv.appendChild(catResult);
  }
}

// Beispiel: Funktion aufrufen, wenn auf Ergebnisse-Button geklickt wird
document.getElementById('showResultsBtn')?.addEventListener('click', showResults);
