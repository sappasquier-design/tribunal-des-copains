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
  judgePass: "",
  judgeUnlockedUntil: 0, // timestamp (ms)
};

/* ----------------- CATÉGORIES ----------------- */
const CATEGORIES = [
  { key: "EGO", label: "EGO / PERSONNALITÉ" },
  { key: "SOIREE", label: "SOIRÉES / ALCOOL" },
  { key: "HABITS", label: "PETITES HABITUDES INSUPPORTABLES" },
  { key: "FIAB", label: "FIABILITÉ / LÂCHETÉ" },
  { key: "GENE", label: "COMPORTEMENTS GÊNANTS" },
  { key: "DAGUE", label: "COUP DE GRÂCE" },
];

/* ----------------- QUESTIONS ----------------- */
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

/* ----------------- GAGES ----------------- */
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

/* ----------------- UTILITAIRES ----------------- */
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

/* ----------------- VERROU JUGE (overlay fiable iPhone) ----------------- */
let judgeOverlay = null;
let judgeInput = null;
let judgeMsg = null;
let judgeActionLabel = null;
let judgeOnOk = null;

function buildJudgeOverlay() {
  if (judgeOverlay) return;

  judgeOverlay = document.createElement("div");
  judgeOverlay.style.position = "fixed";
  judgeOverlay.style.inset = "0";
  judgeOverlay.style.background = "rgba(0,0,0,.72)";
  judgeOverlay.style.display = "none";
  judgeOverlay.style.alignItems = "center";
  judgeOverlay.style.justifyContent = "center";
  judgeOverlay.style.zIndex = "9999";
  judgeOverlay.style.padding = "18px";

  const box = document.createElement("div");
  box.style.width = "min(520px, 100%)";
  box.style.border = "1px solid rgba(103,255,103,.25)";
  box.style.borderRadius = "18px";
  box.style.background = "rgba(10,12,14,.95)";
  box.style.boxShadow = "0 25px 80px rgba(0,0,0,.65)";
  box.style.padding = "16px";

  const title = document.createElement("div");
  title.textContent = "⚖️ Accès Juge";
  title.style.fontWeight = "900";
  title.style.color = "#67ff67";
  title.style.letterSpacing = ".4px";
  title.style.marginBottom = "6px";

  judgeActionLabel = document.createElement("div");
  judgeActionLabel.style.color = "rgba(215,247,215,.8)";
  judgeActionLabel.style.fontSize = "12px";
  judgeActionLabel.style.marginBottom = "12px";

  judgeInput = document.createElement("input");
  judgeInput.type = "password";
  judgeInput.placeholder = "Mot de passe du juge";
  judgeInput.autocomplete = "off";
  judgeInput.autocapitalize = "off";
  judgeInput.spellcheck = false;
  judgeInput.style.width = "100%";
  judgeInput.style.height = "46px";
  judgeInput.style.borderRadius = "14px";
  judgeInput.style.border = "1px solid rgba(27,42,31,1)";
  judgeInput.style.background = "rgba(0,0,0,.35)";
  judgeInput.style.color = "#d7f7d7";
  judgeInput.style.padding = "0 12px";
  judgeInput.style.outline = "none";

  judgeMsg = document.createElement("div");
  judgeMsg.style.marginTop = "10px";
  judgeMsg.style.minHeight = "18px";
  judgeMsg.style.fontSize = "12px";
  judgeMsg.style.color = "rgba(255,92,92,.95)";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.marginTop = "14px";
  row.style.justifyContent = "flex-end";

  const cancel = document.createElement("button");
  cancel.textContent = "Annuler";
  cancel.style.border = "1px solid rgba(27,42,31,1)";
  cancel.style.background = "rgba(0,0,0,.35)";
  cancel.style.color = "#d7f7d7";
  cancel.style.padding = "10px 12px";
  cancel.style.borderRadius = "14px";
  cancel.style.fontWeight = "900";
  cancel.addEventListener("click", closeJudgeOverlay);

  const ok = document.createElement("button");
  ok.textContent = "Déverrouiller (15s)";
  ok.style.border = "1px solid rgba(103,255,103,.25)";
  ok.style.background = "rgba(103,255,103,.15)";
  ok.style.color = "#67ff67";
  ok.style.padding = "10px 12px";
  ok.style.borderRadius = "14px";
  ok.style.fontWeight = "900";
  ok.addEventListener("click", submitJudgePass);

  row.appendChild(cancel);
  row.appendChild(ok);

  box.appendChild(title);
  box.appendChild(judgeActionLabel);
  box.appendChild(judgeInput);
  box.appendChild(judgeMsg);
  box.appendChild(row);
  judgeOverlay.appendChild(box);
  document.body.appendChild(judgeOverlay);

  // Valider au clavier
  judgeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitJudgePass();
    if (e.key === "Escape") closeJudgeOverlay();
  });

  // click dehors = annuler
  judgeOverlay.addEventListener("click", (e) => {
    if (e.target === judgeOverlay) closeJudgeOverlay();
  });
}

