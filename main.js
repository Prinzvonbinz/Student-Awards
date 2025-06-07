// Hauptfunktionen für Student-Awards

// Hilfsfunktion: Zufälliger 5-stelliger Code (Buchstaben & Zahlen)
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- Host Seite (host.html) ---

if (document.getElementById('hostForm')) {
  const hostForm = document.getElementById('hostForm');
  const codeDisplay = document.getElementById('codeDisplay');
  const createTableBtn = document.getElementById('createTableBtn');
  let sessionCode = null;

  createTableBtn.addEventListener('click', () => {
    // Werte aus Formular holen
    const year = document.getElementById('year').value.trim();
    const className = document.getElementById('className').value.trim();
    const categoriesRaw = document.getElementById('categories').value.trim();
    const studentsRaw = document.getElementById('students').value.trim();
    const deadline = document.getElementById('deadline').value;

    // Validierung
    if (!year || !className || !categoriesRaw || !studentsRaw || !deadline) {
      alert('Bitte alle Felder ausfüllen.');
      return;
    }

    const categories = categoriesRaw.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (categories.length === 0) {
      alert('Bitte mindestens eine Kategorie angeben.');
      return;
    }

    // Schüler parsen (Name und Geschlecht m/w)
    const studentsLines = studentsRaw.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const students = [];
    for (const line of studentsLines) {
      const parts = line.split(',');
      if (parts.length !== 2) {
        alert('Schülerangaben müssen im Format "Name,m" oder "Name,w" sein. Fehler bei: ' + line);
        return;
      }
      const name = parts[0].trim();
      const gender = parts[1].trim().toLowerCase();
      if (!name || (gender !== 'm' && gender !== 'w')) {
        alert('Ungültige Schülerangabe: ' + line);
        return;
      }
      students.push({ name, gender });
    }
    if (students.length === 0) {
      alert('Bitte mindestens einen Schüler angeben.');
      return;
    }

    // Deadline prüfen (Datum in der Zukunft)
    if (new Date(deadline) < new Date()) {
      alert('Deadline muss ein zukünftiges Datum sein.');
      return;
    }

    // Session-Daten speichern
    sessionCode = generateCode();
    // Prüfen ob Code schon existiert (für Einfachheit einfach überschreiben)
    const sessionData = {
      year, className, categories, students, deadline,
      votes: {}, // { userId: { category_gender: name or "-" } }
      voters: [], // userIds, zur Anzahl
      submittedUsers: {}, // userId: true, damit niemand doppelt abstimmen kann
    };

    localStorage.setItem('session_' + sessionCode, JSON.stringify(sessionData));
    localStorage.setItem('sessionCode', sessionCode);

    codeDisplay.textContent = 'Dein Code: ' + sessionCode;
    alert(`Session angelegt. Code: ${sessionCode}\n\nGib diesen Code auf der Abstimm-Seite ein, um abzustimmen.`);
  });
}


// --- Voting Seite (vote.html) ---

