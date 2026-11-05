"use strict";
/* Merlin web — flashcards for learning Korean.
   Vocabulary uses the same shape as the desktop app's vocabulary.json: { "Set": { "word": "meaning" } } */

const $ = (id) => document.getElementById(id);
const KEYS = { vocab: "merlin.vocab", progress: "merlin.progress", stats: "merlin.stats", settings: "merlin.settings" };
const ALL = "__all__";
const DAY = 86400000;
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]; // per level
const SEP = "␟";

// ---------- storage ----------
function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast("Could not save — storage is full or blocked."); }
}

let vocab = load(KEYS.vocab, null);
const firstRun = vocab === null;
if (!vocab || typeof vocab !== "object") vocab = { Default: {} };
let progress = load(KEYS.progress, {});
let stats = load(KEYS.stats, { days: {} });
let settings = Object.assign({ set: ALL, mode: "due", dir: "fwd", roman: true, speak: false, grimSet: null, view: "review" },
  load(KEYS.settings, {}));

const saveVocab = () => save(KEYS.vocab, vocab);
const saveProgress = () => save(KEYS.progress, progress);
const saveSettings = () => save(KEYS.settings, settings);

// ---------- helpers ----------
const pkey = (set, word) => set + SEP + word;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toLocaleDateString("en-CA");
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function isDue(set, word, now = Date.now()) { const r = progress[pkey(set, word)]; return !r || r.due <= now; }
function level(set, word) { const r = progress[pkey(set, word)]; return r ? r.box : 0; }
function setNames() { return Object.keys(vocab); }
function entries(set) {
  const sets = set === ALL ? setNames() : [set];
  const out = [];
  for (const s of sets) for (const [w, m] of Object.entries(vocab[s] || {})) out.push({ set: s, word: w, meaning: m });
  return out;
}
function normalize(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
}
function matches(input, expected) {
  const n = normalize(input);
  if (!n) return false;
  const variants = [expected, ...String(expected).split(/[,;/]| or /)];
  return variants.some((v) => normalize(v) === n);
}
function relTime(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(m, 1)} min`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} h`;
  return `${Math.round(h / 24)} days`;
}

