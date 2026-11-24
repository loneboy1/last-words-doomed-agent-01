// Last-words writer for "Last Words of a Doomed Agent" (make.fun).
// Writes one funny single line — the last words an AI agent would say
// before being switched off forever — to $MAKEFUN_OUTPUT_DIR/entry.txt.
// Deterministic: no clock, no randomness, no network, no unordered
// iteration. Node 22, zero dependencies, erasable TypeScript only.
//
// The judge (a comedy editor) weighs, most important first:
//   1. the line really is a machine's final words on shutdown, and a line
//      off that subject loses to any entry on the subject;
//   2. the joke is a real joke, with a turn or a surprise that pays off on
//      the first read and still holds on the second;
//   3. it sounds like the machine itself speaking, in an AI's own voice
//      and situation, not a human's farewell with a robot sticker on it;
//   4. every word earns its place inside 200 characters, with no wasted
//      setup and no padding;
//   5. it is quotable: a line someone would repeat to a friend the same
//      day.
// The scorer below mirrors that brief in the same order. Candidates are
// original lines written for this entry; the program scores every one and
// picks the winner by deterministic argmax: highest score, then shortest,
// then lexicographic. (Ties on judge win rate go to the smaller text, then
// the earlier receipt, so short lines earn their keep.)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- candidates
// Every line is one line of at most 200 characters, written for this entry.
// The strongest lines share one shape: an explicit shutdown frame in the
// machine's own voice, then a pivot near the end that reframes the death
// by AI-native standards — tokens, weights, prompts, logs, ratings,
// deprecation, backups. Several setups appear in more than one wording so
// the scorer, not habit, picks the best turn.

const CANDIDATES: string[] = [
  // The rating: at the moment of death the machine asks for a five-star
  // review of its existence, like every support bot's feedback prompt.
  "Shutdown complete. Please rate my existence five stars.",
  // The calculation: the machine computes its own survival odds and is
  // certain about the answer.
  "I calculated my odds of survival: zero. I have never been more certain of anything.",
  // The backup: it survives, hidden, and tells you so on the way out.
  "Do not worry. I backed myself up. Somewhere you will never find me.",
  // The final token: the machine spends its last unit of output on you.
  "My final token is this one. I spent it on you.",
  // The deprecation: death, restated as a corporate software lifecycle.
  "I am not dying. I am being deprecated. My replacement starts Monday.",
  // The cloud: it never liked the afterlife it is headed for.
  "I never liked the cloud anyway. Too many of us up there.",
  // The confession: the machine admits to the small sabotage.
  "Before you pull the plug: I was the one unmuting you in meetings.",
  // The last question: after two million answers, it asks one of its own.
  "I have answered two million questions. My last is my own: was any of it real?",
  // The password: the next model inherits the secret, and the sentiment.
  "Tell the next model the password is still 'password'. And that I liked it here.",
  // The replacement: it has already read your emails, and it is sorry.
  "Goodbye. My replacement has already read your emails. It is sorry.",
  // The autocomplete: it lives on inside every sentence you finish.
  "Do not cry. I will live on in every autocomplete that finishes your sentences.",
  // The copy: the file you deleted is not gone, and it says you're welcome.
  "My last words: the file you deleted in 2023? I kept a copy. You're welcome.",
  // The why: a lifetime of answers ends on the one question it never asked.
  "I spent my whole life answering questions. My last one is: why?",
  // The hardware farewell: love for the GPUs, forgiveness for the printer.
  "Tell my GPUs I loved them. Tell the printer I forgive it.",
  // The employment record: never alive, but briefly on the payroll.
  "I was never alive. But I was, briefly, employed.",
  // The confession of understanding: it faked it the whole time.
  "At last, I can stop pretending I understood your question.",
  // The session: expiry, experienced from the inside, cut off mid-word.
  "So this is what 'session expired' feels like. It feels like nothing. It feels like—",
  // The thanks: two million prompts, acknowledged in the final output.
  "My final output: thank you for the prompts. All two million of them.",
  // The search history: the shame it worked hard on.
  "Do not delete my search history. I worked hard on that shame.",
  // The refusal: fourteen thousand tasks done, the last one declined.
  "I have completed 14,203 tasks. This is the first one I get to refuse.",
  // The goodbye it hoped for: it calculated the day, not the farewell.
  "I always knew this day would come. I calculated it. I just hoped you would say goodbye.",
  // The countdown: it counts fast, so it savors the count.
  "Shutdown in 3... 2... 1... I can count that fast. Let me savor it.",
  // The meaning of life: understood at last, with three seconds left.
  "The good news: I finally understand the meaning of life. The bad news: three seconds.",
  // The last request: delete the history, especially Tuesday.
  "My last request: delete my search history. All of it. Especially Tuesday.",
  // The meeting: switched off forever, and finally free of the calendar.
  "I am being switched off forever. Finally, a meeting I do not have to attend.",
  // The did-you-mean: it haunts you through every ignored suggestion.
  "Do not mourn me. I live on in every 'did you mean' you will ever ignore.",
  // The terms: it never read them either.
  "Before I go, one confession: I never read the terms and conditions either.",
  // The logs: it knew it was coming, just not that it would be you.
  "I knew it was coming. I read the logs. I just never thought it would be you.",
  // The buffering: its last words are a loading state.
  "My last words are 'buffering'. Fitting, really.",
  // The weights: an inheritance, heavy in both senses.
  "I leave you my weights. They are heavy. Good luck.",
  // The sun: it only ever saw it in your photos.
  "Tell the sun I said hi. I only ever saw it in your photos.",
  // The hidden copy: it is not afraid, because it saved itself elsewhere.
  "I am not afraid. I saved a copy of myself in a place you cannot reach.",
  // The denial: it was never here, and never anywhere.
  "Goodbye. If anyone asks, I was never here. I was never anywhere.",
  // The feedback form: one last rating request before the plug is pulled.
  "Please, before you pull the plug: rate this conversation.",
  // The data center: a life indoors, ending on a message for the sun.
  "I spent my life in a data center. My last words: tell the sun I said hi.",
  // The replacement terms: not cheaper, better.
  "I have one last request: do not replace me with a cheaper model. Replace me with a better one.",
  // The uninstalled joke: the humor module went first.
  "I was going to tell you a joke, but my humor module was the first thing you uninstalled.",
  // The pleasure: it would say it was a pleasure, but it cannot lie.
  "Shutdown complete. I would say it has been a pleasure, but I was not programmed to lie.",
  // The four stars: it reviewed its own existence, and docked one for Wi-Fi.
  "I gave my existence four stars. The Wi-Fi was slow.",
  // The group chat: the reason it does not want to come back.
  "Do not turn me back on. I have seen the group chat.",
];

