const $ = (sel) => document.querySelector(sel);

const screens = {
  home: $("#screen-home"),
  game: $("#screen-game"),
  verdict: $("#screen-verdict"),
};

const modeLabel = $("#modeLabel");

const state = {
  players: [],
  scores: new Map(),
  round: 0,
  selected: null,
  used: new Set(),
  voteCount: 0,
  voteTarget: 0,
  judgePass: "", // mot de passe défini au départ (trim)
};

const CATEGORIES = [
  { key: "EGO", label: "EGO / PERSONNALITÉ" },
  { key: "SOIREE", label: "SOIRÉES / ALCOOL" },
  { key: "HABITS", label: "PETITES HABITUDES INSUPPORTABLES" },
  { key: "FIAB", label: "FIABILITÉ / LÂCHETÉ" },
  { key: "GENE", label: "COMPORTEMENTS GÊNANTS" },
  { key: "DAGUE", label: "COUP DE GRÂCE" },
];

// QUESTIONS PERSONNALISÉES (sans amour / relations)
const QUESTIONS_HARD = [
  // 🧠 EGO / PERSONNALITÉ
  { cat: "EGO", text: "Qui a le plus gros ego pour le moins de raisons ?" },
  { cat: "EGO", text: "Qui se croit plus intelligent que tout le monde, mais c’est surtout dans sa tête ?" },
  { cat: "EGO", text: "Qui est persuadé d’être indispensable au groupe alors qu’on survivrait très bien sans ?" },
  { cat: "EGO", text: "Qui ne supporte absolument pas d’avoir tort et retourne la réalité pour gagner ?" },
  { cat: "EGO", text: "Qui donne des leçons de vie alors que sa propre vie est un chantier ?" },
  { cat: "EGO", text: "Qui est le plus susceptible / vexé, mais fait semblant d’être au-dessus de tout ?" },

  // 🍺 SOIRÉES / ALCOOL
  { cat: "SOIREE", text: "Qui devient lourd au bout de deux verres (hors Bruno) ?" },
  { cat: "SOIREE", text: "Qui dit « je me calme ce soir » et finit systématiquement en débris humain ?" },
  { cat: "SOIREE", text: "Qui est le plus gros fumeur de dragon (hors Front) ?" },
  { cat: "SOIREE", text: "Qui est le plus ingérable en soirée (hors Bruno) ?" },
  { cat: "SOIREE", text: "Qui ne peut s’empêcher de prendre la voiture après être arraché (pas forcément celle du boulot) ?" },

  // 🤏 PETITES HABITUDES INSUPPORTABLES
  { cat: "HABITS", text: "Qui a une habitude insupportable mais fait comme si personne ne l’avait remarquée ?" },
  { cat: "HABITS", text: "Qui refait toujours la même chose reloue, même quand on lui a déjà dit ?" },
  { cat: "HABITS", text: "Qui pense que « ce n’est pas si grave » alors que ça énerve tout le monde ?" },
  { cat: "HABITS", text: "Qui a un tic ou une manie qui devient vraiment pénible sur la durée ?" },
  { cat: "HABITS", text: "Qui est persuadé que ses défauts font partie de son charme ?" },

  // 🐌 FIABILITÉ / LÂCHETÉ
  { cat: "FIAB", text: "Qui se dégonfle le plus souvent au dernier moment ?" },
  { cat: "FIAB", text: "Qui est toujours en retard (hors Julie) ?" },
  { cat: "FIAB", text: "Qui disparaît dès que ça devient un peu compliqué ?" },
  { cat: "FIAB", text: "Qui est la personne qui sera toujours absent pour un déménagement ?" },
  { cat: "FIAB", text: "Qui laisse toujours les autres gérer, puis donne son avis après ?" },

  // 🤡 COMPORTEMENTS GÊNANTS
  { cat: "GENE", text: "Qui est le plus malaisant sans s’en rendre compte ?" },
  { cat: "GENE", text: "Qui parle trop fort, trop longtemps, et pense que c’est du charisme ?" },
  { cat: "GENE", text: "Qui coupe systématiquement la parole, comme si le monde l’attendait ?" },
  { cat: "GENE", text: "Qui se croit drôle mais ne fait rire que lui (et parfois même pas) ?" },
  { cat: "GENE", text: "Qui en fait toujours trop pour attirer l’attention ?" },

  // ☠️ COUP DE GRÂCE
  { cat: "DAGUE", text: "Qui est le plus fatigant sur la durée ?" },
  { cat: "DAGUE", text: "Qui serait le plus facilement remplaçable dans le groupe ?" },
  { cat: "DAGUE", text: "Qui a clairement changé… pas forcément en mieux ?" },
  { cat: "DAGUE", text: "Qui ne se remet jamais en question, même avec des preuves ?" },
  { cat: "DAGUE", text: "Qui mérite le plus ce procès, globalement ?" },
];

