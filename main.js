const socket = io();

function setupHost() {
  const year = document.getElementById("year").value;
  const klasse = document.getElementById("class").value;
  const categories = document.getElementById("categories").value.split(",").map(c => c.trim());
  const students = document.getElementById("students").value.split("\n").map(line => {
    const [name, gender] = line.split(",");
    return { name: name.trim(), gender: gender.trim().toLowerCase() };
  });
  const deadline = document.getElementById("deadline").value;

  const data = { year, klasse, categories, students, deadline };
  socket.emit("createSession", data, (code) => {
    const voteLink = `vote.html?code=${code}`;
    const resultLink = `result.html?code=${code}`;
    document.getElementById("generatedLinks").innerHTML = `
      <p>Code: ${code}</p>
      <a href="${voteLink}">Abstimmen</a><br>
      <a href="${resultLink}">Ergebnisse</a>
    `;
  });
}

function loadVotePage() {
  const code = new URLSearchParams(window.location.search).get("code");
  socket.emit("getSession", code, (data) => {
    if (!data) return document.body.innerHTML = "<h2>Ungültiger Code</h2>";

    const container = document.getElementById("voteContainer");
    container.innerHTML = "";
    data.categories.forEach(cat => {
      const div = document.createElement("div");
      div.innerHTML = `
        <h3>${cat}</h3>
        Junge:
        <select data-cat="${cat}" data-gender="m">
          ${data.students.filter(s => s.gender === "m").map(s => `<option>${s.name}</option>`).join("")}
        </select>
        Mädchen:
        <select data-cat="${cat}" data-gender="w">
          ${data.students.filter(s => s.gender === "w").map(s => `<option>${s.name}</option>`).join("")}
        </select>
      `;
      container.appendChild(div);
    });

    document.getElementById("submitVote").onclick = () => {
      const selections = Array.from(document.querySelectorAll("select"));
      const vote = {};
      for (const sel of selections) {
        const cat = sel.dataset.cat;
        const gender = sel.dataset.gender;
        const val = sel.value;
        if (!vote[cat]) vote[cat] = {};
        vote[cat][gender] = val;
      }
      socket.emit("submitVote", { code, vote }, (res) => {
        if (res.success) {
          document.body.innerHTML = "<h2>Danke für deine Stimme!</h2>";
        } else {
          alert("Fehler beim Abstimmen.");
        }
      });
    };
  });
}

function loadResultPage() {
  const code = new URLSearchParams(window.location.search).get("code");
  socket.emit("getResult", code, (res) => {
    if (!res) return document.body.innerHTML = "<h2>Ungültiger Code</h2>";

    const { data, results } = res;
    const container = document.getElementById("resultContainer");

    data.categories.forEach(cat => {
      const male = results[cat].m;
      const female = results[cat].w;

      const maxM = Math.max(...Object.values(male), 0);
      const maxW = Math.max(...Object.values(female), 0);

      const winnerM = Object.entries(male).filter(([_, v]) => v === maxM).map(([n]) => n).join(", ") || "–";
      const winnerW = Object.entries(female).filter(([_, v]) => v === maxW).map(([n]) => n).join(", ") || "–";

      const div = document.createElement("div");
      div.innerHTML = `
        <h3>${cat}</h3>
        <p><strong>Junge:</strong> ${winnerM} (${maxM} Stimmen)</p>
        <p><strong>Mädchen:</strong> ${winnerW} (${maxW} Stimmen)</p>
      `;
      container.appendChild(div);
    });
  });
}
