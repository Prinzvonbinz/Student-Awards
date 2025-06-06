function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function generateTable() {
  const year = document.getElementById("year").value.trim();
  const klasse = document.getElementById("class").value.trim();
  const categories = document.getElementById("categories").value.split(",").map(c => c.trim()).filter(Boolean);
  const rawStudents = document.getElementById("students").value.trim();
  const deadline = document.getElementById("deadline").value;

  if (!year || !klasse || categories.length === 0 || !rawStudents || !deadline) {
    alert("Bitte alle Felder ausfüllen!");
    return;
  }

  const students = rawStudents.split("\n").map(line => {
    const [name, gender] = line.split(",");
    return { name: name.trim(), gender: gender.trim().toLowerCase() };
  });

  const code = generateCode();
  const data = { year, class: klasse, categories, students, deadline, code };
  localStorage.setItem("student_awards_host", JSON.stringify(data));
  localStorage.setItem("student_awards_votes", JSON.stringify([]));

  document.getElementById("codeDisplay").innerText = code;
  const voteLink = `${window.location.origin}${window.location.pathname.replace("index.html", "")}vote.html?code=${code}`;
  document.getElementById("voteLink").innerText = voteLink;
  document.getElementById("voteLink").href = voteLink;
  document.getElementById("linkSection").style.display = "block";

  showResultsIfReady();
}

function showResultsIfReady() {
  const data = JSON.parse(localStorage.getItem("student_awards_host"));
  if (!data) return;

  const deadline = new Date(data.deadline);
  const now = new Date();

  const resultSection = document.getElementById("resultSection");
  resultSection.innerHTML = "";

  if (now < deadline) {
    const timeLeft = Math.round((deadline - now) / 1000 / 60 / 60 / 24);
    resultSection.innerHTML = `<h3>Ergebnisse sichtbar ab: ${data.deadline} (${timeLeft} Tage)</h3>`;
    return;
  }

  const votes = JSON.parse(localStorage.getItem("student_awards_votes")) || [];
  const results = {};

  data.categories.forEach(cat => {
    results[cat] = { m: {}, w: {} };
  });

  votes.forEach(vote => {
    for (let cat of data.categories) {
      for (let gender of ["m", "w"]) {
        const name = vote[cat]?.[gender];
        if (name && name !== "-") {
          results[cat][gender][name] = (results[cat][gender][name] || 0) + 1;
        }
      }
    }
  });

  resultSection.innerHTML += `<h2>Ergebnisse</h2>`;
  data.categories.forEach(cat => {
    resultSection.innerHTML += `<h3>${cat}</h3>`;
    ["m", "w"].forEach(gender => {
      const entries = Object.entries(results[cat][gender]);
      if (entries.length === 0) {
        resultSection.innerHTML += `<p>${gender === "m" ? "Jungen" : "Mädchen"}: Keine Stimmen</p>`;
        return;
      }
      entries.sort((a, b) => b[1] - a[1]);
      const [winner, count] = entries[0];
      resultSection.innerHTML += `<p>${gender === "m" ? "Jungen" : "Mädchen"}: ${winner} (${count} Stimmen)</p>`;
    });
  });
}

function resetAll() {
  if (confirm("Möchtest du wirklich alles zurücksetzen?")) {
    localStorage.removeItem("student_awards_host");
    localStorage.removeItem("student_awards_votes");
    location.reload();
  }
}

showResultsIfReady();
