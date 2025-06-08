const HOST_KEY = "student_awards_hosts";
const VOTE_KEY = "student_awards_votes";

// Speicher-Utils
function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

// Random-Code Generator
function generateCode(length = 5) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Host-Funktionen
function createHostConfig(form) {
  const jahr = form.jahr.value;
  const klasse = form.klasse.value;
  const kategorien = form.kategorien.value.split(",").map(k => k.trim());
  const schueler = form.schueler.value.split("\n").map(s => {
    const [name, gender] = s.split(",").map(x => x.trim());
    return { name, gender };
  });
  const deadline = form.deadline.value;

  const code = generateCode();
  const hostConfigs = loadFromStorage(HOST_KEY);
  hostConfigs.push({
    code,
    jahr,
    klasse,
    kategorien,
    schueler,
    deadline,
    created: Date.now(),
    votes: [],
    link: location.origin + location.pathname + "?vote=" + code,
    resultLink: location.origin + location.pathname + "?result=" + code
  });
  saveToStorage(HOST_KEY, hostConfigs);
  return { code, voteLink: hostConfigs.at(-1).link, resultLink: hostConfigs.at(-1).resultLink };
}

function getHostConfigByCode(code) {
  return loadFromStorage(HOST_KEY).find(cfg => cfg.code === code);
}

function saveVote(code, newVote) {
  const hostConfigs = loadFromStorage(HOST_KEY);
  const config = hostConfigs.find(cfg => cfg.code === code);
  if (!config) return false;

  const exists = config.votes.some(v => v.id === newVote.id);
  if (!exists) {
    config.votes.push(newVote);
    saveToStorage(HOST_KEY, hostConfigs);
    return true;
  }
  return false;
}

function getVotesByCode(code) {
  const config = getHostConfigByCode(code);
  return config ? config.votes : [];
}

function getVoteCount(code) {
  const config = getHostConfigByCode(code);
  return config ? config.votes.length : 0;
}

function getTotalVoters(code) {
  const config = getHostConfigByCode(code);
  return config ? config.schueler.length : 0;
}
// Ergebnisberechnung
function calculateResults(code) {
  const config = getHostConfigByCode(code);
  if (!config) return null;

  const results = {};
  const now = new Date();
  const deadline = new Date(config.deadline);
  if (now < deadline) return "too_early";

  for (const kat of config.kategorien) {
    results[kat] = { m: {}, w: {} };
  }

  for (const vote of config.votes) {
    for (const kat of config.kategorien) {
      const selected = vote.selection[kat];
      if (selected !== "-") {
        const gender = config.schueler.find(s => s.name === selected)?.gender;
        if (gender && results[kat][gender]) {
          results[kat][gender][selected] = (results[kat][gender][selected] || 0) + 1;
        }
      }
    }
  }

  const finalWinners = {};
  for (const kat of config.kategorien) {
    finalWinners[kat] = { m: [], w: [] };
    for (const g of ["m", "w"]) {
      const entries = Object.entries(results[kat][g]);
      if (entries.length === 0) continue;
      const max = Math.max(...entries.map(e => e[1]));
      finalWinners[kat][g] = entries.filter(e => e[1] === max).map(e => ({ name: e[0], votes: e[1] }));
    }
  }
  return finalWinners;
}

// UI: Ergebnisse anzeigen
function showResults(resultData, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  for (const [kat, genders] of Object.entries(resultData)) {
    const block = document.createElement("div");
    block.className = "result-block";
    block.innerHTML = `<h3>${kat}</h3>`;
    for (const g of ["m", "w"]) {
      const title = g === "m" ? "Jungen" : "Mädchen";
      const names = genders[g].map(e => `${e.name} (${e.votes})`).join(", ") || "–";
      block.innerHTML += `<p><strong>${title}:</strong> ${names}</p>`;
    }
    container.appendChild(block);
  }
}

// UI: Fehlermeldung anzeigen
function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<p class="error">${msg}</p>`;
}
