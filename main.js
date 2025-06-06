// --- Gemeinsame Funktionen ---

function randomCode(length = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for(let i=0; i<length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function saveHostData(data) {
  localStorage.setItem("voteData_" + data.code, JSON.stringify(data));
}

function loadHostData(code) {
  const raw = localStorage.getItem("voteData_" + code);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --- index.html (Host-Menü) ---
if (document.getElementById("createTableBtn")) {
  const btn = document.getElementById("createTableBtn");
  const classNameInput = document.getElementById("className");
  const categoriesInput = document.getElementById("categories");
  const studentsInput = document.getElementById("students");
  const deadlineInput = document.getElementById("deadline");
  const resultSection = document.getElementById("resultSection");

  btn.addEventListener("click", () => {
    resultSection.style.display = "none";
    resultSection.textContent = "";

    // Validierung
    if (!classNameInput.value.trim()) {
      alert("Bitte Klasse eingeben.");
      return;
    }
    const catsRaw = categoriesInput.value.trim();
    if (!catsRaw) {
      alert("Bitte mindestens eine Kategorie eingeben.");
      return;
    }
    const cats = catsRaw.split("\n").map(c => c.trim()).filter(c => c.length > 0);
    if (cats.length === 0) {
      alert("Bitte mindestens eine gültige Kategorie eingeben.");
      return;
    }

    const studentsRaw = studentsInput.value.trim();
    if (!studentsRaw) {
      alert("Bitte mindestens einen Schüler eingeben.");
      return;
    }
    const studentsLines = studentsRaw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const students = [];
    for (const line of studentsLines) {
      const parts = line.split(",");
      if (parts.length !== 2) {
        alert("Schülerliste muss Zeilen im Format: Name,Geschlecht (m/w) sein.");
        return;
      }
      const name = parts[0].trim();
      const gender = parts[1].trim().toLowerCase();
      if (!name || (gender !== "m" && gender !== "w")) {
        alert("Schülerliste: Ungültiger Eintrag '" + line + "'");
        return;
      }
      students.push({name, gender});
    }

    if (!deadlineInput.value) {
      alert("Bitte eine Deadline eingeben.");
      return;
    }
    const deadlineDate = new Date(deadlineInput.value);
    if (isNaN(deadlineDate.getTime())) {
      alert("Ungültiges Datum für die Deadline.");
      return;
    }

    // Code generieren und Daten speichern
    const code = randomCode();
    const data = {
      code,
      className: classNameInput.value.trim(),
      categories: cats,
      students: students,
      deadline: deadlineInput.value,
      votes: []
    };
    saveHostData(data);

    // Link und Code anzeigen
    const url = `${window.location.origin}/vote.html?code=${code}`;
    resultSection.style.display = "block";
    resultSection.innerHTML = `<strong>Link zum Teilen:</strong> <a href="${url}" target="_blank">${url}</a><br>
      <strong>Code:</strong> ${code}<br><br>
      Teile den Link oder den Code mit den Teilnehmern, damit sie abstimmen können.`;

    // Optional: Felder leer machen (wenn gewünscht)
    // classNameInput.value = "";
    // categoriesInput.value = "";
    // studentsInput.value = "";
    // deadlineInput.value = "";
  });
}

// --- vote.html (Teilnehmerseite) ---
if (document.getElementById("votingSection")) {
  // URL-Code auslesen
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  const codeError = document.getElementById("codeError");
  const votingSection = document.getElementById("votingSection");
  const votingForm = document.getElementById("votingForm");
  const submitVotesBtn = document.getElementById("submitVotesBtn");
  const voteMessage = document.getElementById("voteMessage");
  const waitingSection = document.getElementById("waitingSection");
  const resultsSection = document.getElementById("resultsSection");
  const resultDateDisplay = document.getElementById("resultDateDisplay");
  const countdownTimer = document.getElementById("countdownTimer");
  const resultSection = document.getElementById("resultSection");

  if (!code) {
    codeError.style.display = "block";
    codeError.textContent = "Kein Zugangscode in der URL gefunden.";
  } else {
    // Daten laden
    const data = loadHostData(code);
    if (!data) {
      codeError.style.display = "block";
      codeError.textContent = "Ungültiger oder abgelaufener Code.";
    } else {
      codeError.style.display = "none";

      // Deadline prüfen
      const now = new Date();
      const deadline = new Date(data.deadline);
      resultDateDisplay.textContent = deadline.toLocaleDateString();

      // Zeigt Countdown bis Deadline
      function updateCountdown() {
        const diff = deadline - new Date();
        if (diff <= 0) {
          countdownTimer.textContent = "Abstimmungsfrist beendet.";
          clearInterval(timerInterval);
          showResults();
        } else {
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const m = Math.floor((diff / (1000 * 60)) % 60);
          const s = Math.floor((diff / 1000) % 60);
          countdownTimer.textContent = `${d} Tage ${h}h ${m}m ${s}s`;
        }
      }

      // Stimmen speichern + prüfen
      function isValidName(name, gender) {
        return data.students.some(s => s.name.toLowerCase() === name.toLowerCase() && s.gender === gender);
      }

      // Voting-Formular aufbauen
      function buildForm() {
        votingForm.innerHTML = "";
        data.categories.forEach(cat => {
          const catDiv = document.createElement("div");
          catDiv.style.marginBottom = "15px";

          const title = document.createElement("h3");
          title.textContent = cat;
          catDiv.appendChild(title);

          // Jungen-Input
          const boyLabel = document.createElement("label");
          boyLabel.textContent = "Junge Name:";
          boyLabel.htmlFor = `boy_${cat}`;
          catDiv.appendChild(boyLabel);

          const boyInput = document.createElement("input");
          boyInput.type = "text";
          boyInput.id = `boy_${cat}`;
          boyInput.name = `boy_${cat}`;
          boyInput.placeholder = "Name eines Jungen eingeben";
          catDiv.appendChild(boyInput);

          // Mädchen-Input
          const girlLabel = document.createElement("label");
          girlLabel.textContent = "Mädchen Name:";
          girlLabel.htmlFor = `girl_${cat}`;
          catDiv.appendChild(girlLabel);

          const girlInput = document.createElement("input");
          girlInput.type = "text";
          girlInput.id = `girl_${cat}`;
          girlInput.name = `girl_${cat}`;
          girlInput.placeholder = "Name eines Mädchens eingeben";
          catDiv.appendChild(girlInput);

          votingForm.appendChild(catDiv);
        });
      }

      // Stimmen prüfen und speichern
      function submitVotes() {
        voteMessage.textContent = "";

        const votes = [];
        for (const cat of data.categories) {
          const boyVal = document.getElementById(`boy_${cat}`).value.trim();
          const girlVal = document.getElementById(`girl_${cat}`).value.trim();

          // Namen prüfen (leer erlaubt, sonst valide und Geschlecht muss stimmen)
          if (boyVal && !isValidName(boyVal, "m")) {
            voteMessage.textContent = `Ungültiger Junge-Name für Kategorie "${cat}": ${boyVal}`;
            return;
          }
          if (girlVal && !isValidName(girlVal, "w")) {
            voteMessage.textContent = `Ungültiger Mädchen-Name für Kategorie "${cat}": ${girlVal}`;
            return;
          }

          votes.push({
            category: cat,
            boy: boyVal || null,
            girl: girlVal || null,
          });
        }

        // Stimmen speichern
        let existingVotes = JSON.parse(localStorage.getItem(`votes_${code}`)) || [];
        // Teilnehmer-Mehrfachstimmen nicht überprüft hier, könnte man erweitern
        existingVotes.push(votes);
        localStorage.setItem(`votes_${code}`, JSON.stringify(existingVotes));

        // Danke anzeigen + Formular verstecken
        votingSection.style.display = "none";
        waitingSection.style.display = "block";

        updateCountdown();
        timerInterval = setInterval(updateCountdown, 1000);
      }

      // Ergebnisse anzeigen (nach Deadline)
      function showResults() {
        waitingSection.style.display = "none";
        resultsSection.style.display = "block";

        const allVotes = JSON.parse(localStorage.getItem(`votes_${code}`)) || [];

        if (allVotes.length === 0) {
          resultSection.textContent = "Keine Stimmen abgegeben.";
          return;
        }

        // Für jede Kategorie die Häufigkeit der Namen zählen (für Jungen und Mädchen getrennt)
        const results = {};
        for (const cat of data.categories) {
          results[cat] = { boys: {}, girls: {} };
        }

        for (const voteSet of allVotes) {
          for (const vote of voteSet) {
            if (vote.boy) {
              const b = vote.boy.toLowerCase();
              results[vote.category].boys[b] = (results[vote.category].boys[b] || 0) + 1;
            }
            if (vote.girl) {
              const g = vote.girl.toLowerCase();
              results[vote.category].girls[g] = (results[vote.category].girls[g] || 0) + 1;
            }
          }
        }

        // Tabelle aufbauen
        let html = `<table><thead><tr><th>Kategorie</th><th>Jungen</th><th>Stimmen</th><th>Mädchen</th><th>Stimmen</th></tr></thead><tbody>`;
        for (const cat of data.categories) {
          // Bestimmen der meistgewählten Jungen- und Mädchennamen
          const boys = results[cat].boys;
          const girls = results[cat].girls;

          function getTopName(obj) {
            let maxCount = 0, maxName = "-";
            for (const name in obj) {
              if (obj[name] > maxCount) {
                maxCount = obj[name];
                maxName = name;
              }
            }
            return {name: maxName, count: maxCount};
          }

          const topBoy = getTopName(boys);
          const topGirl = getTopName(girls);

          html += `<tr>
            <td>${cat}</td>
            <td>${topBoy.name !== "-" ? capitalize(topBoy.name) : "-"}</td>
            <td>${topBoy.count || 0}</td>
            <td>${topGirl.name !== "-" ? capitalize(topGirl.name) : "-"}</td>
            <td>${topGirl.count || 0}</td>
          </tr>`;
        }
        html += "</tbody></table>";
        resultSection.innerHTML = html;
      }

      // Hilfsfunktion Großschreibung
      function capitalize(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
      }

      buildForm();

      // Prüfen ob Deadline schon vorbei
      if (now >= deadline) {
        showResults();
      } else {
        votingSection.style.display = "block";
        waitingSection.style.display = "none";
        resultsSection.style.display = "none";
        var timerInterval = setInterval(updateCountdown, 1000);

        submitVotesBtn.addEventListener("click", e => {
          e.preventDefault();
          submitVotes();
        });
      }
    }
  }
}