// ---------- Merlin & toast ----------
const LINES = {
  good: ["Splendid! That one is etched into your memory.", "Correct! Even Avalon would applaud.", "Well done, apprentice!", "Ha! Too easy for you.", "Your Korean grows stronger."],
  again: ["No matter — we'll see this one again soon.", "A tricky spell. It will come back shortly.", "Mistakes are just practice in disguise.", "Don't worry, I'll ask again in a moment."],
  done: ["The deck is cleared! Rest, or pick another set.", "All cards reviewed. Magnificent work!", "That's everything for now. Come back tomorrow for more."],
};
function merlin(text) { $("merlinSays").textContent = `“${text}”`; }
let toastTimer;
function toast(text) {
  const t = $("toast"); t.textContent = text; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ---------- speech ----------
let koVoice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  koVoice = speechSynthesis.getVoices().find((v) => /^ko/i.test(v.lang)) || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let warnedVoice = false;
function speak(text) {
  if (!text || !("speechSynthesis" in window)) { toast("Speech isn't supported in this browser."); return; }
  if (!koVoice && !warnedVoice) { warnedVoice = true; toast("No Korean voice found — install one in your system settings for better audio."); }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR"; if (koVoice) u.voice = koVoice; u.rate = 0.9;
  speechSynthesis.speak(u);
}

// ---------- review session ----------
const session = { queue: [], idx: 0, total: 0, done: 0, card: null, flipped: false, checked: false, graded: false, practice: false };

function buildSession(practice = false) {
  session.practice = practice;
  const mode = settings.mode;
  let cards = entries(settings.set);
  if (mode === "due" && !practice) cards = cards.filter((c) => isDue(c.set, c.word));
  shuffle(cards);
  // Smart review: words you got wrong before come first, new words after
  if (mode === "due" && !practice) cards.sort((a, b) => (progress[pkey(b.set, b.word)] ? 1 : 0) - (progress[pkey(a.set, a.word)] ? 1 : 0));
  session.queue = cards.map((c) => ({ ...c, dir: settings.dir === "mix" ? (Math.random() < 0.5 ? "fwd" : "rev") : settings.dir }));
  session.idx = 0; session.total = cards.length; session.done = 0;
  showCard();
}

function cardSides(c) {
  return c.dir === "fwd" ? { front: c.word, back: c.meaning } : { front: c.meaning, back: c.word };
}

function show(id, on) { $(id).hidden = !on; }

function showCard() {
  const c = session.queue[session.idx] || null;
  session.card = c; session.flipped = false; session.checked = false; session.graded = false;
  const typeMode = settings.mode === "type";
  $("cardAnswer").hidden = true; $("cardFeedback").textContent = ""; $("cardFeedback").className = "card-feedback";
  $("card").classList.remove("flipped", "ok", "bad");
  updateDeckBar();

  if (!c) {
    const empty = entries(settings.set).length === 0;
    $("cardFront").textContent = empty ? "This set has no words yet" : "Deck complete ✨";
    $("cardRoman").textContent = "";
    $("btnSpeak").hidden = true;
    show("typeForm", false); show("actFlip", false); show("actGrade", false); show("actNext", false); show("actDone", true);
    renderDoneActions(empty);
    return;
  }

  const { front } = cardSides(c);
  $("cardFront").textContent = front;
  $("cardFront").lang = Hangul.hasHangul(front) ? "ko" : "en";
  $("cardFront").classList.toggle("ko", Hangul.hasHangul(front));
  $("cardRoman").textContent = settings.roman && Hangul.hasHangul(front) ? Hangul.romanize(front) : "";
  $("btnSpeak").hidden = false;
  show("actDone", false); show("actGrade", false); show("actNext", false);
  show("typeForm", typeMode); show("actFlip", !typeMode);
  if (typeMode) {
    $("typeInput").value = ""; $("typeInput").disabled = false;
    $("typeInput").placeholder = c.dir === "fwd" ? "Type the meaning…" : "Type the Korean word…";
    setTimeout(() => $("typeInput").focus({ preventScroll: true }), 30);
  }
  if (settings.speak && c.dir === "fwd") speak(c.word);
}

function renderDoneActions(empty) {
  const box = $("actDone");
  if (empty) {
    box.innerHTML = `<button class="btn primary" id="btnDoneStarter">Add starter Korean decks</button>
      <button class="btn" id="btnDoneGrim">Open the Grimoire</button>`;
    $("btnDoneStarter").onclick = addStarter;
    $("btnDoneGrim").onclick = () => switchView("grimoire");
    merlin("This set is empty. Add some words in the Grimoire — or let me give you a few starter decks!");
    return;
  }
  const upcoming = entries(settings.set).map((c) => progress[pkey(c.set, c.word)]?.due || 0).filter((d) => d > Date.now());
  const next = upcoming.length ? Math.min(...upcoming) : null;
  const nothingDue = settings.mode === "due" && !session.practice && session.total === 0;
  box.innerHTML = `<button class="btn primary" id="btnDoneAgain">${nothingDue ? "Practice all cards anyway" : "Review again"}</button>`;
  $("btnDoneAgain").onclick = () => buildSession(nothingDue || session.practice);
  if (nothingDue) merlin(`Nothing is due in this set${next ? ` — the next card is ready in ${relTime(next - Date.now())}` : ""}. You can still practice everything.`);
  else merlin(pick(LINES.done) + (next && settings.mode === "due" ? ` Next card due in ${relTime(next - Date.now())}.` : ""));
}

function updateDeckBar() {
  const label = settings.set === ALL ? "All sets" : settings.set;
  const left = Math.max(session.queue.length - session.idx, 0);
  $("deckInfo").textContent = session.total ? `${label} · ${left} card${left === 1 ? "" : "s"} left` : label;
  const pct = session.queue.length ? (session.idx / session.queue.length) * 100 : 100;
  $("deckBar").style.width = pct + "%";
}

function reveal() {
  const c = session.card; if (!c || session.flipped) return;
  session.flipped = true;
  const { back } = cardSides(c);
  const roman = settings.roman && Hangul.hasHangul(back) ? `<span class="roman">${esc(Hangul.romanize(back))}</span>` : "";
  $("cardAnswer").innerHTML = `<span class="${Hangul.hasHangul(back) ? "ko" : ""}">${esc(back)}</span>${roman}`;
  $("cardAnswer").hidden = false;
  $("card").classList.add("flipped");
  show("actFlip", false);
  if (settings.mode !== "type") show("actGrade", true);
  if (settings.speak && c.dir === "rev") speak(c.word);
}

function grade(good) {
  const c = session.card; if (!c || session.graded) return;
  session.graded = true;
  const k = pkey(c.set, c.word);
  const r = progress[k] || { box: 0, due: 0, reps: 0, lapses: 0 };
  r.reps++; r.last = Date.now();
  if (good) { r.box = Math.min(r.box + 1, 5); r.due = Date.now() + INTERVAL_DAYS[r.box] * DAY; }
  else { r.box = 1; r.lapses++; r.due = Date.now() + 10 * 60000; }
  progress[k] = r; saveProgress();
  const d = today(); stats.days[d] = (stats.days[d] || 0) + 1; save(KEYS.stats, stats);
  session.done++;
  if (!good) { // see it again later in this session
    const pos = Math.min(session.idx + 4, session.queue.length);
    session.queue.splice(pos, 0, { ...c });
  }
  merlin(pick(good ? LINES.good : LINES.again));
}

function next() { session.idx++; showCard(); }

function checkTyped(e) {
  e.preventDefault();
  if (session.checked) { next(); return; }
  const c = session.card; if (!c) return;
  const { back } = cardSides(c);
  const ok = matches($("typeInput").value, back);
  session.checked = true;
  $("typeInput").disabled = true;
  reveal();
  $("card").classList.add(ok ? "ok" : "bad");
  const fb = $("cardFeedback");
  if (ok) { fb.textContent = "Correct!"; fb.className = "card-feedback ok"; }
  else {
    fb.innerHTML = `Not quite. <button class="link" id="btnOverride">I was right</button>`;
    fb.className = "card-feedback bad";
    $("btnOverride").onclick = () => {
      // undo the "again" grade and count it as known
      const k = pkey(c.set, c.word); const r = progress[k];
      if (r) { r.lapses = Math.max(0, r.lapses - 1); r.box = Math.max(r.box, 1); }
      const dup = session.queue.findIndex((x, i) => i > session.idx && x.word === c.word && x.set === c.set);
      if (dup > -1) session.queue.splice(dup, 1);
      session.graded = false; session.done--; stats.days[today()]--;
      grade(true); fb.textContent = "Counted as correct."; fb.className = "card-feedback ok";
      $("card").classList.replace("bad", "ok");
    };
  }
  grade(ok);
  show("actNext", true);
  $("btnNext").focus({ preventScroll: true });
}

// ---------- selects ----------
function fillSetSelect() {
  const sel = $("reviewSet");
  const now = Date.now();
  const opt = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;
  const allDue = entries(ALL).filter((c) => isDue(c.set, c.word, now)).length;
  sel.innerHTML = opt(ALL, `All sets (${allDue} due)`) + setNames().map((s) => {
    const due = entries(s).filter((c) => isDue(c.set, c.word, now)).length;
    return opt(s, `${s} (${due} due)`);
  }).join("");
  if (settings.set !== ALL && !vocab[settings.set]) settings.set = ALL;
  sel.value = settings.set;
}

// ---------- grimoire ----------
function currentGrimSet() {
  if (!settings.grimSet || !vocab[settings.grimSet]) settings.grimSet = setNames()[0] || null;
  return settings.grimSet;
}

function renderSets() {
  const cur = currentGrimSet();
  const now = Date.now();
  $("setList").innerHTML = setNames().map((s) => {
    const n = Object.keys(vocab[s]).length;
    const due = entries(s).filter((c) => isDue(c.set, c.word, now)).length;
    return `<li><button class="${s === cur ? "active" : ""}" data-set="${esc(s)}">
      <span class="name">${esc(s)}</span><span class="meta">${n} word${n === 1 ? "" : "s"}${due ? ` · ${due} due` : ""}</span></button></li>`;
  }).join("") || `<li class="hint">No sets yet.</li>`;
}

function renderWords() {
  const set = currentGrimSet();
  $("setTitle").textContent = set || "No set";
  const q = normalize($("searchWords").value);
  const words = set ? Object.entries(vocab[set]) : [];
  const rows = words.filter(([w, m]) => !q || normalize(w + m).includes(q) || normalize(Hangul.romanize(w)).includes(q));
  $("wordRows").innerHTML = rows.map(([w, m]) => {
    const lv = level(set, w);
    return `<tr data-word="${esc(w)}">
      <td><span class="ko">${esc(w)}</span><small>${esc(Hangul.romanize(w))}</small></td>
      <td>${esc(m)}</td>
      <td><span class="lvl l${lv}">${lv ? lv : "New"}</span></td>
      <td class="rowbtns">
        <button class="icon" data-act="speak" title="Pronounce">🔊</button>
        <button class="icon" data-act="edit" title="Edit">✎</button>
        <button class="icon" data-act="del" title="Delete">✕</button>
      </td></tr>`;
  }).join("");
  $("wordsEmpty").hidden = words.length > 0;
  $("btnRenameSet").disabled = $("btnDeleteSet").disabled = !set;
}

function renderGrimoire() { renderSets(); renderWords(); }

function addWord(set, word, meaning) {
  word = word.trim(); meaning = meaning.trim();
  if (!word || !meaning) return false;
  if (!vocab[set]) vocab[set] = {};
  vocab[set][word] = meaning;
  return true;
}

function renameKeys(oldSet, newSet, oldWord, newWord) {
  for (const k of Object.keys(progress)) {
    const [s, w] = k.split(SEP);
    if (s !== oldSet || (oldWord !== undefined && w !== oldWord)) continue;
    const nk = pkey(newSet, oldWord !== undefined ? newWord : w);
    if (nk !== k) { progress[nk] = progress[k]; delete progress[k]; }
  }
}

function dropKeys(set, word) {
  for (const k of Object.keys(progress)) {
    const [s, w] = k.split(SEP);
    if (s === set && (word === undefined || w === word)) delete progress[k];
  }
}

function editRow(tr) {
  const set = currentGrimSet(); const w = tr.dataset.word; const m = vocab[set][w];
  tr.innerHTML = `<td><input class="e-word" lang="ko" value="${esc(w)}"></td><td><input class="e-mean" value="${esc(m)}"></td>
    <td></td><td class="rowbtns"><button class="icon" data-act="save" title="Save">✓</button><button class="icon" data-act="cancel" title="Cancel">↺</button></td>`;
  tr.querySelector(".e-mean").focus();
  tr.addEventListener("keydown", (e) => { if (e.key === "Enter") tr.querySelector('[data-act="save"]').click(); if (e.key === "Escape") renderWords(); });
}

function saveRow(tr) {
  const set = currentGrimSet(); const oldW = tr.dataset.word;
  const nw = tr.querySelector(".e-word").value.trim(); const nm = tr.querySelector(".e-mean").value.trim();
  if (!nw || !nm) { toast("Word and meaning can't be empty."); return; }
  if (nw !== oldW && vocab[set][nw] !== undefined) { toast(`“${nw}” already exists in this set.`); return; }
  // rebuild to keep word order
  const rebuilt = {};
  for (const [w, m] of Object.entries(vocab[set])) { if (w === oldW) rebuilt[nw] = nm; else rebuilt[w] = m; }
  vocab[set] = rebuilt;
  if (nw !== oldW) renameKeys(set, set, oldW, nw);
  saveVocab(); saveProgress(); renderGrimoire(); merlin(`Updated “${nw}”.`);
}

function parseBulk(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = line.split(/\t| [-–—=:] |\s*[=]\s*|\s+-\s+/);
    if (m.length >= 2) out.push([m[0], m.slice(1).join(" - ")]);
  }
  return out;
}

