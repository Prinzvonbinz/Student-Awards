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

// Hilfsfunktion: 5-stelliger Zufallscode
function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Host Setup - Formular absenden
document.getElementById("hostSetupForm").addEventListener("submit", e => {
  e.preventDefault();

  // Werte aus Formular holen
  const year = parseInt(document.getElementById("year").value);
  const className = document.getElementById("className").value.trim();
  const categoriesRaw = document.getElementById("categories").value.trim();
  const studentsRaw = document.getElementById("students").value.trim();
  const endDate = document.getElementById("endDate").value;

  if (!year || !className || !categoriesRaw || !studentsRaw || !endDate) {
    alert("Bitte alle Felder ausfüllen.");
    return;
  }

  // Kategorien verarbeiten
  const categories = categoriesRaw.split(",").map(c => c.trim()).filter(c => c.length > 0);
  if (categories.length === 0) {
    alert("Bitte mindestens eine Kategorie angeben.");
    return;
  }

  // Schüler verarbeiten (Name, Geschlecht)
  const students = [];
  const lines = studentsRaw.split("\n");
  for (let line of lines) {
    const parts = line.split(",").map(s => s.trim());
    if (parts.length !== 2) {
      alert(`Ungültiges Format bei Schülerdaten: ${line}`);
      return;
    }
    const [name, gender] = parts;
    if (!name || !["m", "w"].includes(gender.toLowerCase())) {
      alert(`Ungültiger Name oder Geschlecht bei Schüler: ${line}`);
      return;
    }
    students.push({ name, gender: gender.toLowerCase() });
  }
  if (students.length === 0) {
    alert("Bitte mindestens einen Schüler angeben.");
    return;
  }

  // Code generieren
  const code = generateCode();

  // hostData befüllen
  hostData = {
    year,
    className,
    categories,
    students,
    deadline: endDate,
    code,
    votes: [],
  };

  // Daten im LocalStorage speichern
  localStorage.setItem("student_awards_host", JSON.stringify(hostData));

  // Link & Code anzeigen
  const link = `${window.location.origin}${window.location.pathname}?code=${code}`;

  document.getElementById("generatedLink").value = link;
  document.getElementById("accessCode").textContent = code;

  // Abschnitte anpassen
  document.getElementById("hostLinkSection").classList.remove("hidden");
  document.getElementById("hostSetupSection").classList.add("hidden");
  document.getElementById("participantLoginSection").classList.remove("hidden");
});

// Teilnehmer Login mit Link + Code
document.getElementById("participantLoginBtn").addEventListener("click", () => {
  const inputLink = document.getElementById("participantLink").value.trim();
  const inputCode = document.getElementById("participantCode").value.trim().toUpperCase();

  if (!inputLink || !inputCode) {
    document.getElementById("loginError").textContent = "Bitte Link und Code eingeben.";
    return;
  }

  const storedData = JSON.parse(localStorage.getItem("student_awards_host"));
  if (!storedData) {
    document.getElementById("loginError").textContent = "Keine Abstimmung vorhanden.";
    return;
  }

  // Code prüfen
  if (inputCode !== storedData.code) {
    document.getElementById("loginError").textContent = "Falscher Code.";
    return;
  }

  // Link prüfen (einfach: ob code param enthalten)
  try {
    const url = new URL(inputLink);
    const urlCode = url.searchParams.get("code");
    if (urlCode !== storedData.code) {
      document.getElementById("loginError").textContent = "Link-Code stimmt nicht mit dem Zugangscode überein.";
      return;
    }
  } catch {
    document.getElementById("loginError").textContent = "Ungültiger Link.";
    return;
  }

  // Alles ok, Abstimmungsformular anzeigen
  hostData = storedData;
  document.getElementById("loginError").textContent = "";
  document.getElementById("participantLoginSection").classList.add("hidden");

  showVotingForm();
});

// Abstimmungsformular erzeugen
function showVotingForm() {
  document.getElementById("votingTitle").textContent = `Student-Awards ${hostData.className} ${hostData.year}`;
  const container = document.getElementById("votingForm");
  container.innerHTML = "";

  hostData.categories.forEach(cat => {
    const div = document.createElement("div");
    div.className = "vote-category";

    div.innerHTML = `
      <h3>${cat}</h3>
      <label>Junge:</label>
      <input type="text" data-cat="${cat}" data-gen="m" placeholder="Name Junge" />
      <label>Mädchen:</label>
      <input type="text" data-cat="${cat}" data-gen="w" placeholder="Name Mädchen" />
    `;

    container.appendChild(div);
  });

  container.innerHTML += `<button onclick="submitVotes()">Abgeben</button>`;

  document.getElementById("votingSection").classList.remove("hidden");
}