if (document.getElementById('voteTable')) {
  const codeInput = document.getElementById('codeInput');
  const startVoteBtn = document.getElementById('startVoteBtn');
  const voteContainer = document.getElementById('voteContainer');
  const voteTable = document.getElementById('voteTable');
  const namesList = document.getElementById('namesList');
  const submitBtn = document.getElementById('submitBtn');
  const thankYou = document.getElementById('thankYou');

  let session = null;
  let sessionCode = null;
  let selectedGender = 'm'; // 'm' oder 'w'
  let currentCategory = null;
  let userId = null; // zufällig generierte ID für den Voter
  let userVotes = {}; // { category_gender: name or "-" }

  function renderTable() {
    voteTable.innerHTML = '';

    // Header: Kategorie | Junge | Mädchen
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    const thCategory = document.createElement('th');
    thCategory.textContent = 'Kategorie';
    trHead.appendChild(thCategory);

    const thBoy = document.createElement('th');
    thBoy.textContent = 'Junge';
    trHead.appendChild(thBoy);

    const thGirl = document.createElement('th');
    thGirl.textContent = 'Mädchen';
    trHead.appendChild(thGirl);

    thead.appendChild(trHead);
    voteTable.appendChild(thead);

    // Body mit Kategorien
    const tbody = document.createElement('tbody');
    for (const cat of session.categories) {
      const tr = document.createElement('tr');

      const tdCat = document.createElement('td');
      tdCat.textContent = cat;
      tr.appendChild(tdCat);

      // Junge Feld
      const tdBoy = document.createElement('td');
      tdBoy.classList.add('clickable');
      tdBoy.dataset.category = cat;
      tdBoy.dataset.gender = 'm';
      tdBoy.textContent = userVotes[cat + '_m'] || '-';
      tdBoy.addEventListener('click', () => {
        openNamesList(cat, 'm', tdBoy);
      });
      tr.appendChild(tdBoy);

      // Mädchen Feld
      const tdGirl = document.createElement('td');
      tdGirl.classList.add('clickable');
      tdGirl.dataset.category = cat;
      tdGirl.dataset.gender = 'w';
      tdGirl.textContent = userVotes[cat + '_w'] || '-';
      tdGirl.addEventListener('click', () => {
        openNamesList(cat, 'w', tdGirl);
      });
      tr.appendChild(tdGirl);

      tbody.appendChild(tr);
    }
    voteTable.appendChild(tbody);
  }

  function openNamesList(category, gender, cell) {
    currentCategory = category;
    selectedGender = gender;
    namesList.innerHTML = '';

    // Option Enthalten ("-")
    const enthaltnBtn = document.createElement('button');
    enthaltnBtn.textContent = '- (Enthalten)';
    enthaltnBtn.style.marginRight = '10px';
    enthaltnBtn.addEventListener('click', () => {
      userVotes[category + '_' + gender] = '-';
      cell.textContent = '-';
      namesList.innerHTML = '';
      checkSubmitEnabled();
    });
    namesList.appendChild(enthaltnBtn);

    // Alle Schüler des gewählten Geschlechts anzeigen
    const filteredStudents = session.students.filter(s => s.gender === gender);
    filteredStudents.forEach(s => {
      const btn = document.createElement('button');
      btn.textContent = s.name;
      btn.style.marginRight = '10px';
      btn.style.marginTop = '5px';
      btn.addEventListener('click', () => {
        userVotes[category + '_' + gender] = s.name;
        cell.textContent = s.name;
        namesList.innerHTML = '';
        checkSubmitEnabled();
      });
      namesList.appendChild(btn);
    });
  }

  function checkSubmitEnabled() {
    // Alle Kategorien und Geschlechter müssen eine Auswahl haben (auch "-")
    for (const cat of session.categories) {
      if (!(cat + '_m' in userVotes)) return disableSubmit();
      if (!(cat + '_w' in userVotes)) return disableSubmit();
    }
    enableSubmit();
  }
  function enableSubmit() {
    submitBtn.disabled = false;
  }
  function disableSubmit() {
    submitBtn.disabled = true;
  }

  function loadSession(code) {
    const raw = localStorage.getItem('session_' + code);
    if (!raw) {
      alert('Ungültiger Code oder Session nicht gefunden.');
      return null;
    }
    const data = JSON.parse(raw);
    return data;
  }

  function generateUserId() {
    return 'u_' + Math.random().toString(36).substring(2, 10);
  }

  function loadVoting() {
    const code = codeInput.value.trim().toUpperCase();
    if (!code) {
      alert('Bitte Code eingeben.');
      return;
    }

    const data = loadSession(code);
    if (!data) return;

    // Prüfen, ob User schon abgestimmt hat
    if (data.submittedUsers && Object.values(data.submittedUsers).includes(userId)) {
      alert('Du hast bereits abgestimmt. Danke!');
      return;
    }

    sessionCode = code;
    session = data;
    userId = generateUserId();

    userVotes = {};

    // Wenn der User schon Stimmen hatte (reload), laden wir sie (optional)
    if (session.votes && session.votes[userId]) {
      userVotes = session.votes[userId];
    }

    voteContainer.style.display = 'block';
    document.getElementById('codeEntry').style.display = 'none';
    thankYou.style.display = 'none';

    renderTable();
    disableSubmit();
  }

  submitBtn.addEventListener('click', () => {
    // Prüfen, ob alle ausgefüllt
    for (const cat of session.categories) {
      if (!(cat + '_m' in userVotes)) {
        alert('Bitte alle Felder ausfüllen.');
        return;
      }
      if (!(cat + '_w' in userVotes)) {
        alert('Bitte alle Felder ausfüllen.');
        return;
      }
    }

    // Speichern der Stimmen
    if (!session.votes) session.votes = {};
    session.votes[userId] = userVotes;

    if (!session.submittedUsers) session.submittedUsers = {};
    session.submittedUsers[userId] = true;

    // Zähler der abgegebenen Stimmen
    if (!session.voters) session.voters = [];
    if (!session.voters.includes(userId)) session.voters.push(userId);

    localStorage.setItem('session_' + sessionCode, JSON.stringify(session));

    voteContainer.style.display = 'none';
    thankYou.style.display = 'block';
  });

  startVoteBtn.addEventListener('click', loadVoting);
}