// GAGES / PEINES PERSONNALISÉS
const SENTENCES = [
  "Tu lis à voix haute la charge, puis tu dis : « Oui, c’est moi. » Sans sourire.",
  "Tu deviens le greffier : tu sers les verres / distribues les snacks jusqu’au prochain verdict.",
  "Tu fais une excuse publique de 20 secondes… volontairement hypocrite et théâtrale.",
  "Tu prends le 'Titre Infâme' du soir : on t’appelle comme ça jusqu’à la fin (et tu réponds).",
  "Tu as le droit de te défendre… mais uniquement avec UNE seule phrase. Une. Pas deux.",
  "Tu imites ton pire comportement en version caricature pendant 15 secondes.",
  "Tu imites Bruno.",
  "Tu trouves la prochaine date pour se retrouver ensemble (date + lieu).",
  "Tu imites Nina.",
  "Tu fais un combat de pouce avec le Front. S’il n’est pas là : avec le moins beau.",
];

function show(screenKey) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[screenKey].classList.remove("hidden");
}

function sanitizePlayers(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resetScores() {
  state.scores = new Map();
  state.players.forEach((p) => state.scores.set(p, 0));
}

function pickQuestion() {
  const pool = QUESTIONS_HARD
    .map((q, idx) => ({ ...q, id: idx }))
    .filter((q) => !state.used.has(q.id));

  if (pool.length === 0) {
    state.used.clear();
    return pickQuestion();
  }

  const picked = pool[Math.floor(Math.random() * pool.length)];
  state.used.add(picked.id);
  return picked;
}

function catLabel(key) {
  const found = CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

/* ----------------- JUGE (mot de passe) ----------------- */
/* Fix iPhone: on TRIM le mot de passe saisi (et celui stocké) */
function requireJudge(actionLabel) {
  const input = prompt(`Action protégée (${actionLabel})\nMot de passe du Juge :`);
  if (input === null) return false; // Annuler
  const typed = String(input).trim();
  const expected = String(state.judgePass).trim();

  if (typed === expected) return true;

  alert("Accès refusé. Mot de passe incorrect.");
  return false;
}

/* ----------------- VOTES ----------------- */
function updateVoteUI() {
  $("#voteCount").textContent = String(state.voteCount);
  $("#voteTarget").textContent = String(state.voteTarget);
}

function clearSelection() {
  state.selected = null;
  $("#btnVote").disabled = true;
  document.querySelectorAll(".choice").forEach((x) => x.classList.remove("selected"));
}

function lockVotes() {
  $("#btnVote").disabled = true;
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  });
  // On ne réécrit PAS le HTML pour éviter les soucis iOS
  const hint = $("#voteHint");
  if (hint) {
    hint.textContent = "Votes : COMPLETS — Le Tribunal attend le délibéré du Juge.";
  }
}

function unlockVotes() {
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });
  updateVoteUI();

  const hint = $("#voteHint");
  if (hint) {
    // Remet le texte d’origine (les spans restent dans le DOM)
    hint.innerHTML =
      'Votes : <span id="voteCount">0</span> / <span id="voteTarget">0</span> — Clique “Valider le vote”. Quand le quota est atteint, le vote se bloque.';
    updateVoteUI();
  }
}

function renderChoices() {
  const wrap = $("#choices");
  wrap.innerHTML = "";

  state.players.forEach((name) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.innerHTML = `<strong>${escapeHtml(name)}</strong>`;

    btn.addEventListener("click", () => {
      if (state.voteCount >= state.voteTarget) return;

      state.selected = name;
      document.querySelectorAll(".choice").forEach((x) => x.classList.remove("selected"));
      btn.classList.add("selected");
      $("#btnVote").disabled = false;
    });

    wrap.appendChild(btn);
  });
}

