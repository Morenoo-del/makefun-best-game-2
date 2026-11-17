// Ember Grove — the entry program (Node 22, standard library only).
//
// It hands the game in: it copies this repository's game/ and screenshots/
// beside it into /output and writes /output/dossier.json, the summary the
// judge reads, using the vendored make.fun library. The grader runs it
// twice and both runs must write the same bytes, so there is no clock, no
// randomness and no network here — just copies and the dossier build.
//
// Run it locally first:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps the sealed scorer enforces (reference/gate.json): game/ at most
// 993 entries and 48 MiB, index.html at most 1 MiB, 4 screenshots at most
// 256 KiB each, the dossier at most 1.5 MiB with 160 KiB of source text.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
if (!existsSync(dossierPath)) throw new Error('dossier.json was not written');
