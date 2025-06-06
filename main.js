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

// Event Listener für Host Setup Formular (wichtig!)
document.getElementById("hostSetupForm").addEventListener("submit", function(event) {
  event.preventDefault(); // Verhindert Seiten-Neuladen

  const year = document.getElementById("year").value.trim();
  const className = document.getElementById("className").value.trim();
  const categoriesRaw = document.getElementById("categories").value.trim();
  const studentsRaw = document.getElementById("students").value.trim();
  const deadline = document.getElementById("endDate").value;

  if (!year || !className || !categoriesRaw || !studentsRaw || !deadline) {
    alert("Bitte alle Felder ausfüllen.");
    return;
  }

  const categories = categoriesRaw.split(",").map(s => s.trim()).filter(s => s.length > 0);

  const students = studentsRaw.split("\n").map(line => {
    const parts = line.split(",").map(p => p.trim());
    if (parts.length !== 2) return null;
    return { name: parts[0], gender: parts[1].toLowerCase() };
  }).filter(s => s !== null);

  if (students.length === 0 || categories.length === 0) {
    alert("Bitte gültige Kategorien und Schüler eingeben.");
    return;
  }

  hostData.year = year;
  hostData.className = className;
  hostData.categories = categories;
  hostData.students = students;
  hostData.deadline = deadline;

  // 5-stelliger Zugangscode (A-Z + 0-9)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  hostData.code = code;

  // Speichern
  localStorage.setItem("student_awards_host", JSON.stringify(hostData));

  // Link bauen (aktuelle URL + ?code=XXXXX)
  const baseUrl = window.location.origin + window.location.pathname;
  const link = `${baseUrl}?code=${code}`;

  // Link und Code anzeigen
  document.getElementById("generatedLink").value = link;
  document.getElementById("accessCode").textContent = code;
  document.getElementById("hostLinkSection").classList.remove("hidden");

  alert("Tabelle wurde erstellt! Teile den Link und Code mit deinen Mitschülern.");
});

function generateVotingForm() {
  const container = document.getElementById("votingForm");
  container.innerHTML = `<h2>Student-Awards ${hostData.className} ${hostData.year}</h2>`;

  hostData.categories.forEach(cat => {
    const div = document.createElement("div");
    div.className = "vote-category";

    div.innerHTML = `
      <h3>${cat}</h3>
      <label>Junge:</label>
      <input type="text" data-cat="${cat}" data-gen="m" />
      <label>Mädchen:</label>
      <input type="text" data-cat="${cat}" data-gen="w" />
    `;

    container.appendChild(div);
  });

  container.innerHTML += `<button onclick="submitVotes()">Abgeben</button>`;
}

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

    if (name !== "-" && !hostData.students.find(s => s.name === name && s.gender.startsWith(gen))) {
      alert(`Name "${name}" passt nicht zur Kategorie (${cat}) und Geschlecht.`);
      return;
    }

    votes[cat][gen] = name;
  }

  hostData.votes.push(votes);
  localStorage.setItem("student_awards_host", JSON.stringify(hostData));
  voteSubmitted = true;

  document.getElementById("votingForm").innerHTML = "<h2>Danke fürs Abstimmen! 🎉</h2>";
}

function showResults() {
  const data = JSON.parse(localStorage.getItem("student_awards_host"));
  if (!data) return;

  const now = new Date();
  const end = new Date(data.deadline);
  if (now < end) {
    const countdown = Math.ceil((end - now) / 1000 / 60 / 60 / 24);
    document.getElementById("resultSection").innerHTML = `<h2>Ergebnisse in ${countdown} Tagen</h2>`;
    return;
  }

  const results = {};
  data.categories.forEach(cat => {
    results[cat] = { m: {}, w: {} };
  });

  data.votes.forEach(vote => {
    for (let cat in vote) {
      for (let gen in vote[cat]) {
        const name = vote[cat][gen];
        if (name === "-") continue;
        results[cat][gen][name] = (results[cat][gen][name] || 0) + 1;
      }
    }
  });

  const container = document.getElementById("resultSection");
  container.innerHTML = `<h2>Ergebnisse – Student-Awards ${data.className} ${data.year}</h2>`;

  for (let cat of data.categories) {
    const div = document.createElement("div");
    div.className = "vote-category";
    div.innerHTML = `<h3>${cat}</h3>`;

    ["m", "w"].forEach(gen => {
      const genderTitle = gen === "m" ? "Junge" : "Mädchen";
      const entries = results[cat][gen];
      const max = Math.max(...Object.values(entries), 0);
      const winners = Object.entries(entries).filter(([_, val]) => val === max);

      if (winners.length === 0) {
        div.innerHTML += `<p><strong>${genderTitle}:</strong> -</p>`;
      } else {
        div.innerHTML += `<p><strong>${genderTitle}:</strong> ${winners.map(w => `${w[0]} (${w[1]})`).join(", ")}</p>`;
      }
    });

    container.appendChild(div);
  }
}
