// main.js

// Hilfsfunktionen
function generateCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// --- HOST Seite ---
if (document.getElementById('hostForm')) {
  const hostForm = document.getElementById('hostForm');
  const setSessionBtn = document.getElementById('setSession');
  const createTableBtn = document.getElementById('createTableLink');
  const generatedLinkP = document.getElementById('generatedLink');

  setSessionBtn.onclick = () => {
    // Validierung + speichern in sessionStorage
    const year = hostForm.year.value.trim();
    const className = hostForm.className.value.trim();
    const categories = hostForm.categories.value.trim();
    const studentsRaw = hostForm.students.value.trim();
    const deadline = hostForm.deadline.value;

    if (!year || !className || !categories || !studentsRaw || !deadline) {
      alert('Bitte alle Felder ausfüllen.');
      return;
    }

    // Schüler parsen
    let students = [];
    const lines = studentsRaw.split('\n').map(l => l.trim()).filter(l => l);
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length !== 2) {
        alert('Schülerformat falsch: ' + line);
        return;
      }
      const name = parts[0].trim();
      const gender = parts[1].trim().toLowerCase();
      if (!name || (gender !== 'm' && gender !== 'w')) {
        alert('Ungültiger Name oder Geschlecht: ' + line);
        return;
      }
      students.push({ name, gender });
    }

    // Kategorien parsen
    const categoriesArr = categories.split(',').map(c => c.trim()).filter(c => c);
    if (categoriesArr.length === 0) {
      alert('Bitte mindestens eine Kategorie angeben.');
      return;
    }

    // Deadline prüfen
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      alert('Ungültiges Datum.');
      return;
    }

    // Objekt speichern in sessionStorage
    const config = {
      year,
      className,
      categories: categoriesArr,
      students,
      deadline
    };

    sessionStorage.setItem('studentAwardsConfig', JSON.stringify(config));
    alert('Einstellungen gespeichert.');

    createTableBtn.disabled = false;
    generatedLinkP.textContent = '';
  };

  createTableBtn.onclick = () => {
    // Laden aus sessionStorage
    const configRaw = sessionStorage.getItem('studentAwardsConfig');
    if (!configRaw) {
      alert('Bitte zuerst Einstellungen speichern.');
      return;
    }
    const config = JSON.parse(configRaw);

    // Code generieren
    let code;
    do {
      code = generateCode();
    } while (localStorage.getItem('studentAwards-' + code)); // sicherstellen, dass Code noch nicht existiert

    // Setup Abstimmungsdaten: 
    // Für jede Kategorie & Geschlecht -> null (Enthaltung)
    // Speichern im localStorage unter 'studentAwards-<code>'
    // Außerdem speichern: config + votes: [] (Array von Stimmen), votersUsed: [] (Codes, um 2x Abstimmen zu verhindern)

    const votesTemplate = {};
    for (const category of config.categories) {
      votesTemplate[category] = { m: null, w: null };
    }

    const saveObj = {
      config,
      votes: [], // jede Stimme ist ein Objekt mit voteData (Kategorie->m/w->Name|null)
      votersUsed: [],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('studentAwards-' + code, JSON.stringify(saveObj));

    // Link zum Abstimmen erzeugen
    // Link = aktuelles origin + "/vote.html?code=" + code
    const baseUrl = window.location.origin + window.location.pathname.replace(/host\.html$/, '');
    const voteLink = `${baseUrl}vote.html?code=${code}`;

    generatedLinkP.innerHTML = `Link zum Abstimmen: <a href="${voteLink}" target="_blank">${voteLink}</a> <br> 5-stelliger Code: <strong>${code}</strong>`;
  };
}

