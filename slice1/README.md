# slice one

The first playable piece of SKYSWIPED: a tiny f0G terminal with three pads, two strata, one key and a ledger.

```
node slice1/arx.js            # play (the ledger remembers earlier sessions)
node slice1/arx.js --fresh    # wipe the ledger and start over
```

Type `help` once you're in. No packages to install, only Node.

## What's here

| File | What it is |
|---|---|
| `arx.js` | The terminal. Plain Node, commented for reading. |
| `pads/lace.renew.txt` | Pad 1, LIVE stratum. Wren's lace renewal (warp, `LCE-`). |
| `pads/wealthcode.notice.txt` | Pad 2, SURFACE. The polite form, plus the floor's VOUCH / REPORT buttons. |
| `pads/case.raw.txt` | Pad 3, SURFACE, locked. The raw record. `{...}` fields are filled from what you did. |
| `ledger.json` | Made when you play. Every act you take, including the ones you asked it to forget. Not committed. |

## Not canon

Everything here is a draft. The pad texts are copied from the drafts in the project's `writing/` folder
(`[v1-draft][laceRenewal][SKY]`, `[v1-draft][wealthcodeNotice][SKY]`, `[v1-draft][caseRaw][SKY]`);
edit those and re-copy the text inside the code block. Canon lives only on the `SKYSWIPED` branch.
