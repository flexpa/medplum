// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * Batch-insert benchmark harness.
 *
 * Measures the cost of inserting a realistic ~500-resource ONC (g)(10) / USCDI patient chart
 * as a SINGLE FHIR `transaction` Bundle, in-process (no HTTP), against the isolated bench
 * environment (Postgres `medplum_bench` + Redis on 6380).
 *
 * Goal: a repeatable signal for tracking batch-insert performance over time.
 *
 *   - Drives the exact code path the server uses for a transaction Bundle:
 *     `processBatch(req, repo, router, bundle)` with `req.config.transactions = true`,
 *     which opens one DB transaction and creates every entry atomically.
 *   - Resets the bench DB to its seed baseline before EACH iteration (truncates only the
 *     resource tables the chart touches), so every measurement starts from an identical,
 *     constant DB size -> numbers are comparable across runs and across code versions.
 *   - Reports a latency distribution (min/median/p95/p99/max), throughput, and writes a
 *     machine-readable JSON result (with git SHA + host fingerprint) for over-time comparison.
 *   - Optional CPU profile of the measured inserts via the in-process inspector
 *     (`--profile` / MEDPLUM_BENCH_PROFILE=1) -> profiles/bench-*.cpuprofile.
 *
 * Run:
 *   npm run benchmark                 # default: file:medplum.config.json,file:medplum.bench.config.json
 *   npm run benchmark -- --iterations=20 --warmup=5
 *   npm run benchmark:profile         # same, with a CPU profile of the inserts
 */

import { createReference } from '@medplum/core';
import type { FhirRequest } from '@medplum/fhir-router';
import { FhirRouter, processBatch } from '@medplum/fhir-router';
import type { Bundle, Project } from '@medplum/fhirtypes';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Session } from 'node:inspector';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { initAppServices, shutdownApp } from '../app';
import { getConfig, loadConfig } from '../config/loader';
import { DatabaseMode, getDatabasePool } from '../database';
import { getShardSystemRepo, Repository } from '../fhir/repo';
import { PLACEHOLDER_SHARD_ID } from '../fhir/sharding';

const DEFAULT_CONFIG = 'file:medplum.config.json,file:medplum.bench.config.json';
const DEFAULT_BUNDLE = new URL('./fixtures/synthea-patient-chart-500.json', import.meta.url);
const RESULTS_DIR = new URL('../../.bench-results/', import.meta.url);
const PROFILES_DIR = new URL('../../profiles/', import.meta.url);

// Shared denormalized lookup tables that resource writes populate (in addition to the
// per-resource-type tables). Truncated on reset so the baseline stays constant.
const SHARED_LOOKUP_TABLES = ['HumanName', 'Address', 'ContactPoint'];

interface BenchOptions {
  configName: string;
  bundlePath: string;
  iterations: number;
  warmup: number;
  profile: boolean;
}

function parseArgs(argv: string[]): BenchOptions {
  const opts: BenchOptions = {
    configName: DEFAULT_CONFIG,
    bundlePath: DEFAULT_BUNDLE.pathname,
    iterations: Number.parseInt(process.env.MEDPLUM_BENCH_ITERATIONS ?? '10', 10),
    warmup: Number.parseInt(process.env.MEDPLUM_BENCH_WARMUP ?? '3', 10),
    profile: process.env.MEDPLUM_BENCH_PROFILE === '1',
  };
  for (const arg of argv) {
    if (arg.startsWith('--iterations=')) {
      opts.iterations = Number.parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--warmup=')) {
      opts.warmup = Number.parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--bundle=')) {
      opts.bundlePath = arg.split('=')[1];
    } else if (arg === '--profile') {
      opts.profile = true;
    } else if (!arg.startsWith('--')) {
      opts.configName = arg; // positional config identifier, like the server entrypoint
    }
  }
  return opts;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) {
    return sorted[low];
  }
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

interface Stats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  stddev: number;
}

function computeStats(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return {
    count: n,
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stddev: Math.sqrt(variance),
  };
}

