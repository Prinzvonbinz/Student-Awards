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

// Host erstellt Abstimmung
function createVoting() {
  const classInput = document.getElementById("className").value.trim();
  const categoriesInput = document.getElementById("categories").value.trim();
  const studentsInput = document.getElementById("students").value.trim();
  const deadlineInput = document.getElementById("deadline").value;

  if (!classInput || !categoriesInput || !studentsInput || !deadlineInput) {
    alert("Bitte fülle alle Felder aus.");
    return;
  }

  const categories = categoriesInput.split("\n").map(s => s.trim()).filter(Boolean);
  const studentsRaw = studentsInput.split("\n").map(s => s.trim()).filter(Boolean);

  const students = studentsRaw.map(entry => {
    const parts = entry.split(",");
    return {
      name: parts[0].trim(),
      gender: parts[1].trim().toLowerCase()
    };
  });

  const code = Math.random().toString(36).substring(2, 7).toUpperCase();

  hostData = {
    className: classInput,
    year: new Date().getFullYear(),
    categories,
    students,
    deadline: deadlineInput,
    code,
    votes: []
  };

  localStorage.setItem("student_awards_host", JSON.stringify(hostData));

  document.getElementById("voteLink").textContent = window.location.href + "?voten";
  document.getElementById("voteCode").textContent = hostData.code;
  document.getElementById("resultCode").textContent = hostData.code;
  document.getElementById("hostResultLink").textContent = window.location.href + "?results";

  document.getElementById("creationForm").classList.add("hidden");
  document.getElementById("votingCreated").classList.remove("hidden");
}

// Teilnehmer gibt Code ein
function checkVoteCode() {
  const codeInput = document.getElementById("codeInput").value.trim().toUpperCase();
  const data = JSON.parse(localStorage.getItem("student_awards_host"));

  if (!data || codeInput !== data.code) {
    document.getElementById("codeError").textContent = "Ungültiger Code!";
    return;
  }

  hostData = data;
  document.getElementById("codeSection").classList.add("hidden");
  document.getElementById("votingFormContainer").classList.remove("hidden");
  generateVotingForm();
}

// Generiere Abstimmungsformular
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

// Stimmen abgeben
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

  document.getElementById("votingFormContainer").innerHTML = "<h2>Danke fürs Abstimmen! 🎉</h2>";
}

// Ergebnisse anzeigen
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

// Urkunden drucken
function printCertificates() {
  const data = JSON.parse(localStorage.getItem("student_awards_host"));
  if (!data) return;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`<html><head><title>Urkunden</title><style>
    body { font-family: sans-serif; text-align: center; background: white; color: black; }
    .cert { border: 2px solid #000; padding: 30px; margin: 20px; page-break-after: always; }
    h1 { font-size: 28px; }
  </style></head><body>`);

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

  for (let cat of data.categories) {
    ["m", "w"].forEach(gen => {
      const entries = results[cat][gen];
      const max = Math.max(...Object.values(entries), 0);
      const winners = Object.entries(entries).filter(([_, val]) => val === max);
      for (let [name, val] of winners) {
        printWindow.document.write(`
          <div class="cert">
            <h1>Urkunde</h1>
            <p>${name}</p>
            <p><strong>${cat}</strong></p>
            <p>Klasse ${data.className}, ${data.year}</p>
            <p>Erhalten mit ${val} Stimmen</p>
          </div>
        `);
      }
    });
  }

  printWindow.document.write(`</body></html>`);
  printWindow.document.close();
  printWindow.print();
}

// Sofort beim Laden: prüfen ob Voting-/Ergebnis-Modus
window.addEventListener("DOMContentLoaded", () => {
  const url = new URL(window.location.href);

  if (url.search.includes("voten")) {
    document.getElementById("codeSection").classList.remove("hidden");
  } else if (url.search.includes("results")) {
    document.getElementById("resultsView").classList.remove("hidden");
    showResults();
  } else {
    document.getElementById("creationForm").classList.remove("hidden");
  }
});