function openJudgeOverlay(actionLabel, onOk) {
  buildJudgeOverlay();
  judgeOnOk = onOk;
  judgeActionLabel.textContent = `Action protégée : ${actionLabel}`;
  judgeMsg.textContent = "";
  judgeInput.value = "";
  judgeOverlay.style.display = "flex";

  // focus fiable iPhone
  setTimeout(() => judgeInput.focus(), 80);
}

function closeJudgeOverlay() {
  if (!judgeOverlay) return;
  judgeOverlay.style.display = "none";
  judgeOnOk = null;
  judgeMsg.textContent = "";
  judgeInput.value = "";
}

function submitJudgePass() {
  const typed = String(judgeInput.value || "").trim();
  const expected = String(state.judgePass || "").trim();

  if (!typed) {
    judgeMsg.textContent = "Entre le mot de passe.";
    return;
  }

  if (typed !== expected) {
    judgeMsg.textContent = "Mot de passe incorrect.";
    return;
  }

  // Déverrouille 15 secondes
  state.judgeUnlockedUntil = Date.now() + 15000;

  const cb = judgeOnOk;
  closeJudgeOverlay();
  if (typeof cb === "function") cb();
}

function judgeIsUnlocked() {
  return Date.now() < state.judgeUnlockedUntil;
}

// wrapper pour actions juge
function judgeGate(actionLabel, actionFn) {
  if (judgeIsUnlocked()) {
    actionFn();
    return;
  }
  openJudgeOverlay(actionLabel, actionFn);
}

/* ----------------- VOTES ----------------- */
function updateVoteUI() {
  const a = $("#voteCount");
  const b = $("#voteTarget");
  if (a) a.textContent = String(state.voteCount);
  if (b) b.textContent = String(state.voteTarget);
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
  const hint = $("#voteHint");
  if (hint) hint.textContent = "Votes : COMPLETS — Le Tribunal attend le délibéré du Juge.";
}

function unlockVotes() {
  document.querySelectorAll(".choice").forEach((btn) => {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  });

  // IMPORTANT : ne pas réécrire voteHint en innerHTML (ça casse parfois sur mobile)
  const hint = $("#voteHint");
  if (hint) {
    hint.innerHTML = `Votes : <span id="voteCount"></span> / <span id="voteTarget"></span> — Clique “Valider le vote”. Quand le quota est atteint, le vote se bloque.`;
  }
  updateVoteUI();
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

  if (state.voteCount >= state.voteTarget) lockVotes();
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
  state.judgeUnlockedUntil = 0;

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
    state.judgeUnlockedUntil = 0;

    state.hardMode = $("#hardMode").checked;
    modeLabel.textContent = state.hardMode ? "ULTRA TRASH" : "TRASH";

    resetScores();
    state.round = 0;
    state.used.clear();

    startRound();
  });

  // Vote libre
  $("#btnVote").addEventListener("click", applyVote);

  // Actions juge (protégées via overlay fiable)
  $("#btnVerdict").addEventListener("click", () => {
    judgeGate("Rendre le verdict", renderVerdict);
  });

  $("#btnSkip").addEventListener("click", () => {
    judgeGate("Passer", startRound);
  });

  $("#btnMenuGame").addEventListener("click", () => {
    judgeGate("Retour menu", goMenu);
  });

  $("#btnMenuVerdict").addEventListener("click", () => {
    judgeGate("Retour menu", goMenu);
  });

  // Retour au dossier (libre)
  $("#btnBack").addEventListener("click", () => show("game"));

  // Dossier suivant (juge)
  $("#btnNext").addEventListener("click", () => {
    judgeGate("Dossier suivant", startRound);
  });

  // Bonus : double tap sur le tampon = valider vote
  $("#stamp").addEventListener("dblclick", () => {
    if (!$("#btnVote").disabled) applyVote();
  });
}

init();
