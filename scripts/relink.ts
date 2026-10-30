// Phase 6 last step (docs/rebuild-plan.md): moves an old app user's trips to their new identity.
//   npx tsx scripts/relink.ts --users                  → Auth users, newest first, with names
//   npx tsx scripts/relink.ts <oldUid>=<newUid> …      → dry run: what would change
//   add --apply to write (one batch per trip), --emulator to use the local emulators
import { auth, BATCH_LIMIT, connect } from "./migration/admin";
import { relinkTrip, type NewTrip } from "./migration/map";

const args = process.argv.slice(2);
const { app, db, projectId } = connect(args.includes("--emulator"));
console.log(`Project: ${projectId}`);

if (args.includes("--users")) {
  const users = [];
  let page: string | undefined;
  do {
    const r = await auth(app).listUsers(1000, page);
    users.push(...r.users);
    page = r.pageToken;
  } while (page);
  users.sort((a, b) => Date.parse(b.metadata.creationTime) - Date.parse(a.metadata.creationTime));
  for (const u of users.slice(0, 30)) {
    console.log(`${u.metadata.creationTime}  ${u.uid}  ${u.displayName ?? "(no name)"}`);
  }
  process.exit(0);
}

const pairs = args.filter((a) => a.includes("=")).map((a) => a.split("=") as [string, string]);
if (pairs.length === 0) throw new Error("Give pairs as <oldUid>=<newUid>.");
const apply = args.includes("--apply");
const work: {
  ref: FirebaseFirestore.DocumentReference;
  update: object;
  expenseIds: string[];
  newUid: string;
}[] = [];
const problems: string[] = [];
for (const [oldUid, newUid] of pairs) {
  const user = await auth(app).getUser(newUid); // fails if the new identity doesn't exist
  const trips = await db.collection("trips").where("memberUids", "array-contains", oldUid).get();
  console.log(`\n${oldUid} → ${newUid} (${user.displayName ?? "no name"}): ${trips.size} trips`);
  for (const t of trips.docs) {
    const trip = t.data() as NewTrip;
    const expenses = await t.ref.collection("expenses").get();
    try {
      const { update, expenseIds } = relinkTrip(
        trip,
        Object.fromEntries(expenses.docs.map((e) => [e.id, e.data() as { createdBy: string }])),
        oldUid,
        newUid,
        user.displayName,
      );
      if (expenseIds.length + 1 > BATCH_LIMIT) throw new Error("needs more than one batch");
      console.log(
        `  ${trip.name} [${t.id}]${update.ownerUid === newUid ? " owner," : ""} ${expenseIds.length} expenses`,
      );
      work.push({ ref: t.ref, update, expenseIds, newUid });
    } catch (e) {
      problems.push(`${trip.name} [${t.id}]: ${(e as Error).message}`);
    }
  }
}
if (problems.length) {
  console.log(`\nNothing was written. Problems:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}
if (apply) {
  for (const w of work) {
    const batch = db.batch();
    batch.update(w.ref, w.update);
    for (const id of w.expenseIds)
      batch.update(w.ref.collection("expenses").doc(id), { createdBy: w.newUid });
    await batch.commit();
  }
}
console.log(apply ? "\nDone." : "\nDry run: nothing was written. Add --apply to write.");
process.exit(0);