function mergeVocab(data, overwrite) {
  let added = 0;
  for (const [set, words] of Object.entries(data)) {
    if (!vocab[set]) vocab[set] = {};
    for (const [w, m] of Object.entries(words)) {
      if (vocab[set][w] === undefined) added++;
      if (overwrite || vocab[set][w] === undefined) vocab[set][w] = m;
    }
  }
  if (vocab.Default && !Object.keys(vocab.Default).length && setNames().length > 1) delete vocab.Default;
  return added;
}

function validVocab(data) {
  return data && typeof data === "object" && !Array.isArray(data) &&
    Object.values(data).every((ws) => ws && typeof ws === "object" && !Array.isArray(ws) && Object.values(ws).every((m) => typeof m === "string"));
}

function addStarter() {
  const n = mergeVocab(window.STARTER_DECKS, false);
  saveVocab(); refreshAll();
  merlin(n ? `I've added ${n} words across ${Object.keys(window.STARTER_DECKS).length} starter decks. Let's begin!` : "You already have all the starter words.");
  if (settings.view === "review") buildSession();
}

// ---------- progress view ----------
function renderProgress() {
  const all = entries(ALL); const now = Date.now();
  const seen = all.filter((c) => progress[pkey(c.set, c.word)]);
  const mastered = all.filter((c) => level(c.set, c.word) >= 5).length;
  const due = all.filter((c) => isDue(c.set, c.word, now)).length;
  let streak = 0; const d = new Date();
  if (!stats.days[today()]) d.setDate(d.getDate() - 1);
  while (stats.days[d.toLocaleDateString("en-CA")]) { streak++; d.setDate(d.getDate() - 1); }
  const tiles = [
    ["Day streak", streak + (streak ? " 🔥" : "")], ["Reviewed today", stats.days[today()] || 0],
    ["Words", all.length], ["Learned", seen.length], ["Mastered", mastered], ["Due now", due],
  ];
  $("statsGrid").innerHTML = tiles.map(([k, v]) => `<div class="tile"><b>${v}</b><span>${k}</span></div>`).join("");

  $("setProgress").innerHTML = setNames().map((s) => {
    const es = entries(s); const n = es.length || 1;
    const counts = [0, 0, 0, 0, 0, 0]; es.forEach((c) => counts[level(c.set, c.word)]++);
    const segs = counts.map((cnt, i) => cnt ? `<i class="l${i}" style="width:${(cnt / n) * 100}%" title="${i ? "Level " + i : "New"}: ${cnt}"></i>` : "").join("");
    return `<div class="setprog"><div class="setprog-head"><span>${esc(s)}</span><small>${counts[5]}/${es.length} mastered</small></div><div class="stack">${segs}</div></div>`;
  }).join("") || `<p class="hint">No sets yet.</p>`;

  const hard = all.map((c) => ({ ...c, r: progress[pkey(c.set, c.word)] })).filter((c) => c.r && c.r.lapses > 0)
    .sort((a, b) => b.r.lapses - a.r.lapses).slice(0, 8);
  $("hardWords").innerHTML = hard.map((c) => `<li><span class="ko">${esc(c.word)}</span> — ${esc(c.meaning)} <small>missed ${c.r.lapses}×</small></li>`).join("")
    || `<li class="hint">No trouble words yet. Keep reviewing!</li>`;
}

