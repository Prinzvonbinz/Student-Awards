// --- main.js ---

// DOM-Elemente
const yearInput = document.getElementById('year');
const classNameInput = document.getElementById('className');
const categoriesInput = document.getElementById('categories');
const studentsInput = document.getElementById('students');
const deadlineInput = document.getElementById('deadline');

const createTableBtn = document.getElementById('createTableBtn');
const resultSection = document.getElementById('result-section');
const participationLink = document.getElementById('participationLink');
const accessCodeElem = document.getElementById('accessCode');
const resetBtn = document.getElementById('resetBtn');

const resultsSection = document.getElementById('results-section');
const resultsContent = document.getElementById('resultsContent');

createTableBtn.addEventListener('click', () => {
  // Validierung
  const year = yearInput.value.trim();
  const className = classNameInput.value.trim();
  const categoriesRaw = categoriesInput.value.trim();
  const studentsRaw = studentsInput.value.trim();
  const deadline = deadlineInput.value;

  if (!year || !className || !categoriesRaw || !studentsRaw || !deadline) {
    alert('Bitte fülle alle Felder aus.');
    return;
  }

  // Kategorien parsen
  const categories = categoriesRaw.split(',').map(c => c.trim()).filter(c => c.length > 0);
  if (categories.length === 0) {
    alert('Bitte mindestens eine Kategorie angeben.');
    return;
  }

  // Schüler parsen
  const studentsLines = studentsRaw.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const students = [];
  for (const line of studentsLines) {
    const parts = line.split(',');
    if (parts.length !== 2) {
      alert('Schüler müssen im Format "Name,Geschlecht" (z.B. Max,m) pro Zeile stehen.');
      return;
    }
    const [name, gender] = parts.map(p => p.trim());
    if (!name || !['m','w'].includes(gender.toLowerCase())) {
      alert('Geschlecht muss "m" oder "w" sein.');
      return;
    }
    students.push({name, gender: gender.toLowerCase()});
  }
  if (students.length === 0) {
    alert('Bitte mindestens einen Schüler eingeben.');
    return;
  }

  // Abgabedatum prüfen (heute oder später)
  const now = new Date();
  const deadlineDate = new Date(deadline + 'T23:59:59');
  if (deadlineDate < now) {
    alert('Abgabedatum muss heute oder in der Zukunft liegen.');
    return;
  }

  // Zugangscode generieren
  const accessCode = generateAccessCode();

  // Daten speichern
  const hostData = {
    year,
    className,
    categories,
    students,
    deadline: deadlineDate.toISOString(),
    accessCode,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('student_awards_host', JSON.stringify(hostData));

  // Link generieren (vote.html + code als URL-Param)
  const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  const voteUrl = `${baseUrl}vote.html?code=${accessCode}`;

  // Anzeige
  participationLink.href = voteUrl;
  participationLink.textContent = voteUrl;
  accessCodeElem.textContent = accessCode;

  // Abschnitte umschalten
  document.getElementById('setup-section').style.display = 'none';
  resultSection.style.display = 'block';
  resultsSection.style.display = 'block';

  // Ergebnisse anzeigen, falls Deadline vorbei
  displayResults();
});

resetBtn.addEventListener('click', () => {
  localStorage.removeItem('student_awards_host');
  localStorage.removeItem('student_awards_votes');
  location.reload();
});

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function displayResults() {
  const hostDataStr = localStorage.getItem('student_awards_host');
  if (!hostDataStr) {
    resultsContent.textContent = 'Keine Daten gefunden.';
    return;
  }
  const hostData = JSON.parse(hostDataStr);
  const votesStr = localStorage.getItem('student_awards_votes');
  const votes = votesStr ? JSON.parse(votesStr) : [];

  const now = new Date();
  const deadline = new Date(hostData.deadline);
  if (now < deadline) {
    // Countdown anzeigen
    const diffMs = deadline - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    resultsContent.innerHTML = `<p>Ergebnisse sind ab dem <strong>${deadline.toLocaleDateString()}</strong> sichtbar.<br>
    Noch <strong>${diffDays}</strong> Tag(e) bis zur Bekanntgabe.</p>`;
    return;
  }

  // Auswertung
  if (votes.length === 0) {
    resultsContent.textContent = 'Es wurden noch keine Stimmen abgegeben.';
    return;
  }

  // Für jede Kategorie je Geschlecht stimmen zählen
  const results = {};
  for (const category of hostData.categories) {
    results[category] = { m: {}, w: {} };
  }

  for (const vote of votes) {
    for (const cat of hostData.categories) {
      if (vote[cat]) {
        // vote[cat] = {m: Name oder '-', w: Name oder '-'}
        const maleChoice = vote[cat].m;
        const femaleChoice = vote[cat].w;

        if (maleChoice && maleChoice !== '-') {
          results[cat].m[maleChoice] = (results[cat].m[maleChoice] || 0) + 1;
        }
        if (femaleChoice && femaleChoice !== '-') {
          results[cat].w[femaleChoice] = (results[cat].w[femaleChoice] || 0) + 1;
        }
      }
    }
  }

  // Gewinner pro Kategorie + Geschlecht ermitteln
  let html = '';
  for (const cat of hostData.categories) {
    html += `<h3>${cat}</h3>`;

    // Jungen
    let maxVotesM = 0;
    let winnerM = 'Keine Stimmen';
    for (const [name, count] of Object.entries(results[cat].m)) {
      if (count > maxVotesM) {
        maxVotesM = count;
        winnerM = name;
      }
    }
    html += `<p>Junge: <strong>${winnerM}</strong> (${maxVotesM} Stimme${maxVotesM === 1 ? '' : 'n'})</p>`;

    // Mädchen
    let maxVotesW = 0;
    let winnerW = 'Keine Stimmen';
    for (const [name, count] of Object.entries(results[cat].w)) {
      if (count > maxVotesW) {
        maxVotesW = count;
        winnerW = name;
      }
    }
    html += `<p>Mädchen: <strong>${winnerW}</strong> (${maxVotesW} Stimme${maxVotesW === 1 ? '' : 'n'})</p>`;
  }
  resultsContent.innerHTML = html;
}
