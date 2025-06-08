const storageKey = "studentAwards_data";

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function createVoting() {
  const year = document.getElementById("year").value;
  const className = document.getElementById("class").value;
  const categories = document.getElementById("categories").value.split(",").map(s => s.trim());
  const studentsRaw = document.getElementById("students").value.trim().split("\n");
  const deadline = document.getElementById("deadline").value;

  const students = studentsRaw.map(line => {
    const [name, gender] = line.split(",");
    return { name: name.trim(), gender: gender.trim().toLowerCase() };
  });

  const data = { year, className, categories, students, deadline, votes: [] };
  const code = generateCode();
  localStorage.setItem(`${storageKey}_${code}`, JSON.stringify(data));

  const voteLink = `${location.origin}/vote.html?code=${code}`;
  const resultLink = `${location.origin}/result.html?code=${code}`;
  document.getElementById("generatedLinks").innerHTML = `
    Abstimmungs-Link: <a href="${voteLink}" target="_blank">${voteLink}</a><br>
    Ergebnis-Link (nur Host): <a href="${resultLink}" target="_blank">${resultLink}</a>
  `;
}
function loadVoting() {
  const code = new URLSearchParams(window.location.search).get("code") || document.getElementById("codeInput").value.toUpperCase();
  const stored = localStorage.getItem(`${storageKey}_${code}`);
  if (!stored) return alert("Ungültiger Code");

  const data = JSON.parse(stored);
  const section = document.getElementById("votingSection");
  const submitBtn = document.getElementById("submitBtn");
  section.innerHTML = "";

  data.categories.forEach(cat => {
    const div = document.createElement("div");
    div.innerHTML = `<h3>${cat}</h3>`;

    ["m", "w"].forEach(gender => {
      const list = data.students.filter(s => s.gender === gender);
      const label = gender === "m" ? "Junge" : "Mädchen";
      const select = document.createElement("select");
      select.id = `${cat}_${gender}`;
      select.innerHTML = `<option value="">– Enthalten –</option>` +
        list.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
      div.innerHTML += `<label>${label}: </label>`;
      div.appendChild(select);
    });

    section.appendChild(div);
  });

  section.style.display = "block";
  submitBtn.style.display = "block";
}

function submitVote() {
  const code = new URLSearchParams(window.location.search).get("code").toUpperCase();
  const stored = localStorage.getItem(`${storageKey}_${code}`);
  if (!stored) return alert("Ungültiger Code");
  const data = JSON.parse(stored);

  const result = {};
  for (let cat of data.categories) {
    const male = document.getElementById(`${cat}_m`).value;
    const female = document.getElementById(`${cat}_w`).value;
    if (male === "" || female === "") return alert("Bitte alle Felder ausfüllen oder enthalten.");
    result[cat] = { m: male, w: female };
  }

  data.votes.push(result);
  localStorage.setItem(`${storageKey}_${code}`, JSON.stringify(data));
  alert("Danke für deine Stimme!");
  location.reload();
}

function loadResults() {
  const code = new URLSearchParams(window.location.search).get("code") || document.getElementById("resultCode").value.toUpperCase();
  const stored = localStorage.getItem(`${storageKey}_${code}`);
  if (!stored) return alert("Ungültiger Code");
  const data = JSON.parse(stored);

  const today = new Date().toISOString().split("T")[0];
  if (today < data.deadline) return alert("Ergebnisse erst nach der Deadline sichtbar!");

  const resultArea = document.getElementById("resultDisplay");
  resultArea.innerHTML = "";

  data.categories.forEach(cat => {
    const count = { m: {}, w: {} };
    data.votes.forEach(vote => {
      ["m", "w"].forEach(g => {
        const name = vote[cat][g];
        if (!name || name === "") return;
        if (!count[g][name]) count[g][name] = 0;
        count[g][name]++;
      });
    });

    const div = document.createElement("div");
    div.innerHTML = `<h3>${cat}</h3>`;

    ["m", "w"].forEach(g => {
      const label = g === "m" ? "Junge" : "Mädchen";
      const sorted = Object.entries(count[g]).sort((a, b) => b[1] - a[1]);
      const maxVotes = sorted[0]?.[1] || 0;
      const winners = sorted.filter(([_, v]) => v === maxVotes).map(([n]) => n);

      div.innerHTML += `<p>${label}: ${winners.join(", ")} (${maxVotes} Stimmen)</p>`;
    });

    resultArea.appendChild(div);
  });
}