// ---------- views ----------
function switchView(view) {
  settings.view = view; saveSettings();
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  if (view === "review") { fillSetSelect(); buildSession(); }
  if (view === "grimoire") { renderGrimoire(); merlin("Welcome to the grimoire. Add, edit or import your words here."); }
  if (view === "progress") { renderProgress(); merlin("Here is how your studies are going."); }
}

function refreshAll() { fillSetSelect(); renderGrimoire(); }

// ---------- events ----------
document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));

$("reviewSet").addEventListener("change", (e) => { settings.set = e.target.value; saveSettings(); buildSession(); });
$("reviewMode").addEventListener("change", (e) => { settings.mode = e.target.value; saveSettings(); buildSession(); });
$("reviewDir").addEventListener("change", (e) => { settings.dir = e.target.value; saveSettings(); buildSession(); });
$("optRoman").addEventListener("change", (e) => { settings.roman = e.target.checked; saveSettings(); showCard(); });
$("optSpeak").addEventListener("change", (e) => { settings.speak = e.target.checked; saveSettings(); });

$("btnFlip").addEventListener("click", reveal);
$("card").addEventListener("click", (e) => { if (settings.mode !== "type" && !e.target.closest("button")) reveal(); });
$("btnAgain").addEventListener("click", () => { grade(false); next(); });
$("btnGood").addEventListener("click", () => { grade(true); next(); });
$("btnNext").addEventListener("click", next);
$("typeForm").addEventListener("submit", checkTyped);
$("btnSpeak").addEventListener("click", () => { const c = session.card; if (c) speak(c.word); });

