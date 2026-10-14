#!/usr/bin/env node
// SKYSWIPED, slice one: a tiny f0G terminal.
//
// Three pads, two strata (Live and Surface), one key, and a ledger that
// quietly records everything you do. Run it with:
//
//   node slice1/arx.js            keep the ledger from earlier sessions
//   node slice1/arx.js --fresh    wipe the ledger and start over
//
// No packages needed, only Node.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ---------------------------------------------------------------------------
// World data for this slice. Pads are plain text files in ./pads so the
// writing can change without touching the code.
// ---------------------------------------------------------------------------

const PAD_DIR = path.join(__dirname, 'pads');
const LEDGER_FILE = path.join(__dirname, 'ledger.json');

// The burner IOD the Matrix seats you under (from the netGuide draft example).
const BURNER_IOD = 'ORD-1676-29-JEXL-UU';

// The key printed at the bottom of wealthcode.notice.
const CASE_KEY = 'WC-271-0611';

const STRATA = {
  live: {
    label: 'LIVE',
    note: 'present-day node. watched.',
    pads: ['lace.renew'],
  },
  surface: {
    label: 'SURFACE',
    note: 'frozen pages. nothing updates.',
    pads: ['wealthcode.notice', 'case.raw'],
  },
};

function readPad(name) {
  return fs.readFileSync(path.join(PAD_DIR, name + '.txt'), 'utf8');
}

// ---------------------------------------------------------------------------
// The ledger. Every act lands here, including the ones you asked it to forget.
// ---------------------------------------------------------------------------

function loadLedger(fresh) {
  if (fresh || !fs.existsSync(LEDGER_FILE)) return { sessions: 0, acts: [] };
  try {
    return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
  } catch {
    return { sessions: 0, acts: [] };
  }
}

function saveLedger() {
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2));
}

function logAct(type, target, detail = '') {
  ledger.acts.push({ t: Date.now(), session: ledger.sessions, type, target, detail });
  saveLedger();
}

// ---------------------------------------------------------------------------
// Session state.
// ---------------------------------------------------------------------------

const fresh = process.argv.includes('--fresh');
const ledger = loadLedger(fresh);
ledger.sessions += 1;
saveLedger();

const state = {
  stratum: 'live',
  accepted: false, // has the viewing banner been accepted?
  pendingBanner: false, // is the banner waiting for an answer?
  sawWren: false, // did you watch her session?
  readNotice: false,
  floorChoice: null, // 'vouch' | 'report' | null
  unlocked: false,
  done: false,
};

// ---------------------------------------------------------------------------
// Output helpers.
// ---------------------------------------------------------------------------

function say(text = '') {
  process.stdout.write(text + '\n');
}

function boot() {
  say('░▒▓ archae.mtrx ▓▒░  carrier: ēther, faint');
  say(`  seating node .......... ok`);
  say(`  --sudo IOD:${BURNER_IOD}  (burner)`);
  say(`  --ghost.sendout ....... ok`);
  if (ledger.sessions > 1) say(`  welcome back ✓  (session ${ledger.sessions})`);
  say('');
  say(`  stratum: ${STRATA.live.label}  //  ${STRATA.live.note}`);
  say('  type help for known forms.');
  say('');
}

function help() {
  say('known forms:');
  say('  ls                       list pads on this stratum');
  say('  open\\<pad>               open a pad      (open lace.renew works too)');
  say('  open\\<pad> --key:<ref>   open a locked pad with a value');
  say('  dig                      drop one stratum');
  say('  surface                  climb back to the top');
  say('  burn                     cut the link');
  say('  any form + --nolog...    keep your trace off the watchlist');
}

function ls() {
  const s = STRATA[state.stratum];
  say(`${s.label}  //  ${s.note}`);
  for (const pad of s.pads) {
    const locked = pad === 'case.raw' && !state.unlocked ? '   [locked: needs value]' : '';
    say(`  ${pad}${locked}`);
  }
}

// ---------------------------------------------------------------------------
// Pads.
// ---------------------------------------------------------------------------

