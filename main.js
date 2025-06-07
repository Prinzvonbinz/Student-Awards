// --- Globale Variablen ---
const hostDiv = document.getElementById('hostDiv');
const voteDiv = document.getElementById('voteDiv');
const codeInput = document.getElementById('codeInput');
const loginBtn = document.getElementById('loginBtn');
const loginMessage = document.getElementById('loginMessage');
const categoriesContainer = document.getElementById('categoriesContainer');
const voteForm = document.getElementById('voteForm');
const voteMessage = document.getElementById('voteMessage');
const generateBtn = document.getElementById('generateBtn');
const linkOutput = document.getElementById('linkOutput');
const codeOutput = document.getElementById('codeOutput');

let categoriesData = null;
let sessionCode = null;
let votesSubmitted = false;

// --- HOST-SEITE (index.html) ---
if (hostDiv) {
  generateBtn.addEventListener('click', () => {
    loginMessage.textContent = '';
    voteMessage.textContent = '';
    linkOutput.textContent = '';
    codeOutput.textContent = '';

    // Kategorien aus Textarea auslesen & parsen
    const rawText = document.getElementById('categoriesInput').value.trim();
    if (!rawText) {
      loginMessage.textContent = 'Bitte Kategorien eingeben.';
      return;
    }

    try {
      // Erwarte JSON-Format: { Kategorie1: { Jungs: [], Mädchen: [] }, Kategorie2: { Jungs: [], Mädchen: [] } ... }
      const parsed = JSON.parse(rawText);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Ungültiges Format.');
      }

      // Überprüfe jede Kategorie und die Jungs/Mädchen Arrays
      for (const cat in parsed) {
        if (!parsed[cat].Jungs || !parsed[cat].Mädchen) {
          throw new Error(`Kategorie "${cat}" fehlt Jungs oder Mädchen Arrays.`);
        }
        if (!Array.isArray(parsed[cat].Jungs) || !Array.isArray(parsed[cat].Mädchen)) {
          throw new Error(`Kategorie "${cat}": Jungs und Mädchen müssen Arrays sein.`);
        }
      }
      categoriesData = parsed;
    } catch (e) {
      loginMessage.textContent = 'Fehler beim Parsen der Kategorien: ' + e.message;
      return;
    }

    // Generiere Code (6-stellig, alphanumerisch)
    sessionCode = generateCode(6);

    // Speichere Daten lokal unter dem Code (im localStorage)
    localStorage.setItem('studentAwards_' + sessionCode, JSON.stringify(categoriesData));

    // Erzeuge Link mit Parameter ?code=SESSIONCODE
    const baseUrl = window.location.href.split('?')[0].replace('index.html', 'vote.html');
    const fullLink = `${baseUrl}?code=${sessionCode}`;

    linkOutput.textContent = fullLink;
    codeOutput.textContent = sessionCode;
  });
}

// --- TEILNEHMER-SEITE (vote.html) ---
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    loginMessage.textContent = '';
    voteMessage.textContent = '';
    const code = codeInput.value.trim();
    if (!code) {
      loginMessage.textContent = 'Bitte Code eingeben.';
      return;
    }

    const stored = localStorage.getItem('studentAwards_' + code);
    if (!stored) {
      loginMessage.textContent = 'Ungültiger Code oder keine Daten gefunden.';
      return;
    }

    categoriesData = JSON.parse(stored);
    sessionCode = code;

    // Zeige Abstimmungsformular
    loginMessage.textContent = '';
    document.getElementById('loginDiv').style.display = 'none';
    voteDiv.style.display = 'block';

    buildVoteForm(categoriesData);
  });
}

// --- Hilfsfunktion: Code generieren ---
function generateCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i=0; i<length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- Abstimmungsformular aufbauen ---
function buildVoteForm(categories) {
  categoriesContainer.innerHTML = '';
  for (const category in categories) {
    const catDiv = document.createElement('div');
    catDiv.classList.add('category-group');

    const label = document.createElement('div');
    label.className = 'category-label';
    label.textContent = category;
    catDiv.appendChild(label);

    // Jungs Eingabe
    const boysDiv = document.createElement('div');
    boysDiv.className = 'gender-inputs';

    const boyLabel = document.createElement('label');
    boyLabel.textContent = 'Junge Name:';
    const boyInput = document.createElement('input');
    boyInput.type = 'text';
    boyInput.name = `boy_${category}`;
    boyInput.placeholder = categories[category].Jungs.join(', ');

    boysDiv.appendChild(boyLabel);
    boysDiv.appendChild(boyInput);
    catDiv.appendChild(boysDiv);

    // Mädchen Eingabe
    const girlsDiv = document.createElement('div');
    girlsDiv.className = 'gender-inputs';

    const girlLabel = document.createElement('label');
    girlLabel.textContent = 'Mädchen Name:';
    const girlInput = document.createElement('input');
    girlInput.type = 'text';
    girlInput.name = `girl_${category}`;
    girlInput.placeholder = categories[category].Mädchen.join(', ');

    girlsDiv.appendChild(girlLabel);
    girlsDiv.appendChild(girlInput);
    catDiv.appendChild(girlsDiv);

    categoriesContainer.appendChild(catDiv);
  }
}

// --- Abstimmungsformular absenden ---
if (voteForm) {
  voteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (votesSubmitted) {
      voteMessage.textContent = 'Du hast bereits abgestimmt.';
      return;
    }
    voteMessage.textContent = '';

    const formData = new FormData(voteForm);
    const results = {};

    // Validierung der Eingaben gegen KategorienData
    for (const category in categoriesData) {
      const boyName = formData.get(`boy_${category}`)?.trim();
      const girlName = formData.get(`girl_${category}`)?.trim();

      if (!boyName || !girlName) {
        voteMessage.style.color = 'red';
        voteMessage.textContent = `Bitte für Kategorie "${category}" beide Namen eingeben.`;
        return;
      }

      // Überprüfung: Namen müssen in der ursprünglichen Liste enthalten sein (Groß-/Kleinschreibung ignorieren)
      if (!categoriesData[category].Jungs.some(n => n.toLowerCase() === boyName.toLowerCase())) {
        voteMessage.style.color = 'red';
        voteMessage.textContent = `Jungenname "${boyName}" ist für Kategorie "${category}" ungültig.`;
        return;
      }
      if (!categoriesData[category].Mädchen.some(n => n.toLowerCase() === girlName.toLowerCase())) {
        voteMessage.style.color = 'red';
        voteMessage.textContent = `Mädchennamen "${girlName}" ist für Kategorie "${category}" ungültig.`;
        return;
      }

      results[category] = { Junge: boyName, Mädchen: girlName };
    }

    // Hier könnte man die Ergebnisse speichern, z.B. lokal oder an Server (nicht implementiert)
    votesSubmitted = true;
    voteMessage.style.color = 'green';
    voteMessage.textContent = 'Danke für deine Abstimmung!';

    // Optional Formular sperren
    voteForm.querySelectorAll('input, button').forEach(el => el.disabled = true);
  });
}