// --- VOTE Seite ---
if (document.getElementById('voteTable')) {
  const codeInput = document.getElementById('codeInput');
  const loadBtn = document.getElementById('loadBtn');
  const voteTable = document.getElementById('voteTable');
  const votingArea = document.getElementById('votingArea');
  const submitVote = document.getElementById('submitVote');
  const thankYou = document.getElementById('thankYou');
  const tabBoy = document.getElementById('tabBoy');
  const tabGirl = document.getElementById('tabGirl');

  let currentData = null;
  let currentCode = null;
  let currentGender = 'm'; // m = Junge, w = Mädchen
  let selections = {}; // Kategorie -> Name | null (Enthaltung)

  function resetSelections() {
    selections = {};
    if (!currentData) return;
    for (const cat of currentData.config.categories) {
      selections[cat] = null;
    }
  }

  function renderTable() {
    if (!currentData) return;

    voteTable.innerHTML = '';
    const header = document.createElement('tr');
    const thCategory = document.createElement('th');
    thCategory.textContent = 'Kategorie';
    header.appendChild(thCategory);

    const thSelection = document.createElement('th');
    thSelection.textContent = currentGender === 'm' ? 'Junge' : 'Mädchen';
    header.appendChild(thSelection);
    voteTable.appendChild(header);

    for (const category of currentData.config.categories) {
      const tr = document.createElement('tr');
      const tdCat = document.createElement('td');
      tdCat.textContent = category;
      tr.appendChild(tdCat);

      const tdSelect = document.createElement('td');
      const selectBtn = document.createElement('button');
      selectBtn.textContent = selections[category] || '- (Enthaltung)';
      selectBtn.onclick = () => {
        openSelectionPopup(category);
      };
      tdSelect.appendChild(selectBtn);
      tr.appendChild(tdSelect);

      voteTable.appendChild(tr);
    }
  }

  function openSelectionPopup(category) {
    if (!currentData) return;
    const students = currentData.config.students.filter(s => s.gender === currentGender);
    const popup = document.createElement('div');
    popup.className = 'popup';

    const title = document.createElement('h3');
    title.textContent = `Wähle für Kategorie "${category}" (${currentGender === 'm' ? 'Junge' : 'Mädchen'})`;
    popup.appendChild(title);

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = 0;

    for (const student of students) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = student.name;
      btn.onclick = () => {
        selections[category] = student.name;
        document.body.removeChild(popup);
        renderTable();
      };
      li.appendChild(btn);
      list.appendChild(li);
    }
    // Enthaltung
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = '- (Enthaltung)';
    btn.onclick = () => {
      selections[category] = null;
      document.body.removeChild(popup);
      renderTable();
    };
    li.appendChild(btn);
    list.appendChild(li);

    popup.appendChild(list);

    // Close on click outside
    popup.onclick = (e) => {
      if (e.target === popup) {
        document.body.removeChild(popup);
      }
    };

    Object.assign(popup.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      border: '2px solid black',
      padding: '1rem',
      zIndex: 1000,
      maxHeight: '80vh',
      overflowY: 'auto',
    });

    document.body.appendChild(popup);
  }

  function validateAllSelected() {
    if (!currentData) return false;
    for (const category of currentData.config.categories) {
      if (!(category in selections)) return false;
    }
    return true;
  }

  loadBtn.onclick = () => {
    const code = codeInput.value.trim();
    if (code.length !== 5) {
      alert('Bitte gültigen 5-stelligen Code eingeben.');
      return;
    }
    const dataRaw = localStorage.getItem('studentAwards-' + code);
    if (!dataRaw) {
      alert('Code nicht gefunden.');
      return;
    }
    currentData = JSON.parse(dataRaw);
    currentCode = code;

    // Prüfen ob Deadline schon abgelaufen
    const deadlineDate = new Date(currentData.config.deadline);
    const now = new Date();
    if (now > deadlineDate) {
      alert('Deadline ist bereits abgelaufen. Abstimmung nicht mehr möglich.');
      return;
    }

    // Prüfen ob schon abgestimmt wurde (für diese Seite: prüfen anhand code im sessionStorage)
    const votedCodes = JSON.parse(sessionStorage.getItem('studentAwards-votedCodes') || '[]');
    if (votedCodes.includes(code)) {
      alert('Du hast bereits abgestimmt.');
      return;
    }

    resetSelections();
    votingArea.style.display = 'block';
    thankYou.style.display = 'none';
    renderTable();
  };

  tabBoy.onclick = () => {
    currentGender = 'm';
    tabBoy.classList.add('active');
    tabGirl.classList.remove('active');
    renderTable();
  };

  tabGirl.onclick = () => {
    currentGender = 'w';
    tabGirl.classList.add('active');
    tabBoy.classList.remove('active');
    renderTable();
  };

  submitVote.onclick = () => {
    if (!validateAllSelected()) {
      alert('Bitte in allen Kategorien eine Auswahl treffen oder Enthaltung wählen.');
      return;
    }
    // Speichern der Stimme
    // Für Gleichzeitigkeit einfach votes.push({ selections }) an votes Array
    const dataRaw = localStorage.getItem('studentAwards-' + currentCode);
    if (!dataRaw) {
      alert('Daten nicht gefunden.');
      return;
    }
    const dataObj = JSON.parse(dataRaw);

    // Prüfen ob Code schon abgestimmt hat
    if (dataObj.votersUsed.includes(currentCode)) {
      alert('Du hast bereits abgestimmt.');
      return;
    }

    dataObj.votes.push({ selections });
    dataObj.votersUsed.push(currentCode);
    localStorage.setItem('studentAwards-' + currentCode, JSON.stringify(dataObj));

    // Session merken, dass Code abgestimmt hat
    const votedCodes = JSON.parse(sessionStorage.getItem('studentAwards-votedCodes') || '[]');
    votedCodes.push(currentCode);
    sessionStorage.setItem('studentAwards-votedCodes', JSON.stringify(votedCodes));

    votingArea.style.display = 'none';
    thankYou.style.display = 'block';
    thankYou.textContent = 'Vielen Dank für deine Abstimmung!';

  };
}