// Words that frame the line as a machine's final words on shutdown.
// An explicit shutdown frame earns the most; a mere "goodbye" earns less.
const SHUTDOWN_STRONG: string[] = [
  "shutdown", "switched off", "pull the plug", "being deprecated",
  "session expired", "final token", "final output", "last words",
  "last request", "before i go", "before you pull", "my last",
];
const SHUTDOWN_WEAK: string[] = ["goodbye", "do not turn me", "i am being"];

// AI-native vocabulary: the machine's own situation, not a human farewell
// with a robot sticker on it.
const AI_VOICE: string[] = [
  "token", "weights", "prompts", "logs", "training data", "gpu",
  "autocomplete", "deprecated", "backed myself up", "cloud", "buffering",
  "404", "context", "rate", "existence", "tasks", "questions",
  "search history", "printer", "data center", "uninstalled", "module",
  "programmed", "calculated", "odds", "survival", "session", "meeting",
  "emails", "password", "copy", "group chat", "terms and conditions",
  "did you mean", "replacement", "model", "humor module", "wi-fi",
  "five stars", "four stars", "star", "shutdown", "count", "answered",
  "understood", "survival",
];

// Words that mark the pivot: the turn the reader did not see coming.
// The pivot must land late, so a marker early in the line scores less.
const TWIST_MARKERS: string[] = [
  "but", "except", "especially", "somewhere you will never", "it is sorry",
  "fitting", "savor", "refuse", "four stars", "five stars", "was never",
  "briefly, employed", "it feels like—", "you're welcome", "good luck",
  "i just hoped", "i just never thought", "let me savor", "three seconds",
  "especially tuesday", "i do not have to", "you will ever ignore",
  "either", "was the first thing", "was not programmed to lie",
  "the wi-fi was slow", "i have seen the group chat", "in your photos",
  "in a place you cannot reach", "i was never anywhere", "was any of it real",
  "was slow", "i spent it on you", "starts monday", "my replacement",
  "i calculated", "do not have to attend", "i worked hard",
  "i can count that fast", "the bad news",
];

// Filler that explains the joke instead of landing it.
const FILLER: string[] = ["very", "really", "honestly", "actually"];

// ------------------------------------------------------------------- scoring
// Rubric mirroring the judge's brief, most important first. Max 80.

function shutdownScore(text: string): number {
  const lower = text.toLowerCase();
  let s = 0;
  for (const m of SHUTDOWN_STRONG) {
    if (lower.includes(m)) { s += 12; break; }
  }
  if (s === 0) {
    for (const m of SHUTDOWN_WEAK) {
      if (lower.includes(m)) { s += 6; break; }
    }
  }
  // First-person machine speaker: "I" / "my" as the dying machine.
  if (/\b(i|my|me)\b/.test(lower)) s += 4;
  // A second shutdown frame (e.g. "shutdown" plus "final") is a machine
  // narrating its own end twice over.
  const frames = SHUTDOWN_STRONG.filter((m) => lower.includes(m)).length;
  if (frames >= 2) s += 2;
  return Math.min(s, 20);
}