// Stimmen absenden und prüfen
function submitVotes() {
  const inputs = document.querySelectorAll("#votingForm input");
  const votes = {};

  for (let input of inputs) {
    const cat = input.dataset.cat;
    const gen = input.dataset.gen;
    const name = input.value.trim();

    if (!votes[cat]) votes[cat] = {};

    if (!name) {
      alert("Bitte fülle alle Felder aus oder gib '-' ein.");
      return;
    }

    if (name !== "-" && !hostData.students.find(s => s.name === name && s.gender === gen)) {
      alert(`Name "${name}" passt nicht zur Kategorie (${cat}) und Geschlecht.`);
      return;
    }

    votes[cat][gen] = name;
  }

  hostData.votes.push(votes);
  localStorage.setItem("student_awards_host",
                       JSON.stringify(hostData));

  voteSubmitted = true;

  alert("Danke für deine Stimme!");

  document.getElementById("votingSection").classList.add("hidden");
  showWaitingSection();
}

// Warteschleife mit Countdown bis Ergebnis
function showWaitingSection() {
  document.getElementById("waitingSection").classList.remove("hidden");
  const endDate = new Date(hostData.deadline + "T23:59:59");
  document.getElementById("resultDateDisplay").textContent = endDate.toLocaleDateString();

  const countdownElem = document.getElementById("countdownTimer");

  const intervalId = setInterval(() => {
    const now = new Date();
    const diff = endDate - now;

    if (diff <= 0) {
      clearInterval(intervalId);
      countdownElem.textContent = "Jetzt!";
      showResults();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    countdownElem.textContent = `${days} Tage ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
}

// Ergebnisse auswerten & anzeigen
function showResults() {
  document.getElementById("waitingSection").classList.add("hidden");
  document.getElementById("resultsSection").classList.remove("hidden");

  // Stimmen sammeln
  const categoryResults = {};
  hostData.categories.forEach(cat => {
    categoryResults[cat] = { m: {}, w: {} };
  });

  hostData.votes.forEach(vote => {
    for (const cat in vote) {
      for (const gen of ["m", "w"]) {
        const name = vote[cat][gen];
        if (name && name !== "-") {
          if (!categoryResults[cat][gen][name]) categoryResults[cat][gen][name] = 0;
          categoryResults[cat][gen][name]++;
        }
      }
    }
  });

  const resultSection = document.getElementById("resultSection");
  resultSection.innerHTML = "";

  // Für jede Kategorie Gewinner ermitteln
  hostData.categories.forEach(cat => {
    const catDiv = document.createElement("div");
    catDiv.className = "result-category";

    catDiv.innerHTML = `<h3>${cat}</h3>`;

    ["m", "w"].forEach(gen => {
      const votes = categoryResults[cat][gen];
      let maxVotes = 0;
      let winners = [];

      for (const [name, count] of Object.entries(votes)) {
        if (count > maxVotes) {
          maxVotes = count;
          winners = [name];
        } else if (count === maxVotes) {
          winners.push(name);
        }
      }

      let winnerText;
      if (maxVotes === 0) {
        winnerText = "Keine Stimmen";
      } else if (winners.length === 1) {
        winnerText = `${winners[0]} (${maxVotes} Stimme${maxVotes > 1 ? "n" : ""})`;
      } else {
        winnerText = `Unentschieden: ${winners.join(", ")} (${maxVotes} Stimmen)`;
      }

      catDiv.innerHTML += `<p><strong>${gen === "m" ? "Junge" : "Mädchen"}:</strong> ${winnerText}</p>`;
    });

    resultSection.appendChild(catDiv);
  });
}

// Reset / Neu starten
document.getElementById("resetBtn").addEventListener("click", () => {
  localStorage.removeItem("student_awards_host");
  location.reload();
});

// Prüfe bei Laden, ob URL ?code= im Link und ggf. Teilnehmer-Login anzeigen
window.addEventListener("load", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  if (code) {
    // Code aus URL, Anzeige Teilnehmer-Login
    document.getElementById("hostSetupSection").classList.add("hidden");
    document.getElementById("hostLinkSection").classList.add("hidden");
    document.getElementById("participantLoginSection").classList.remove("hidden");
    document.getElementById("participantCode").value = code;
  }
});