// --- RESULTS Seite ---
if (document.querySelector('body') && document.getElementById('votersCount')) {
  const codeInput = document.getElementById('codeInput');
  const loadBtn = document.getElementById('loadBtn');
  const votersCount = document.getElementById('votersCount');
  const deadlineInfo = document.getElementById('deadlineInfo');
  const winnersDiv = document.getElementById('winners');

  loadBtn.onclick = () => {
    const code = codeInput.value.trim();
    if (code.length !== 5) {
      alert('Bitte gültigen 5-stelligen Code eingeben.');
      return;
    }
    const dataRaw = localStorage.getItem('studentAwards-' + code);
    if (!dataRaw) {
      alert('Code nicht gefunden.');
      return;
    }
    const dataObj = JSON.parse(dataRaw);

    const deadlineDate = new Date(dataObj.config.deadline);
    const now = new Date();

    if (now < deadlineDate) {
      alert(`Deadline ist noch nicht erreicht (erst am ${dataObj.config.deadline}).`);
      return;
    }

    // Zeige Anzahl Abstimmende (Zähler)
    votersCount.textContent = dataObj.votes.length;

    // Zeige Deadline
    deadlineInfo.textContent = `Deadline war am: ${dataObj.config.deadline}`;

    // Ergebnisse auswerten
    // Struktur: Kategorie -> Geschlecht -> Kandidat -> Stimmenanzahl
    const results = {};
    for (const category of dataObj.config.categories) {
      results[category] = { m: {}, w: {} };
    }

    for (const vote of dataObj.votes) {
      for (const category of dataObj.config.categories) {
        const nameM = vote.selections[category];
        if (nameM && dataObj.config.students.some(s => s.name === nameM && s.gender === 'm')) {
          results[category].m[nameM] = (results[category].m[nameM] || 0) + 1;
        }
        if (nameM && dataObj.config.students.some(s => s.name === nameM && s.gender === 'w')) {
          results[category].w[nameM] = (results[category].w[nameM] || 0) + 1;
        }
      }
    }

    // Gewinner ermitteln per Kategorie & Geschlecht
    winnersDiv.innerHTML = '';

    // --- Fortsetzung RESULTS Seite ---

    for (const category of dataObj.config.categories) {
      const catDiv = document.createElement('div');
      catDiv.style.marginBottom = '1rem';

      const catTitle = document.createElement('h3');
      catTitle.textContent = `Kategorie: ${category}`;
      catDiv.appendChild(catTitle);

      // Für Jungen (m)
      const mResults = results[category].m;
      const mEntries = Object.entries(mResults);
      if (mEntries.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'Keine Stimmen für Jungen.';
        catDiv.appendChild(p);
      } else {
        // Max Stimmen finden
        let maxVotesM = Math.max(...mEntries.map(([_, count]) => count));
        const winnersM = mEntries.filter(([_, count]) => count === maxVotesM).map(([name]) => name);

        const pM = document.createElement('p');
        pM.innerHTML = `<strong>Jungen Gewinner:</strong> ${winnersM.join(', ')} (${maxVotesM} Stimme${maxVotesM > 1 ? 'n' : ''})`;
        catDiv.appendChild(pM);
      }

      // Für Mädchen (w)
      const wResults = results[category].w;
      const wEntries = Object.entries(wResults);
      if (wEntries.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'Keine Stimmen für Mädchen.';
        catDiv.appendChild(p);
      } else {
        // Max Stimmen finden
        let maxVotesW = Math.max(...wEntries.map(([_, count]) => count));
        const winnersW = wEntries.filter(([_, count]) => count === maxVotesW).map(([name]) => name);

        const pW = document.createElement('p');
        pW.innerHTML = `<strong>Mädchen Gewinner:</strong> ${winnersW.join(', ')} (${maxVotesW} Stimme${maxVotesW > 1 ? 'n' : ''})`;
        catDiv.appendChild(pW);
      }

      winnersDiv.appendChild(catDiv);
    }
  };
}