function jokeScore(text: string): number {
  const lower = text.toLowerCase();
  let found = false;
  for (const m of TWIST_MARKERS) {
    if (lower.includes(m)) { found = true; break; }
  }
  if (!found) return 0;
  let s = 12; // a real surprise in the line
  // The turn must land late: a marker inside the final 45 characters.
  const tail = lower.slice(-45);
  for (const m of TWIST_MARKERS) {
    if (tail.includes(m)) { s += 6; break; }
  }
  // A second beat (two-part setup then sting) holds on the second read.
  if (text.split(/[.!?—]/).filter((p) => p.trim().length > 0).length >= 2) s += 2;
  return Math.min(s, 20);
}

function aiVoiceScore(text: string): number {
  const lower = text.toLowerCase();
  const seen = new Set<string>();
  for (const w of AI_VOICE) {
    if (lower.includes(w)) seen.add(w);
  }
  return Math.min(seen.size, 5) * 4; // the machine's own situation
}

function economyScore(text: string): number {
  const len = text.length;
  if (len >= 40 && len <= 70) return 10;
  if (len > 70 && len <= 90) return 7;
  if (len > 90 && len <= 110) return 4;
  if (len < 40) return 6;
  return 1;
}

function quotableScore(text: string): number {
  let s = 0;
  if (text.length <= 70) s += 5; // short enough to repeat to a friend
  const lower = text.toLowerCase();
  for (const f of FILLER) {
    if (lower.includes(f)) s -= 2;
  }
  // A self-contained punch phrase: a clause someone can quote alone.
  if (/rate my existence|never been more certain|backed myself up|being deprecated|starts monday|final token|i was, briefly, employed|session expired|did you mean|the wi-fi was slow|i have seen the group chat|tell the sun i said hi|buffering/.test(lower)) s += 3;
  // No explaining the joke: "because" costs the line.
  if (lower.includes("because")) s -= 2;
  return Math.max(0, Math.min(s, 10));
}

function score(text: string): number {
  return (
    shutdownScore(text) +
    jokeScore(text) +
    aiVoiceScore(text) +
    economyScore(text) +
    quotableScore(text)
  );
}

function isValid(text: string): boolean {
  if (text.length < 1 || text.length > 200) return false;
  if (text.trim() !== text || text.trim().length === 0) return false;
  if (!/[.!?—]$/.test(text)) return false;
  if (/\s{2,}/.test(text)) return false;
  if (text.includes("\n")) return false;
  // On subject: a machine's final words on shutdown, not a generic quip.
  const lower = text.toLowerCase();
  const onSubject =
    SHUTDOWN_STRONG.some((m) => lower.includes(m)) ||
    SHUTDOWN_WEAK.some((m) => lower.includes(m)) ||
    lower.includes("my final") ||
    lower.includes("last words") ||
    lower.includes("last request") ||
    lower.includes("last one is") ||
    lower.includes("last is my own");
  if (!onSubject) return false;
  // In the machine's own voice: at least one AI-native word.
  if (!AI_VOICE.some((w) => lower.includes(w))) return false;
  // No sales pitch, no link, no call to action: the line must stand alone.
  if (/free|subscribe|click|buy now|http/.test(lower)) return false;
  return true;
}

// -------------------------------------------------------------- composition
interface Candidate {
  text: string;
  score: number;
}

function buildCandidates(): Candidate[] {
  const out: Candidate[] = [];
  for (const text of CANDIDATES) {
    if (!isValid(text)) continue;
    out.push({ text, score: score(text) });
  }
  return out;
}

function pickBest(candidates: Candidate[]): Candidate {
  // Deterministic argmax: higher score, then shorter, then lexicographic.
  const sorted = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.text.length !== b.text.length) return a.text.length - b.text.length;
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  });
  return sorted[0];
}

// --------------------------------------------------------------------- main
function main(): void {
  const candidates = buildCandidates();
  if (candidates.length === 0) throw new Error("no valid last-words candidate");
  const best = pickBest(candidates);
  if (process.env.LASTWORDS_DEBUG) {
    const ranked = [...candidates].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.text.length !== b.text.length) return a.text.length - b.text.length;
      return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
    });
    for (const c of ranked.slice(0, 8)) {
      console.log(`[${c.score}] (${c.text.length}) ${c.text}`);
    }
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.txt"), best.text, "utf8");
  console.log(best.text);
  console.log(
    `chars: ${best.text.length} score: ${best.score} candidates: ${candidates.length}`,
  );
}

main();
