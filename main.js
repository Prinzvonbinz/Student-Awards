function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("createForm");
  const voteContainer = document.getElementById("voteContainer");
  const resultContainer = document.getElementById("resultContainer");

  // Host-Seite
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const jahr = document.getElementById("jahr").value;
      const klasse = document.getElementById("klasse").value;
      const kategorien = document.getElementById("kategorien").value.split(",").map(k => k.trim());
      const deadline = document.getElementById("deadline").value;
      const schuelerRaw = document.getElementById("schueler").value.trim().split("\n");

      const schueler = schuelerRaw.map(line => {
        const [name, gender] = line.trim().split(",");
        return { name: name.trim(), gender: gender.trim().toLowerCase() };
      });

      const code = generateCode();
      localStorage.setItem(`host_${code}`, JSON.stringify({
        jahr,
        klasse,
        kategorien,
        deadline,
        schueler,
        votes: []
      }));

      const linkArea = document.getElementById("linkArea");
      linkArea.innerHTML = `
        <p><strong>Stimmabgabe-Link:</strong><br>
        <a href="vote.html?code=${code}" target="_blank">${window.location.origin}/vote.html?code=${code}</a></p>
        <p><strong>Ergebnis-Link (nur Host, nach Deadline sichtbar):</strong><br>
        <a href="result.html?code=${code}" target="_blank">${window.location.origin}/result.html?code=${code}</a></p>
      `;
    });
  }

  // Abstimmungs-Seite
  if (voteContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const data = JSON.parse(localStorage.getItem(`host_${code}`));

    if (!data) {
      voteContainer.innerHTML = "<p>Ungültiger Code.</p>";
      return;
    }

    if (localStorage.getItem(`voted_${code}`)) {
      voteContainer.innerHTML = "<p>Du hast bereits abgestimmt. Danke!</p>";
      return;
    }

    voteContainer.innerHTML = `
      <h2>Abstimmung für Klasse ${data.klasse} (${data.jahr})</h2>
      <form id="voteForm"></form>
      <button id="submitVote">Abgeben</button>
    `;

    const voteForm = document.getElementById("voteForm");
    data.kategorien.forEach(kat => {
      const section = document.createElement("div");
      section.innerHTML = `<h3>${kat}</h3>
        <label>Junge:</label>
        <select name="${kat}_m"><option value="">–</option></select>
        <label>Mädchen:</label>
        <select name="${kat}_w"><option value="">–</option></select>
        <hr>`;
      voteForm.appendChild(section);
    });

    data.schueler.forEach(s => {
      data.kategorien.forEach(kat => {
        const select = voteForm.querySelector(`select[name="${kat}_${s.gender.charAt(0)}"]`);
        if (select) {
          const option = document.createElement("option");
          option.value = s.name;
          option.textContent = s.name;
          select.appendChild(option);
        }
      });
    });

    document.getElementById("submitVote").addEventListener("click", () => {
      const inputs = voteForm.querySelectorAll("select");
      const vote = {};
      let valid = true;
      inputs.forEach(select => {
        if (select.value === "") valid = false;
        const key = select.name;
        vote[key] = select.value;
      });

      if (!valid) {
        alert("Bitte stimme in allen Kategorien ab.");
        return;
      }

      const db = JSON.parse(localStorage.getItem(`host_${code}`));
      db.votes.push(vote);
      localStorage.setItem(`host_${code}`, JSON.stringify(db));
      localStorage.setItem(`voted_${code}`, "true");

      voteContainer.innerHTML = "<p>Danke für deine Abstimmung!</p>";
    });
  }

  // Ergebnis-Seite
  if (resultContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const data = JSON.parse(localStorage.getItem(`host_${code}`));

    if (!data) {
      resultContainer.innerHTML = "<p>Ungültiger Code.</p>";
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (today < data.deadline) {
      resultContainer.innerHTML = `<p>Ergebnisse sind erst nach dem ${data.deadline} verfügbar.</p>`;
      return;
    }

    const auswertung = {};
    data.kategorien.forEach(kat => {
      auswertung[kat] = { m: {}, w: {} };
    });

    data.votes.forEach(vote => {
      Object.entries(vote).forEach(([key, value]) => {
        const [kat, gender] = key.split("_");
        if (value !== "") {
          if (!auswertung[kat][gender][value]) {
            auswertung[kat][gender][value] = 0;
          }
          auswertung[kat][gender][value]++;
        }
      });
    });

    resultContainer.innerHTML = `<h2>Ergebnisse für ${data.klasse} (${data.jahr})</h2>`;
    data.kategorien.forEach(kat => {
      const block = document.createElement("div");
      block.innerHTML = `<h3>${kat}</h3>`;

      ["m", "w"].forEach(g => {
        const map = auswertung[kat][g];
        const maxVotes = Math.max(...Object.values(map));
        const gewinner = Object.entries(map)
          .filter(([_, v]) => v === maxVotes)
          .map(([name]) => name);

        block.innerHTML += `<strong>${g === "m" ? "Junge" : "Mädchen"}:</strong> ${gewinner.join(", ")} (${maxVotes} Stimmen)<br>`;
      });

      block.innerHTML += "<hr>";
      resultContainer.appendChild(block);
    });
  }
});