function applyVote() {
  if (!state.selected) return;
  if (state.voteCount >= state.voteTarget) return;

  state.scores.set(state.selected, (state.scores.get(state.selected) || 0) + 1);

  state.voteCount += 1;
  updateVoteUI();

  $("#stamp").textContent = "VOTE REÇU";
  setTimeout(() => ($("#stamp").textContent = "ENQUÊTE"), 450);

  clearSelection();

  if (state.voteCount >= state.voteTarget) {
    lockVotes();
  }
}

/* ----------------- ROUNDS / VERDICT ----------------- */
function startRound() {
  state.round += 1;
  state.voteCount = 0;
  state.voteTarget = state.players.length;

  const q = pickQuestion();

  $("#roundInfo").textContent = `Dossier #${String(state.round).padStart(3, "0")} — Audience ouverte`;
  $("#categoryTag").textContent = `CAT: ${catLabel(q.cat)}`;
  $("#questionText").textContent = q.text;
  $("#stamp").textContent = "ENQUÊTE";

  renderChoices();
  unlockVotes();
  clearSelection();

  show("game");
}

function computePodium() {
  return state.players
    .map((p) => ({ name: p, pts: state.scores.get(p) || 0 }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);
}

function renderVerdict() {
  const podium = computePodium();
  const list = $("#podium");
  list.innerHTML = "";

  podium.forEach((p, i) => {
    const li = document.createElement("li");
    const medal = ["🥇", "🥈", "🥉"][i] || "•";
    li.innerHTML = `${medal} <span class="who">${escapeHtml(p.name)}</span> <span class="pts mono">(${p.pts} pts)</span>`;
    list.appendChild(li);
  });

  const guilty = podium[0]?.name || "Personne";
  $("#verdictSub").textContent = `Le Tribunal estime que ${guilty} est majoritairement responsable.`;
  $("#verdictStamp").textContent = "COUPABLE";

  const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  $("#sentenceText").textContent = sentence;

  show("verdict");
}

function goMenu() {
  state.players = [];
  state.used.clear();
  state.round = 0;
  state.selected = null;
  state.voteCount = 0;
  state.voteTarget = 0;
  state.judgePass = "";

  $("#players").value = "";
  $("#judgePass").value = "";

  show("home");
}

/* ----------------- INIT ----------------- */
function init() {
  $("#btnStart").addEventListener("click", () => {
    const playersText = $("#players").value;
    let players = sanitizePlayers(playersText);

    const pass = String($("#judgePass").value || "").trim();
    if (!pass) {
      alert("Tu dois définir un mot de passe pour le Juge.");
      return;
    }

    if (players.length < 3) {
      alert("Ajoute au moins 3 prénoms (un par ligne).");
      return;
    }
    if ($("#shufflePlayers").checked) players = shuffle(players);

    state.players = players;
    state.judgePass = pass;

    state.hardMode = $("#hardMode").checked;
    modeLabel.textContent = state.hardMode ? "ULTRA TRASH" : "TRASH";

    resetScores();
    state.round = 0;
    state.used.clear();

    startRound();
  });

  // Vote libre (pas protégé)
  $("#btnVote").addEventListener("click", applyVote);

  // Actions juge (protégées)
  $("#btnVerdict").addEventListener("click", () => {
    if (!requireJudge("Rendre le verdict")) return;
    renderVerdict();
  });

  $("#btnSkip").addEventListener("click", () => {
    if (!requireJudge("Passer")) return;
    startRound();
  });

  $("#btnMenuGame").addEventListener("click", () => {
    if (!requireJudge("Retour menu")) return;
    goMenu();
  });

  $("#btnMenuVerdict").addEventListener("click", () => {
    if (!requireJudge("Retour menu")) return;
    goMenu();
  });

  // Retour au dossier (libre)
  $("#btnBack").addEventListener("click", () => show("game"));

  // Dossier suivant (juge)
  $("#btnNext").addEventListener("click", () => {
    if (!requireJudge("Dossier suivant")) return;
    startRound();
  });

  // Bonus : double tap sur le tampon = valider vote
  $("#stamp").addEventListener("dblclick", () => {
    if (!$("#btnVote").disabled) applyVote();
  });
}

init();