// Ergebnis-Seite (result.html)

if (document.getElementById('loadBtn')) {
  const loadBtn = document.getElementById('loadBtn');
  const codeInput = document.getElementById('codeInput');
  const resultsContainer = document.getElementById('resultsContainer');
  const winnersDiv = document.getElementById('winners');
  const votersCountSpan = document.getElementById('votersCount');
  const deadlineInfo = document.getElementById('deadlineInfo');

  function loadSession(code) {
    const raw = localStorage.getItem('session_' + code);
    if (!raw) {
      alert('Ungültiger Code oder Session nicht gefunden.');
      return null;
    }
    const data = JSON.parse(raw);
    return data;
  }

  function displayResults(session) {
    winnersDiv.innerHTML = '';
    votersCountSpan.textContent = session.voters ? session.voters.length : 0;
    deadlineInfo.textContent = 'Deadline: ' + session.deadline;

    // Prüfen ob Deadline erreicht oder überschritten
    const now = new Date();
    const deadlineDate = new Date(session.deadline);
    if (now < deadlineDate) {
      winnersDiv.textContent = 'Ergebnisse sind erst nach Ablauf der Deadline sichtbar.';
      return;
    }

    // Ergebnisse auswerten: pro Kategorie & Geschlecht Gewinner mit max Stimmen
    // Stimmen zusammenzählen
    const tally = {}; 
    // Struktur: tally[category_gender][name] = count

    if (!session.votes) {
      winnersDiv.textContent = 'Noch keine Stimmen abgegeben.';
      return;
    }

    for (const voteKey in session.votes) {
      const vote = session.votes[voteKey];
      for (const catGen in vote) {
        const name = vote[catGen];
        if (name === '-') continue; // Enthaltung zählt nicht
        if (!tally[catGen]) tally[catGen] = {};
        if (!tally[catGen][name]) tally[catGen][name] = 0;
        tally[catGen][name]++;
      }
    }

    // Tabelle erstellen
    const table = document.createElement('table');
    table.classList.add('result-table');

    // Kopfzeile: Kategorie | Junge Gewinner | Stimmen | Mädchen Gewinner | Stimmen
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Kategorie', 'Junge Gewinner', 'Stimmen', 'Mädchen Gewinner', 'Stimmen'].forEach(txt => {
      const th = document.createElement('th');
      th.textContent = txt;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    session.categories.forEach(cat => {
      const tr = document.createElement('tr');

      const tdCat = document.createElement('td');
      tdCat.textContent = cat;
      tr.appendChild(tdCat);

      // Junge Gewinner
      const catBoyKey = cat + '_m';
      let maxVotesBoy = 0;
      let winnersBoy = [];
      if (tally[catBoyKey]) {
        maxVotesBoy = Math.max(...Object.values(tally[catBoyKey]));
        winnersBoy = Object.entries(tally[catBoyKey])
          .filter(([_, count]) => count === maxVotesBoy)
          .map(([name]) => name);
      }
      const tdBoyWinners = document.createElement('td');
      tdBoyWinners.textContent = winnersBoy.length > 0 ? winnersBoy.join(', ') : '-';
      tr.appendChild(tdBoyWinners);

      const tdBoyVotes = document.createElement('td');
      tdBoyVotes.textContent = maxVotesBoy > 0 ? maxVotesBoy : '-';
      tr.appendChild(tdBoyVotes);

      // Mädchen Gewinner
      const catGirlKey = cat + '_w';
      let maxVotesGirl = 0;
      let winnersGirl = [];
      if (tally[catGirlKey]) {
        maxVotesGirl = Math.max(...Object.values(tally[catGirlKey]));
        winnersGirl = Object.entries(tally[catGirlKey])
          .filter(([_, count]) => count === maxVotesGirl)
          .map(([name]) => name);
      }
      const tdGirlWinners = document.createElement('td');
      tdGirlWinners.textContent = winnersGirl.length > 0 ? winnersGirl.join(', ') : '-';
      tr.appendChild(tdGirlWinners);

      const tdGirlVotes = document.createElement('td');
      tdGirlVotes.textContent = maxVotesGirl > 0 ? maxVotesGirl : '-';
      tr.appendChild(tdGirlVotes);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    winnersDiv.appendChild(table);
  }

  loadBtn.addEventListener('click', () => {
    const code = codeInput.value.trim().toUpperCase();
    if (!code) {
      alert('Bitte Code eingeben.');
      return;
    }
    const session = loadSession(code);
    if (!session) return;
    displayResults(session);
  });
}