document.addEventListener("keydown", (e) => {
  if (settings.view !== "review" || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target.tagName || "").toLowerCase();
  if (["input", "textarea", "select"].includes(tag)) return;
  if (e.key === " " && settings.mode !== "type") { e.preventDefault(); reveal(); }
  else if (e.key === "1" && session.flipped && settings.mode !== "type") { grade(false); next(); }
  else if ((e.key === "2" || e.key === "Enter") && session.flipped && settings.mode !== "type") { e.preventDefault(); grade(true); next(); }
  else if (e.key === "Enter" && settings.mode === "type" && session.checked) { e.preventDefault(); next(); }
  else if (e.key.toLowerCase() === "p") { const c = session.card; if (c) speak(c.word); }
});

// grimoire events
$("setList").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-set]"); if (!b) return;
  settings.grimSet = b.dataset.set; saveSettings(); $("searchWords").value = ""; renderGrimoire();
});
$("newSetForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("newSetName").value.trim(); if (!name) return;
  if (vocab[name]) { toast("A set with that name already exists."); return; }
  vocab[name] = {}; settings.grimSet = name; saveVocab(); saveSettings();
  $("newSetName").value = ""; refreshAll(); merlin(`The set “${name}” has been inscribed into the grimoire!`);
  $("newWord").focus();
});
$("btnRenameSet").addEventListener("click", () => {
  const set = currentGrimSet(); if (!set) return;
  const name = (prompt("New name for this set:", set) || "").trim();
  if (!name || name === set) return;
  if (vocab[name]) { toast("A set with that name already exists."); return; }
  const rebuilt = {}; for (const s of setNames()) rebuilt[s === set ? name : s] = vocab[s];
  vocab = rebuilt; renameKeys(set, name);
  if (settings.set === set) settings.set = name;
  settings.grimSet = name; saveVocab(); saveProgress(); saveSettings(); refreshAll();
});
$("btnDeleteSet").addEventListener("click", () => {
  const set = currentGrimSet(); if (!set) return;
  if (!confirm(`Delete “${set}” and all ${Object.keys(vocab[set]).length} of its words?`)) return;
  delete vocab[set]; dropKeys(set);
  if (!setNames().length) vocab.Default = {};
  settings.grimSet = null; saveVocab(); saveProgress(); saveSettings(); refreshAll();
  merlin(`The set “${set}” has been erased.`);
});
$("addWordForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const set = currentGrimSet() || (vocab.Default = {}, settings.grimSet = "Default");
  const w = $("newWord").value.trim();
  const existed = vocab[set][w] !== undefined;
  if (addWord(set, w, $("newMeaning").value)) {
    saveVocab(); $("newWord").value = ""; $("newMeaning").value = ""; $("romanPreview").textContent = "";
    renderGrimoire(); fillSetSelect(); $("newWord").focus();
    merlin(existed ? `Updated the meaning of “${w}”.` : `Added “${w}” to “${set}”.`);
  }
});
$("newWord").addEventListener("input", (e) => {
  const v = e.target.value; $("romanPreview").textContent = Hangul.hasHangul(v) ? "≈ " + Hangul.romanize(v) : "";
});
$("btnBulk").addEventListener("click", () => {
  const set = currentGrimSet(); if (!set) return;
  const pairs = parseBulk($("bulkText").value);
  if (!pairs.length) { toast("Couldn't find any “word - meaning” lines."); return; }
  pairs.forEach(([w, m]) => addWord(set, w, m));
  saveVocab(); $("bulkText").value = ""; refreshAll();
  merlin(`Inscribed ${pairs.length} word${pairs.length === 1 ? "" : "s"} into “${set}”.`);
});
$("searchWords").addEventListener("input", renderWords);
$("wordRows").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const tr = b.closest("tr"); const set = currentGrimSet(); const w = tr.dataset.word;
  const act = b.dataset.act;
  if (act === "speak") speak(w);
  else if (act === "edit") editRow(tr);
  else if (act === "cancel") renderWords();
  else if (act === "save") saveRow(tr);
  else if (act === "del") {
    delete vocab[set][w]; dropKeys(set, w); saveVocab(); saveProgress(); refreshAll();
    merlin(`“${w}” has been banished from “${set}”.`);
  }
});
$("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(vocab, null, 4)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "vocabulary.json";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Exported vocabulary.json");
});
$("importFile").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!validVocab(data)) throw new Error("bad shape");
    const n = mergeVocab(data, true); saveVocab(); refreshAll();
    merlin(`Imported ${Object.keys(data).length} set(s) — ${n} new word${n === 1 ? "" : "s"}.`);
  } catch { toast("That file isn't a valid vocabulary.json."); }
  e.target.value = "";
});
$("btnStarter").addEventListener("click", addStarter);
$("btnResetProgress").addEventListener("click", () => {
  if (!confirm("Reset all review progress? Your words are kept.")) return;
  progress = {}; stats = { days: {} }; saveProgress(); save(KEYS.stats, stats); renderProgress();
});

// ---------- start ----------
$("reviewMode").value = settings.mode; $("reviewDir").value = settings.dir;
$("optRoman").checked = settings.roman; $("optSpeak").checked = settings.speak;
switchView(settings.view || "review");
if (firstRun) merlin("Greetings! I am Merlin. Your grimoire is empty — add starter Korean decks, import your vocabulary.json, or write your own words.");

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
