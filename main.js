const baseUrl = ""; // Render-URL wird automatisch verwendet

function generateCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

function setupHost() {
  const year = document.getElementById("year").value;
  const klasse = document.getElementById("class").value;
  const categories = document.getElementById("categories").value.split(",").map(c => c.trim()).filter(c => c);
  const studentsRaw = document.getElementById("students").value.split("\n").map(s => s.trim()).filter(s => s);
  const deadline = document.getElementById("deadline").value;

  const students = studentsRaw.map(s => {
    const [name, gender] = s.split(",");
    return { name: name.trim(), gender: gender.trim().toLowerCase() };
  });

  const code = generateCode();
  const data = {
    year,
    klasse,
    categories,
    students,
    deadline,
    code,
    votes: [],
  };

  localStorage.setItem("hostData_" + code, JSON.stringify(data));

  const voteLink = `/vote.html?code=${code}`;
  const resultLink = `/result.html?code=${code}`;

  document.getElementById("generatedLinks").innerHTML = `
    <p><strong>Code:</strong> ${code}</p>
    <p><strong>Abstimmen:</strong> <a href="${voteLink}" target="_blank">${location.origin + voteLink}</a></p>
    <p><strong>Ergebnisse:</strong> <a href="${resultLink}" target="_blank">${location.origin + resultLink}</a></p>
  `;
}

function loadVotePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const data = JSON.parse(localStorage.getItem("hostData_" + code));

  if (!data) {
    document.body.innerHTML = "<h2>Ungültiger Code</h2>";
    return;
  }

  const votedKey = "voted_" + code;
  if (localStorage.getItem(votedKey)) {
    document.body.innerHTML = "<h2>Du hast bereits abgestimmt.</h2>";
    return;
  }

  const categories = data.categories;
  const container = document.getElementById("voteContainer");
  container.innerHTML = "";

  categories.forEach(cat => {
    const div = document.createElement("div");
    div.className = "category";
    div.innerHTML = `<h3>${cat}</h3>
      <label>Junge:</label>
      <select data-cat="${cat}" data-gender="m">
        <option value="">-</option>
        ${data.students.filter(s => s.gender === "m").map(s => `<option>${s.name}</option>`).join("")}
      </select>
      <label>Mädchen:</label>
      <select data-cat="${cat}" data-gender="w">
        <option value="">-</option>
        ${data.students.filter(s => s.gender === "w").map(s => `<option>${s.name}</option>`).join("")}
      </select>`;
    container.appendChild(div);
  });

  document.getElementById("submitVote").onclick = () => {
    const selections = Array.from(document.querySelectorAll("select"));
    const vote = {};

    for (const sel of selections) {
      const cat = sel.dataset.cat;
      const gender = sel.dataset.gender;
      const val = sel.value;

      if (!val) {
        alert("Bitte alle Felder ausfüllen oder enthalte dich explizit (-)");
        return;
      }

      if (!vote[cat]) vote[cat] = {};
      vote[cat][gender] = val;
    }

    data.votes.push(vote);
    localStorage.setItem("hostData_" + code, JSON.stringify(data));
    localStorage.setItem(votedKey, "true");
    document.body.innerHTML = "<h2>Danke für deine Abstimmung!</h2>";
  };
}

function loadResultPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const data = JSON.parse(localStorage.getItem("hostData_" + code));

  if (!data) {
    document.body.innerHTML = "<h2>Ungültiger Code</h2>";
    return;
  }

  const deadlinePassed = new Date() >= new Date(data.deadline);
  if (!deadlinePassed) {
    document.body.innerHTML = "<h2>Die Ergebnisse sind erst am " + data.deadline + " verfügbar.</h2>";
    return;
  }

  const results = {};
  data.categories.forEach(cat => {
    results[cat] = { m: {}, w: {} };
  });

  data.votes.forEach(vote => {
    for (const cat in vote) {
      const mName = vote[cat].m;
      const wName = vote[cat].w;

      if (mName) results[cat].m[mName] = (results[cat].m[mName] || 0) + 1;
      if (wName) results[cat].w[wName] = (results[cat].w[wName] || 0) + 1;
    }
  });

  const container = document.getElementById("resultContainer");
  container.innerHTML = "";

  for (const cat of data.categories) {
    const section = document.createElement("div");
    section.className = "resultCategory";

    const maleVotes = results[cat].m;
    const femaleVotes = results[cat].w;

    const maleMax = Math.max(...Object.values(maleVotes), 0);
    const femaleMax = Math.max(...Object.values(femaleVotes), 0);

    const maleWinners = Object.entries(maleVotes).filter(([_, v]) => v === maleMax).map(([k]) => k);
    const femaleWinners = Object.entries(femaleVotes).filter(([_, v]) => v === femaleMax).map(([k]) => k);

    section.innerHTML = `
      <h3>${cat}</h3>
      <p><strong>Junge:</strong> ${maleWinners.join(", ") || "–"} (${maleMax} Stimmen)</p>
      <p><strong>Mädchen:</strong> ${femaleWinners.join(", ") || "–"} (${femaleMax} Stimmen)</p>
    `;

    container.appendChild(section);
  }
}