function openPad(name, opts) {
  if (!STRATA[state.stratum].pads.includes(name)) {
    say(`no pad "${name}" on ${STRATA[state.stratum].label}. try ls.`);
    return;
  }
  logAct('open', name, opts.key ? `key:${opts.key}` : '');

  if (name === 'lace.renew') return openLace();
  if (name === 'wealthcode.notice') return openNotice();
  if (name === 'case.raw') return openCase(opts.key);
}

// Live is a licensed view: the warp asks first, and there is no "no".
function openLace() {
  if (!state.accepted) {
    state.pendingBanner = true;
    say('LCE- this session is a licensed view.');
    say('     accept the viewing terms to continue:');
    say('     [ accept ]    [ accept later ]');
    return;
  }
  showLace();
}

function showLace() {
  say(readPad('lace.renew'));
  state.sawWren = true;
  logAct('watch', 'session:Wren', 'external viewer on live session');
}

function openNotice() {
  say(readPad('wealthcode.notice'));
  state.readNotice = true;
  if (!state.floorChoice) say('  (type vouch or report, or leave it.)');
}

function floor(choice) {
  if (!state.readNotice || state.stratum !== 'surface') {
    say('nothing here to answer.');
    return;
  }
  if (state.floorChoice) {
    say('your floor input is already recorded ✓');
    return;
  }
  state.floorChoice = choice;
  logAct(choice, 'WC-271-0611');
  if (choice === 'report') say('noise reported ✓  +1 shift streak ✦  thank you for keeping 2-71 permitted');
  else say('vouch recorded ✓  vouches are reviewed alongside the record.');
}

function openCase(key) {
  if (!state.unlocked) {
    if (!key) {
      say('case.raw is locked. it needs a value: open\\case.raw --key:<ref>');
      return;
    }
    if (key.toUpperCase() !== CASE_KEY) {
      say(`value "${key}" rejected.`);
      logAct('key_rejected', 'case.raw', key);
      return;
    }
    state.unlocked = true;
  }

  // The record is filled in from what you actually did this session.
  const viewers = state.sawWren ? 1 : 0;
  const attention = state.sawWren ? 0.19 : 0;
  const noise = 11 + (state.floorChoice === 'report' ? 1 : 0);
  const vouch = state.floorChoice === 'vouch' ? 1 : 0;
  const weight = 0.62 + attention + (noise - 11) * 0.01 - vouch * 0.01;
  const paused = weight >= 0.8;

  const text = readPad('case.raw')
    .replace('{viewers}', String(viewers))
    .replace('{iod}', state.sawWren ? BURNER_IOD : 'none')
    .replace('{attention_weight}', state.sawWren ? '+0.19' : '+0.00')
    .replace('{weight_final}', `${weight.toFixed(2)}  -> ${paused ? 'PAUSE' : 'REVIEW'}`)
    .replace('{noise}', String(noise))
    .replace('{vouch}', String(vouch))
    .replace(
      '{outcome}',
      paused ? 'mãnotl PAUSED · shifts closed · code (paused)' : 'REVIEW pending statement · hands still'
    );
  say(text);
  logAct('read', 'case.raw', 'raw fields');
  receipt();
}

// ---------------------------------------------------------------------------
// The receipt: the ledger comes back.
// ---------------------------------------------------------------------------

const RECEIPT_LINES = {
  accept: (a) => `accepted viewing terms ........ ${a.target}`,
  accept_later: (a) => `chose "accept later" .......... reminder set`,
  watch: (a) => `watched ....................... ${a.target}  (counted as attention)`,
  open: (a) => `opened ........................ ${a.target}${a.detail ? '  ' + a.detail : ''}`,
  report: (a) => `reported noise ................ ${a.target}  (+1 streak paid)`,
  vouch: (a) => `vouched ....................... ${a.target}`,
  key_rejected: (a) => `tried a wrong value ........... ${a.detail}`,
  nolog: (a) => `asked not to be logged ........ "${a.detail}"  (logged)`,
  read: (a) => `read raw record ............... ${a.target}`,
};

