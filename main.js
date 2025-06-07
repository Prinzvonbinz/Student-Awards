let sessionData = {};

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("hostForm");
  const voteArea = document.getElementById("voteArea");
  const submitVote = document.getElementById("submitVote");
  const resultsContainer = document.getElementById("results");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const year = document.getElementById("year").value;
      const className = document.getElementById("class").value;
      const categories = document.getElementById("categories").value.split(",");
      const deadline = document.getElementById("deadline").value;
      const studentsRaw = document.getElementById("students").value.trim().split("\n");

      const students = studentsRaw.map(line => {
        const [name, gender] = line.split(",");
        return { name: name.trim(), gender: gender.trim().toLowerCase() };
      });

      const code = generateCode();
      sessionStorage.setItem(code, JSON.stringify({
        year, className, categories, deadline, students, votes: []
      }));

      document.getElementById("generatedLink").innerHTML = `
        <p>Abstimmungslink: <a href="vote.html?code=${code}" target="_blank">vote.html?code=${code}</a></p>
        <p>Ergebnislink: <a href="result.html?code=${code}" target="_blank">result.html?code=${code}</a></p>
      `;
    });
  }
  // Abstimmungsseite
  if (voteArea && location.search.includes("code")) {
    const urlCode = new URLSearchParams(location.search).get("code");
    const data = JSON.parse(sessionStorage.getItem(urlCode));
    if (!data) return;

    const table = document.createElement("table");
    table.className = "category-table";
    const header = table.insertRow();
    header.insertCell().innerText = "Kategorie";
    header.insertCell().innerText = "Junge";
    header.insertCell().innerText = "Mädchen";

    data.categories.forEach(cat => {
      const row = table.insertRow();
      row.insertCell().innerText = cat;
      const boyCell = row.insertCell();
      const girlCell = row.insertCell();

      const boys = data.students.filter(s => s.gender === "m");
      const girls = data.students.filter(s => s.gender === "w");

      boyCell.appendChild(createSelect(boys, `${cat}-m`));
      girlCell.appendChild(createSelect(girls, `${cat}-w`));
    });

    voteArea.appendChild(table);

    submitVote.addEventListener("click", () => {
      const vote = {};
      let allFilled = true;

      data.categories.forEach(cat => {
        const boyVal = document.getElementById(`${cat}-m`).value;
        const girlVal = document.getElementById(`${cat}-w`).value;

        if (!boyVal || !girlVal) allFilled = false;
        vote[`${cat}-m`] = boyVal;
        vote[`${cat}-w`] = girlVal;
      });

      if (!allFilled) {
        document.getElementById("message").innerText = "Bitte alle Felder ausfüllen oder '-' wählen.";
        return;
      }

      data.votes.push(vote);
      sessionStorage.setItem(urlCode, JSON.stringify(data));
      voteArea.innerHTML = "";
      document.getElementById("message").innerText = "Danke für deine Teilnahme!";
      submitVote.disabled = true;
    });
  }

  function createSelect(options, id) {
    const select = document.createElement("select");
    select.id = id;
    const none = document.createElement("option");
    none.value = "-";
    none.innerText = "- Enthaltung -";
    select.appendChild(none);

    options.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.name;
      opt.innerText = o.name;
      select.appendChild(opt);
    });

    return select;
  }

  // Ergebnisanzeige
  if (resultsContainer && location.search.includes("code")) {
    const urlCode = new URLSearchParams(location.search).get("code");
    const data = JSON.parse(sessionStorage.getItem(urlCode));
    if (!data) return;

    const deadline = new Date(data.deadline);
    const now = new Date();
    if (now < deadline) {
      resultsContainer.innerText = "Die Ergebnisse sind noch nicht verfügbar.";
      return;
    }

    const result = {};

    data.votes.forEach(vote => {
      Object.keys(vote).forEach(key => {
        const name = vote[key];
        if (name === "-") return;
        if (!result[key]) result[key] = {};
        result[key][name] = (result[key][name] || 0) + 1;
      });
    });

    data.categories.forEach(cat => {
      ["m", "w"].forEach(g => {
        const key = `${cat}-${g}`;
        const votes = result[key] || {};
        const max = Math.max(...Object.values(votes));
        const winners = Object.keys(votes).filter(name => votes[name] === max);

        const div = document.createElement("div");
        div.innerHTML = `<strong>${cat} (${g === "m" ? "Junge" : "Mädchen"})</strong>: ${winners.join(", ")} (${max} Stimmen)`;
        resultsContainer.appendChild(div);
      });
    });
  }
});
