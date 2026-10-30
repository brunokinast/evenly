// Phase 6 migration (docs/data-model.md "Migration", docs/rebuild-plan.md "Phase 6 handoff").
//   npx tsx scripts/migrate.ts                     → dry run on the real project: backup + what it would do
//   npx tsx scripts/migrate.ts --apply             → backup, then migrate the real project
//   npx tsx scripts/migrate.ts --from <backup>     → dry run from a backup file (reads nothing)
//   add --emulator to use the local emulators (the LAN preview's project) instead of the real project
//   npx tsx scripts/migrate.ts --emulator --restore <backup>  → load a backup into the emulators
import { readFileSync } from "node:fs";
import { BATCH_LIMIT, connect, readAll, restore, saveBackup } from "./migration/admin";
import { planMigration, type Backup, type Plan } from "./migration/map";
import { balances } from "../src/domain/balances";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const emulator = flag("--emulator");
const fromFile = option("--from");
const restoreFile = option("--restore");
const loadBackup = (file: string) => JSON.parse(readFileSync(file, "utf8")) as Backup;

if (fromFile) {
  report(planMigration(loadBackup(fromFile)));
  process.exit(0);
}

const { db, projectId } = connect(emulator);
console.log(`Project: ${projectId}${emulator ? " (emulators)" : ""}`);

if (restoreFile) {
  if (!emulator) throw new Error("--restore only works with --emulator.");
  console.log(`Restored ${await restore(db, loadBackup(restoreFile))} documents from ${restoreFile}.`);
  process.exit(0);
}

const backup = await readAll(db, projectId);
console.log(`Backup: ${saveBackup(backup)}`);
const plan = planMigration(backup);
report(plan);
if (!flag("--apply")) {
  console.log("\nDry run: nothing was written. Add --apply to migrate.");
  process.exit(0);
}

for (const k of plan.keep) {
  const ops = 1 + Object.keys(k.expenses).length + k.leftovers.length;
  if (ops > BATCH_LIMIT)
    throw new Error(`trip ${k.id} needs ${ops} writes, over one batch; nothing was written.`);
}
for (const k of plan.keep) {
  const batch = db.batch();
  const trip = db.doc(`trips/${k.id}`);
  batch.set(trip, k.trip);
  for (const [id, e] of Object.entries(k.expenses)) batch.set(trip.collection("expenses").doc(id), e);
  for (const path of k.leftovers) batch.delete(db.doc(`trips/${k.id}/${path}`));
  await batch.commit();
  console.log(`migrated ${k.id}`);
}
for (const d of plan.drop) {
  await db.recursiveDelete(db.doc(`trips/${d.id}`));
  console.log(`deleted ${d.id}`);
}
if (backup.collections.users) {
  await db.recursiveDelete(db.collection("users"));
  console.log("deleted users");
}

// Read back what was written and compare balances with the plan.
let bad = 0;
for (const k of plan.keep) {
  const trip = (await db.doc(`trips/${k.id}`).get()).data();
  const expenses = (await db.collection(`trips/${k.id}/expenses`).get()).docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  const ids = Object.keys(trip?.members ?? {});
  const now = balances(ids, expenses as never);
  for (const c of k.check) if (now.get(c.memberId) !== c.new) bad++;
  if (expenses.length !== Object.keys(k.expenses).length) bad++;
}
console.log(
  bad ? `\nCHECK FAILED: ${bad} differences after writing.` : "\nChecked: written balances match the plan.",
);
process.exit(bad ? 1 : 0);

function report(plan: Plan) {
  const money = (cents: number) => (cents / 100).toFixed(2);
  console.log(`\nKeep ${plan.keep.length} trips:`);
  for (const k of plan.keep) {
    const allOk = k.check.every((c) => c.ok);
    console.log(
      `\n  ${k.trip.name} [${k.id}] ${k.trip.currency}, ${Object.keys(k.expenses).length} expenses, created ${new Date(k.trip.createdAt).toISOString().slice(0, 10)}`,
    );
    for (const c of k.check) {
      const m = k.trip.members[c.memberId]!;
      const who = m.uid ? `app user ${m.uid}${m.uid === k.trip.ownerUid ? " (owner)" : ""}` : "guest";
      console.log(
        `    ${c.name.padEnd(20)} ${who.padEnd(44)} old ${money(c.old).padStart(10)}  new ${money(c.new).padStart(10)}${c.ok ? "" : "  MISMATCH"}`,
      );
    }
    if (!allOk) console.log("    BALANCES DIFFER");
  }
  console.log(`\nDrop ${plan.drop.length} trips:`);
  for (const d of plan.drop) console.log(`  ${d.name || "(no name)"} [${d.id}]: ${d.reason}`);
  if (plan.alreadyNew.length)
    console.log(`\nAlready in the new shape, left alone: ${plan.alreadyNew.length} trips`);
  if (plan.otherCollections.length)
    console.log(`\nOther root collections, left alone: ${plan.otherCollections.join(", ")}`);
  if (plan.warnings.length) console.log(`\nWarnings:\n${plan.warnings.map((w) => `  ${w}`).join("\n")}`);
}