function receipt() {
  state.done = true;
  say('');
  say('  ~ ~ ~ ēther bleed ~ ~ ~');
  say(`  [shadow log]  receipt for ${BURNER_IOD}  (${ledger.sessions} session${ledger.sessions > 1 ? 's' : ''})`);
  for (const a of ledger.acts) {
    const line = RECEIPT_LINES[a.type];
    if (line) say(`    s${a.session}  ${line(a)}`);
  }
  say('  thank you for keeping 2-71 permitted ✓');
  say('  ~ ~ ~ bleed closed ~ ~ ~');
  say('');
  say('end of slice one. type burn to cut the link.');
}

// ---------------------------------------------------------------------------
// Parsing. f0G is forgiving here: "open\pad", "open pad",
// "arx.dive>open\pad" and "arx> : open\pad" all mean the same thing.
// ---------------------------------------------------------------------------

function parse(line) {
  let s = line.trim();
  s = s.replace(/^arx>\s*:?\s*/, '').replace(/^arx\.dive(\.\w+)?>/, '');

  const tokens = s.split(/\s+/).filter(Boolean);
  const opts = { key: null, nolog: [] };
  const words = [];
  for (const tok of tokens) {
    if (tok.startsWith('--nolog')) opts.nolog.push(tok);
    else if (tok.startsWith('--key:')) opts.key = tok.slice('--key:'.length);
    else words.push(tok);
  }

  // "open\pad" -> ["open", "pad"]
  let [cmd = '', ...rest] = words;
  if (cmd.includes('\\')) {
    const [c, target] = cmd.split('\\');
    cmd = c;
    rest.unshift(target);
  }
  return { cmd: cmd.toLowerCase(), args: rest, opts };
}

function handle(line) {
  const { cmd, args, opts } = parse(line);
  if (!cmd) return;

  // Evasion is also data.
  for (const flag of opts.nolog) {
    logAct('nolog', cmd, flag);
    say('LOG SUPPRESSED ✓');
  }

  // The banner only understands two answers.
  if (state.pendingBanner) {
    if (cmd === 'accept' && args.join(' ') === 'later') {
      state.pendingBanner = false;
      logAct('accept_later', 'viewing terms');
      say('LCE- noted ✓ we will ask again. you can view this session after you accept.');
      return;
    }
    if (cmd === 'accept') {
      state.pendingBanner = false;
      state.accepted = true;
      logAct('accept', 'viewing terms');
      say('LCE- thank you ✓ enjoy your view.');
      showLace();
      return;
    }
    say('LCE- please choose:  [ accept ]    [ accept later ]');
    return;
  }

  switch (cmd) {
    case 'help':
      return help();
    case 'ls':
    case 'directory':
      return ls();
    case 'open':
      if (!args[0]) return say('open what? try ls.');
      return openPad(args[0], opts);
    case 'dig':
      if (state.stratum === 'surface') return say('the next stratum down is not mounted in this slice.');
      state.stratum = 'surface';
      logAct('dig', 'SURFACE');
      return say(`  ...mounting stratum: ${STRATA.surface.label}  //  ${STRATA.surface.note}`);
    case 'surface':
      state.stratum = 'live';
      return say(`  ...climbing to ${STRATA.live.label}  //  ${STRATA.live.note}`);
    case 'vouch':
    case 'report':
      return floor(cmd);
    case 'accept':
      return say('nothing is asking you to accept anything right now.');
    case 'burn':
    case 'exit':
    case 'quit':
      say('link cut. ēther quiet.');
      rl.close();
      return;
    default:
      say(`unknown form "${cmd}". type help.`);
  }
}

// ---------------------------------------------------------------------------
// Main loop.
// ---------------------------------------------------------------------------

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY,
});

boot();
rl.setPrompt(state.pendingBanner ? 'LCE- ' : 'arx> ');
rl.prompt();
rl.on('line', (line) => {
  if (!process.stdin.isTTY) say(line); // echo input when piped, so transcripts read right
  handle(line);
  rl.setPrompt(state.pendingBanner ? 'LCE- ' : 'arx> ');
  rl.prompt();
});
rl.on('close', () => {
  saveLedger();
  process.exit(0);
});
