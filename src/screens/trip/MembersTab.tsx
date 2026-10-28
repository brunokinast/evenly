import { useEffect, useRef, useState } from "react";
import { ChevronRight, Plus, UserPlus, Users } from "lucide-react";
import { useOnline } from "@/app/online";
import { showToast } from "@/app/toast";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { GroupHeader, IconTile, ListGroup, Row, Tag } from "@/components/List";
import { SubmitField } from "@/components/SubmitField";
import { Sheet } from "@/components/Sheet";
import { addGuest, removeMember } from "@/data/commands";
import { checkGuestName } from "@/domain/members";
import type { Member } from "@/domain/types";
import { isGuest } from "@/domain/types";
import { t, tn } from "@/i18n";
import type { TripView } from "./TripScreen";

type Props = { view: TripView; onInvite: () => void; focusGuest: number };

/** Members tab (MEM-1..7): list in join order, add guest, remove (owner). */
export function MembersTab({ view, onInvite, focusGuest }: Props) {
  const { trip, isOwner } = view;
  const [selected, setSelected] = useState<string | null>(null);
  const member = trip.members.find((m) => m.id === selected) ?? null;

  return (
    <>
      {isOwner && trip.members.length === 1 && (
        // specs/design.md "Invite card": secondary, since Add expense is the screen's one primary.
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3.5">
          <div className="flex items-center gap-3">
            <IconTile>
              <Users />
            </IconTile>
            <div className="min-w-0 flex-1">
              <h2 className="text-row">{t("members.inviteTitle")}</h2>
              <p className="text-caption text-fg-muted">{t("members.inviteBody")}</p>
            </div>
          </div>
          <Button onClick={onInvite}>
            <UserPlus aria-hidden />
            {t("trip.invite")}
          </Button>
        </section>
      )}
      <section>
        <GroupHeader>{tn("members.count", trip.members.length)}</GroupHeader>
        <ListGroup>
          {view.listed.map((id) => {
            const p = view.people.get(id)!;
            const tappable = isOwner && !p.me;
            return (
              <Row
                key={id}
                leading={<Avatar id={id} name={p.name} guest={p.guest} />}
                title={
                  <>
                    {p.name}
                    {p.me && <Tag>{t("common.you")}</Tag>}
                    {p.owner && <Tag>{t("members.owner")}</Tag>}
                    {p.guest && <Tag>{t("members.guest")}</Tag>}
                  </>
                }
                trailing={tappable && <ChevronRight className="size-5 shrink-0 text-fg-muted" aria-hidden />}
                onClick={tappable ? () => setSelected(id) : undefined}
              />
            );
          })}
          {isOwner && <AddGuest view={view} focus={focusGuest} />}
        </ListGroup>
      </section>
      {isOwner && <MemberSheet view={view} member={member} onClose={() => setSelected(null)} />}
    </>
  );
}

/** MEM-1, MEM-2: type a name, Enter adds it; the field stays focused for the next one. */
function AddGuest({ view, focus }: { view: TripView; focus: number }) {
  const online = useOnline();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (focus) input.current?.focus();
  }, [focus]);

  async function submit() {
    if (!online) return; // APP-6
    const check = checkGuestName(name, view.trip.members);
    if (!check.ok) {
      const key =
        check.error === "empty" ? "guest.empty" : check.error === "taken" ? "guest.taken" : "guest.tooLong";
      return setError(t(key, { name: name.trim() }));
    }
    // The guest shows at once (local write); the field is ready for the next name right away.
    setName("");
    input.current?.focus();
    showToast(t("guest.added", { name: check.name }));
    addGuest(view.trip, check.name).catch(() => setError(t("common.error")));
  }

  return (
    <form
      className="flex flex-col gap-1.5 px-3.5 py-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <SubmitField
        ref={input}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        placeholder={t("members.guestName")}
        aria-label={t("members.guestName")}
        invalid={!!error}
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="done"
        submitLabel={t("common.add")}
        icon={<Plus aria-hidden />}
        ready={name.trim().length > 0}
        submitDisabled={!online}
      />
      {error && (
        <p role="alert" className="text-caption text-negative">
          {error}
        </p>
      )}
    </form>
  );
}

/** MEM-5: owner taps a member → this sheet → Remove (with confirmation). */
function MemberSheet({
  view,
  member,
  onClose,
}: {
  view: TripView;
  member: Member | null;
  onClose: () => void;
}) {
  const online = useOnline();
  const [confirming, setConfirming] = useState(false);
  const p = member ? view.people.get(member.id)! : null;
  const uses = member
    ? view.expenses.filter((e) => e.payerId === member.id || member.id in e.shares).length
    : 0;
  const blocked = member !== null && isGuest(member) && uses > 0;

  return (
    <>
      <Sheet open={member !== null && !confirming} onClose={onClose} title={p?.name ?? ""}>
        {member && p && (
          <>
            <div className="flex items-center gap-3 rounded-card border border-border p-3">
              <Avatar id={member.id} name={member.name} guest={p.guest} />
              <span className="min-w-0 flex-1 text-caption text-fg-muted">
                {t(p.guest ? "member.guestInfo" : "member.userInfo")}
              </span>
            </div>
            {blocked && (
              <p className="text-caption text-fg-muted">{tn("member.inExpenses", uses, { name: p.name })}</p>
            )}
            {!p.guest && (
              <p className="text-caption text-fg-muted">{t("member.becomesGuest", { name: p.name })}</p>
            )}
            <Button
              variant="destructive"
              className="w-full"
              disabled={blocked || !online}
              onClick={() => setConfirming(true)}
            >
              {t("member.remove")}
            </Button>
          </>
        )}
      </Sheet>
      <ConfirmSheet
        open={member !== null && confirming}
        title={t("member.removeTitle", { name: p?.name ?? "" })}
        body={p && !p.guest ? t("member.becomesGuest", { name: p.name }) : ""}
        confirm={t("member.remove")}
        cancel={t("common.cancel")}
        errorText={t("common.error")}
        disabled={!online}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          // APP-9: off the list at once; a refusal comes back as a notice.
          removeMember(view.trip, member!).catch(() => showToast(t("common.notSaved")));
          showToast(t("member.removed", { name: p!.name }));
          setConfirming(false);
          onClose();
        }}
      />
    </>
  );
}