function gitSha(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Resolves (creating if needed) a stable, dedicated Project for the benchmark, then returns a
 * project-scoped Repository bound to it — the same kind of repository real transaction inserts
 * use. The Project lives in the (never-truncated) Project table, so it survives resets; using it
 * as the author reference keeps the author valid across truncations.
 * @returns A project-scoped Repository for the benchmark project.
 */
async function getBenchmarkRepo(): Promise<Repository> {
  const PROJECT_NAME = 'Batch Insert Benchmark';
  const systemRepo = getShardSystemRepo(PLACEHOLDER_SHARD_ID, undefined, { skipBackgroundJobs: true });
  const existing = await systemRepo.searchResources<Project>({ resourceType: 'Project', count: 1000 });
  let project = existing.find((p) => p.name === PROJECT_NAME);
  project ??= await systemRepo.createResource<Project>({
    resourceType: 'Project',
    name: PROJECT_NAME,
    strictMode: true,
  });

  return new Repository({
    author: createReference(project),
    projects: [project],
    currentProject: project,
    projectAdmin: true,
    strictMode: project.strictMode ?? true,
    extendedMode: true,
    checkReferencesOnWrite: false,
    validateTerminology: false,
    skipBackgroundJobs: true,
  });
}

/**
 * Truncates the resource tables the chart touches, restoring the seed baseline.
 * @param resourceTypes - The resource types present in the chart bundle.
 */
async function resetToBaseline(resourceTypes: string[]): Promise<void> {
  const pool = getDatabasePool(DatabaseMode.WRITER);
  const tables: string[] = [];
  for (const t of resourceTypes) {
    tables.push(`"${t}"`, `"${t}_History"`, `"${t}_References"`);
  }
  for (const t of SHARED_LOOKUP_TABLES) {
    tables.push(`"${t}"`);
  }
  await pool.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
}

/**
 * Runs `fn` with the in-process V8 CPU profiler active, writing the profile to `outPath`.
 * @param enabled - When false, runs `fn` without profiling.
 * @param outPath - File path to write the `.cpuprofile` to.
 * @param fn - The async function to profile.
 * @returns The result of `fn`.
 */
async function withCpuProfile<T>(enabled: boolean, outPath: string, fn: () => Promise<T>): Promise<T> {
  if (!enabled) {
    return fn();
  }
  const session = new Session();
  session.connect();
  const post = (method: string, params?: object): Promise<any> =>
    new Promise((resolve, reject) => {
      session.post(method, params as never, (err, res) => (err ? reject(err) : resolve(res)));
    });
  await post('Profiler.enable');
  await post('Profiler.setSamplingInterval', { interval: 200 }); // microseconds
  await post('Profiler.start');
  try {
    return await fn();
  } finally {
    const { profile } = await post('Profiler.stop');
    writeFileSync(outPath, JSON.stringify(profile));
    session.disconnect();
    console.log(`\nCPU profile written: ${outPath}`);
    console.log('  Open in Chrome DevTools (Performance > Load profile) or VS Code, or upload to speedscope.app');
  }
}

/**
 * Inserts the chart as one atomic transaction, returning the number of created resources.
 * @param repo - The repository to insert through.
 * @param router - The FHIR router used to dispatch each bundle entry.
 * @param bundle - The transaction Bundle to insert.
 * @returns The number of resources created.
 */
async function insertChart(repo: Repository, router: FhirRouter, bundle: Bundle): Promise<number> {
  const req: FhirRequest = {
    method: 'POST',
    url: '',
    pathname: '',
    body: bundle,
    params: {},
    query: {},
    config: { transactions: true },
  };
  const result = await processBatch(req, repo, router, bundle);
  const entries = result.entry ?? [];
  const failed = entries.filter((e) => !e.response?.status?.startsWith('2'));
  if (failed.length > 0) {
    const detail = failed
      .slice(0, 5)
      .map((e) => `${e.response?.status}: ${JSON.stringify(e.response?.outcome?.issue?.[0]?.details ?? e.response?.outcome)}`)
      .join('\n  ');
    throw new Error(`Transaction had ${failed.length} non-2xx entries:\n  ${detail}`);
  }
  return entries.length;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const config = await loadConfig(opts.configName);

  console.log('Batch-insert benchmark');
  console.log('='.repeat(72));
  console.log(`config:     ${opts.configName}`);
  console.log(`database:   ${config.database.host}:${config.database.port}/${config.database.dbname}`);
  console.log(`redis:      ${config.redis.host}:${config.redis.port}`);
  console.log(`warmup:     ${opts.warmup}   iterations: ${opts.iterations}   profile: ${opts.profile}`);

  await initAppServices(config);

  try {
    const bundle = JSON.parse(readFileSync(opts.bundlePath, 'utf8')) as Bundle;
    const entryCount = bundle.entry?.length ?? 0;
    const histogram: Record<string, number> = {};
    for (const e of bundle.entry ?? []) {
      const rt = e.resource?.resourceType;
      if (rt) {
        histogram[rt] = (histogram[rt] ?? 0) + 1;
      }
    }
    const resourceTypes = Object.keys(histogram);
    console.log(`bundle:     ${opts.bundlePath}`);
    console.log(`resources:  ${entryCount} across ${resourceTypes.length} types`);
    console.log('='.repeat(72));

    const repo = await getBenchmarkRepo();
    const router = new FhirRouter({ introspectionEnabled: getConfig().introspectionEnabled });

    // Warmup (results discarded): warms JIT, connection pool, and prepared statements.
    for (let i = 0; i < opts.warmup; i++) {
      await resetToBaseline(resourceTypes);
      const created = await insertChart(repo, router, structuredClone(bundle));
      console.log(`warmup  ${i + 1}/${opts.warmup}: created ${created}`);
    }

    // Measured iterations. We track both wall-clock and CPU time: wall-clock includes Postgres
    // round-trip waits (this insert path is largely I/O-bound), whereas CPU time (user+system,
    // via process.cpuUsage) isolates the in-process work and is the sensitive metric for
    // CPU-bound optimizations.
    const timings: number[] = [];
    const cpuTimings: number[] = [];
    const profilePath = new URL(`bench-${new Date().toISOString().replace(/[:.]/g, '-')}.cpuprofile`, PROFILES_DIR);
    if (opts.profile) {
      mkdirSync(PROFILES_DIR, { recursive: true });
    }

    await withCpuProfile(opts.profile, profilePath.pathname, async () => {
      for (let i = 0; i < opts.iterations; i++) {
        await resetToBaseline(resourceTypes);
        const clone = structuredClone(bundle);
        const cpu0 = process.cpuUsage();
        const t0 = performance.now();
        const created = await insertChart(repo, router, clone);
        const ms = performance.now() - t0;
        const cpu = process.cpuUsage(cpu0);
        const cpuMs = (cpu.user + cpu.system) / 1000;
        timings.push(ms);
        cpuTimings.push(cpuMs);
        console.log(
          `iter ${String(i + 1).padStart(3)}/${opts.iterations}: ${ms.toFixed(1).padStart(8)} ms wall  ${cpuMs.toFixed(1).padStart(8)} ms cpu  (${created} resources, ${((created / ms) * 1000).toFixed(0)} res/s)`
        );
      }
    });

    const stats = computeStats(timings);
    const cpuStats = computeStats(cpuTimings);
    const throughputMedian = (entryCount / stats.median) * 1000;

    console.log('='.repeat(72));
    console.log('Wall-clock per transaction (ms):');
    console.log(`  min ${stats.min.toFixed(1)}   median ${stats.median.toFixed(1)}   mean ${stats.mean.toFixed(1)}`);
    console.log(`  p90 ${stats.p90.toFixed(1)}   p95 ${stats.p95.toFixed(1)}   p99 ${stats.p99.toFixed(1)}   max ${stats.max.toFixed(1)}   stddev ${stats.stddev.toFixed(1)}`);
    console.log('CPU time per transaction (ms, user+system):');
    console.log(`  min ${cpuStats.min.toFixed(1)}   median ${cpuStats.median.toFixed(1)}   mean ${cpuStats.mean.toFixed(1)}   stddev ${cpuStats.stddev.toFixed(1)}`);
    console.log(`  CPU is ${((cpuStats.median / stats.median) * 100).toFixed(0)}% of wall-clock (rest is Postgres I/O wait)`);
    console.log(`Throughput (median): ${throughputMedian.toFixed(0)} resources/sec`);
    console.log('='.repeat(72));

    // Persist a machine-readable result for over-time comparison.
    const result = {
      benchmark: 'batch-insert-transaction',
      timestamp: new Date().toISOString(),
      git: { sha: gitSha() },
      host: {
        platform: process.platform,
        arch: process.arch,
        cpu: os.cpus()[0]?.model,
        cpuCount: os.cpus().length,
        node: process.version,
      },
      target: {
        database: `${config.database.host}:${config.database.port}/${config.database.dbname}`,
        redis: `${config.redis.host}:${config.redis.port}`,
      },
      bundle: { path: opts.bundlePath, entryCount, histogram },
      run: { warmup: opts.warmup, iterations: opts.iterations },
      stats,
      cpuStats,
      throughputResourcesPerSecMedian: throughputMedian,
      timingsMs: timings,
      cpuTimingsMs: cpuTimings,
    };
    mkdirSync(RESULTS_DIR, { recursive: true });
    const stamped = new URL(`batch-insert-${result.timestamp.replace(/[:.]/g, '-')}.json`, RESULTS_DIR);
    writeFileSync(stamped.pathname, JSON.stringify(result, null, 2));
    writeFileSync(new URL('latest.json', RESULTS_DIR).pathname, JSON.stringify(result, null, 2));
    console.log(`Result written: ${stamped.pathname}`);

    // Leave the DB at the clean baseline.
    await resetToBaseline(resourceTypes);
  } finally {
    await shutdownApp();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
