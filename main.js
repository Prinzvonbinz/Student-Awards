const STORAGE_KEY = "student_awards_sessions";

// Hilfsfunktionen
function generateCode() {
  return Math.random().toString().substr(2, 5);
}

function getSessions() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function createSession() {
  const year = document.getElementById("year").value;
  const className = document.getElementById("class").value;
  const categories = document.getElementById("categories").value.split(",").map(s => s.trim());
  const deadline = document.getElementById("deadline").value;

  const studentLines = document.getElementById("students").value.trim().split("\n");
  const students = studentLines.map(line => {
    const [name, gender] = line.split(",").map(s => s.trim().toLowerCase());
    return { name, gender };
  });

  if (!year || !className || categories.length === 0 || students.length === 0 || !deadline) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  const code = generateCode();
  const session = {
    code,
    year,
    className,
    categories,
    students,
    deadline,
    votes: [],
    maxVotes: students.length,
  };

  const sessions = getSessions();
  sessions[code] = session;
  saveSessions(sessions);

  document.getElementById("output").innerHTML = `
    <p><strong>Code:</strong> ${code}</p>
    <p>Teilnahmelink (einfügen in Browser): <code>${window.location.href.replace("index.html", "vote.html")}</code></p>
  `;
}

// Abstimmung laden
function loadVoting() {
  const code = document.getElementById("codeInput").value;
  const sessions = getSessions();
  const session = sessions[code];

  if (!session) {
    alert("Ungültiger Code.");
    return;
  }

  session.userVoteId = "voted_" + code;
  if (localStorage.getItem(session.userVoteId)) {
    alert("Du hast bereits abgestimmt.");
    return;
  }

  document.getElementById("codeInputSection").style.display = "none";
  document.getElementById("votingSection").style.display = "block";
  document.getElementById("votingHeader").textContent = `${session.className} (${session.year})`;

  const table = document.getElementById("votingTable");
  const row = document.createElement("tr");
  row.innerHTML = `<th>Kategorie</th><th>Jungen</th><th>Mädchen</th>`;
  table.appendChild(row);

  session.voteSelections = {};

  session.categories.forEach(category => {
    const tr = document.createElement("tr");

    const boysCell = document.createElement("td");
    const girlsCell = document.createElement("td");

    const boys = session.students.filter(s => s.gender === "m");
    const girls = session.students.filter(s => s.gender === "w");

    boysCell.textContent = "⏺ Wählen";
    girlsCell.textContent = "⏺ Wählen";

    boysCell.onclick = () => showSelection(category, "m", boys, boysCell, session);
    girlsCell.onclick = () => showSelection(category, "w", girls, girlsCell, session);

    tr.innerHTML = `<td>${category}</td>`;
    tr.appendChild(boysCell);
    tr.appendChild(girlsCell);

    table.appendChild(tr);
  });

  // Temporär speichern
  window.currentSession = session;
}

function showSelection(category, gender, list, cell, session) {
  const name = prompt(`${category} – ${gender === "m" ? "Junge" : "Mädchen"}:\n${list.map(s => s.name).join("\n")}\n\nOder - für Enthaltung`);
  if (!name) return;

  if (name === "-") {
    session.voteSelections[`${category}_${gender}`] = null;
    cell.classList.remove("selected");
    cell.textContent = "⏺ Wählen";
  } else if (list.find(s => s.name === name)) {
    session.voteSelections[`${category}_${gender}`] = name;
    cell.classList.add("selected");
    cell.textContent = name;
  } else {
    alert("Name nicht gefunden.");
  }
}

function submitVote() {
  const session = window.currentSession;
  const expectedVotes = session.categories.length * 2;

  if (Object.keys(session.voteSelections).length !== expectedVotes) {
    alert("Bitte stimme in jeder Kategorie ab (oder enthalte dich).");
    return;
  }

  const sessions = getSessions();
  const realSession = sessions[session.code];

  realSession.votes.push(session.voteSelections);
  saveSessions(sessions);
  localStorage.setItem(session.userVoteId, "1");

  document.body.innerHTML = `
    <div class="container"><h2>✅ Danke für deine Teilnahme!</h2></div>
  `;
}

// Ergebnis anzeigen
function showResults() {
  const code = document.getElementById("resultCode").value;
  const sessions = getSessions();
  const session = sessions[code];

  if (!session) {
    alert("Ungültiger Code.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  if (today < session.deadline) {
    alert("Ergebnisse sind erst nach der Deadline sichtbar.");
    return;
  }

  const output = document.getElementById("resultOutput");
  const results = {};

  session.categories.forEach(category => {
    ["m", "w"].forEach(gender => {
      const key = `${category}_${gender}`;
      results[key] = {};
    });
  });

  session.votes.forEach(vote => {
    for (const key in vote) {
      const name = vote[key];
      if (name) {
        if (!results[key][name]) results[key][name] = 0;
        results[key][name]++;
      }
    }
  });

  let html = `<h3>Ergebnisse für ${session.className} (${session.year})</h3><ul>`;
  session.categories.forEach(category => {
    ["m", "w"].forEach(gender => {
      const key = `${category}_${gender}`;
      const votes = results[key];
      const maxVotes = Math.max(...Object.values(votes), 0);
      const winners = Object.entries(votes)
        .filter(([_, count]) => count === maxVotes)
        .map(([name]) => name);

      const label = `${category} – ${gender === "m" ? "Junge" : "Mädchen"}`;
      html += `<li><strong>${label}:</strong> ${winners.length > 0 ? winners.join(", ") + ` (${maxVotes} Stimmen)` : "Niemand gewählt."}</li>`;
    });
  });
  html += `</ul><p>Abgegeben: ${session.votes.length} / ${session.maxVotes}</p>`;

  output.innerHTML = html;
}
