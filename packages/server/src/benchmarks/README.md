# Batch-insert benchmark

A repeatable benchmark for the cost of inserting a realistic ONC **(g)(10) / USCDI** patient
chart as a **single FHIR `transaction` Bundle**. It exists to give a stable signal for tracking
batch-insert performance over time (catching regressions and confirming improvements).

## What it measures

- **Only the batch-insert path, in one call.** It drives the exact code the server uses for a
  transaction Bundle — `processBatch(req, repo, router, bundle)` with `req.config.transactions =
  true` — which opens a single Postgres transaction and atomically creates every entry. This
  covers resource validation, search-parameter indexing, the SQL writes, and the `_History` /
  `_References` companion writes.
- **In-process** (no HTTP, auth, rate-limiting, or JSON-over-the-wire). That isolates the insert
  work from transport noise so run-to-run deltas reflect the insert path itself.
- The repository is **project-scoped** (a dedicated `Batch Insert Benchmark` project) with
  `strictMode: true`, mirroring a real write. Terminology validation and write-time reference
  checking are off (the payload is self-contained; these would add unrelated noise).

## The dataset

`fixtures/synthea-patient-chart-500.json` — a **real, off-the-shelf [Synthea](https://github.com/synthetichealth/synthea)
patient** (R4, Nov 2021 sample set), normalized into a self-contained, all-`POST` transaction of
**exactly 500 resources** across 19 types:

```
Observation 207, DiagnosticReport 59, Procedure 53, Condition 31, Claim 31, Encounter 26,
DocumentReference 26, ExplanationOfBenefit 26, Immunization 13, MedicationRequest 5,
Practitioner 3, Location 3, Organization 3, CareTeam 3, CarePlan 3, Medication 3,
MedicationAdministration 3, Patient 1, Provenance 1
```

Normalization applied to make it a clean, repeatable, single-transaction payload (see
**Regenerating the fixture** below for the exact, runnable transform):

- Merged the referenced Organizations / Practitioners / Locations from Synthea's separate
  `hospitalInformation` / `practitionerInformation` files into the bundle, and rewrote the
  conditional `Type?identifier=…` references to in-bundle `urn:uuid` references. Result: **0
  dangling references, 0 conditional lookups** — every reference resolves inside the transaction.
- Stripped `meta.profile`. Synthea claims conformance to US Core + base FHIR profiles; under
  strict validation the server enforces the profiles it has loaded (e.g. the base FHIR Blood
  Pressure profile, whose `SystolicBP`/`DiastolicBP` slices Synthea's shape doesn't satisfy).
  Dropping `meta.profile` keeps full structural validation + indexing (the real insert cost)
  without failing on profile slices.

To swap in a different chart, point `--bundle=<path>` at any transaction Bundle, or regenerate the
fixture from a different Synthea patient.

## Prerequisites

- The isolated bench services must be up: Postgres **`medplum_bench`** on `localhost:5432`
  (user/pw `medplum`) and Redis on **`localhost:6380`** (no password). These are configured by
  `packages/server/medplum.bench.config.json`, which also sets `database.runMigrations: false`.
- `medplum_bench` must be **seeded and migrated to the current schema** (it is — same migration
  version as the dev DB). If you ever recreate it, run the server once against it with migrations
  enabled / let it seed, then switch back to `runMigrations: false`.

## Running

```bash
cd packages/server

npm run benchmark                          # warmup 3, 10 measured iterations (defaults)
npm run benchmark -- --iterations=20 --warmup=5
npm run benchmark:profile                  # same, plus a CPU profile of the measured inserts
npm run benchmark -- --bundle=/path/to/other-transaction-bundle.json
```

Options (flags or env vars):

| Flag | Env | Default | Meaning |
|------|-----|---------|---------|
| `--iterations=N` | `MEDPLUM_BENCH_ITERATIONS` | 10 | measured iterations |
| `--warmup=N` | `MEDPLUM_BENCH_WARMUP` | 3 | discarded warmup iterations (JIT/pool warm-up) |
| `--profile` | `MEDPLUM_BENCH_PROFILE=1` | off | capture a CPU profile of the measured loop |
| `--bundle=PATH` | `MEDPLUM_BENCH_BUNDLE` | the vendored fixture | transaction Bundle to insert |
| _(positional)_ | — | `file:medplum.config.json,file:medplum.bench.config.json` | config identifier |

## Repeatability: reset to seed baseline

Per the design goal, **every iteration starts from an identical DB state**. Before each
warmup/measured iteration the harness `TRUNCATE`s exactly the tables the chart touches — for each
of the 19 resource types: `"<Type>"`, `"<Type>_History"`, `"<Type>_References"`, plus the shared
`HumanName` / `Address` / `ContactPoint` lookup tables — restoring the post-seed baseline. The
foundational seed data (StructureDefinitions, SearchParameters, ValueSets, the benchmark Project)
is never touched. This is why iteration timings are tight (typically <1% spread) and comparable
across runs and code versions.

## Results

Each run writes a machine-readable JSON to `packages/server/.bench-results/` (git-ignored):
`batch-insert-<timestamp>.json` plus `latest.json`. It records the git SHA, host fingerprint
(CPU model, core count, Node version), the target DB/Redis, the bundle's size + histogram, the run
parameters, the full latency distribution (min / median / mean / p90 / p95 / p99 / max / stddev),
median throughput (resources/sec), and the raw per-iteration timings.

To track performance over time, keep the JSONs you care about (e.g. one per release) and diff
`stats.median` / `throughputResourcesPerSecMedian` for the same host. Compare like-for-like: the
git SHA and host fields are recorded so you don't accidentally compare across machines.

## CPU profiling

`npm run benchmark:profile` wraps the measured loop with the in-process V8 profiler
(`node:inspector`) and writes `profiles/bench-<timestamp>.cpuprofile` (git-ignored). Because the
profile is captured and written programmatically, it works regardless of how the process exits —
no signal/flag gymnastics. Open it in Chrome DevTools (**Performance → Load profile**), VS Code,
or [speedscope.app](https://speedscope.app) to see where insert time goes (validation, indexing,
SQL, serialization).

> The profile covers the measured loop, which includes the per-iteration `TRUNCATE` resets; those
> are DB-side and contribute negligible Node CPU, so the flame graph is dominated by insert work.

## Regenerating the fixture

To rebuild the fixture (e.g. from a different Synthea patient, a larger chart, or a g10-only mix
that drops `Claim`/`ExplanationOfBenefit`):

```bash
# 1. Download Synthea's pre-generated R4 sample set (~90 MB), unzip the FHIR bundles.
curl -sL -o /tmp/synthea_r4.zip \
  https://raw.githubusercontent.com/synthetichealth/synthea-sample-data/main/downloads/synthea_sample_data_fhir_r4_nov2021.zip
unzip -q /tmp/synthea_r4.zip -d /tmp/synthea            # -> /tmp/synthea/fhir/*.json

# 2. Run the prep transform (below) against a patient bundle + the hospital/practitioner files.
node prep.mjs /tmp/synthea/fhir/Ned189_*.json src/benchmarks/fixtures/synthea-patient-chart-500.json
```

`prep.mjs` (a standalone dev script — not part of the build) merges the provider resources the
patient references out of `hospitalInformation*.json` / `practitionerInformation*.json`, rewrites
the conditional `Type?identifier=…` references to in-bundle `urn:uuid`, forces every entry to
`POST <resourceType>`, and strips `meta`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
const [patientFile, out] = process.argv.slice(2);
const dir = '/tmp/synthea/fhir';
const load = (f) => JSON.parse(readFileSync(f, 'utf8'));
const patient = load(patientFile);
const info = [load(`${dir}/hospitalInformation1637345232350.json`), load(`${dir}/practitionerInformation1637345232350.json`)];
const index = new Map();
for (const b of info) for (const e of b.entry ?? []) for (const id of e.resource.identifier ?? []) index.set(`${e.resource.resourceType}|${id.system}|${id.value}`, e);
const COND = /^([A-Za-z]+)\?identifier=(.+)$/;
const pulled = new Map();
const rewrite = (n) => {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) return n.forEach(rewrite);
  for (const k of Object.keys(n)) {
    const m = k === 'reference' && typeof n[k] === 'string' && COND.exec(n[k]);
    if (m) {
      const pipe = m[2].lastIndexOf('|');
      const t = index.get(`${m[1]}|${m[2].slice(0, pipe)}|${m[2].slice(pipe + 1)}`);
      if (t) { if (!pulled.has(t.fullUrl)) { pulled.set(t.fullUrl, t); rewrite(t.resource); } n[k] = t.fullUrl; }
    } else rewrite(n[k]);
  }
};
for (const e of patient.entry) rewrite(e.resource);
const norm = (e) => { delete e.resource.meta; return { fullUrl: e.fullUrl, resource: e.resource, request: { method: 'POST', url: e.resource.resourceType } }; };
const entry = [...[...pulled.values()].map(norm), ...patient.entry.map(norm)];
writeFileSync(out, JSON.stringify({ resourceType: 'Bundle', type: 'transaction', entry }));
console.log('entries:', entry.length);
```

Pick a patient whose entry count lands near your target (Synthea adults range from ~100 to a few
thousand resources). The vendored fixture used `Ned189_Emmerich580_*` (491 entries + 9 merged
providers = 500). Synthea output is freely usable synthetic data (no real PHI).

## Caveats

- Numbers are only comparable on the **same machine** against the **same bench DB schema**.
- This measures the in-process insert path, not end-to-end API latency (no Express/auth/network).
- The bench DB and Redis are shared dev-container services; don't run this against a DB you care
  about — it truncates resource tables.
