# Members

## Description
Members are the people expenses are split between. A member is either an **app user** (joined with a code; their name is their own display name) or a **guest**: someone without the app, added by name by the owner.

## Flows
1. **Member list**: shows each member's name. Marks: "(You)", "Owner", and a guest tag for guests.
2. **Add guest** (owner): type a name (keyboard already open) → Enter → it appears in the list and can be used in expenses.
3. **Claim a guest**: while joining, a user can pick a guest that is them; they take over that guest's place, including past expenses.
4. **Remove member** (owner) and **Leave trip** (any member except the owner), each after a confirmation. An app user who leaves or is removed **becomes a guest** with the same name, so their expenses and balance stay. If they rejoin later, they can claim that guest back.

## Acceptance criteria
- **MEM-1** Given the owner adds a guest named N, then N appears live for all members and can be picked as payer/participant.
- **MEM-2** A guest name typed by the owner is trimmed, required, and unique within the trip (case-insensitive) among guests. A member who becomes a guest (MEM-5) keeps their name even if it matches another guest; MEM-4 tells them apart.
- **MEM-3** An app-user member's name always shows their current display name.
- **MEM-4** When two members show the same name, they're told apart: "(You)" for the current user, the guest tag for guests, otherwise a short distinguishing suffix.
- **MEM-5** Given an app-user member leaves or is removed, then they become a guest with their current name, keeping their place in the list, their expenses and their balance. The owner can remove a guest only if the guest isn't in any expense; otherwise the UI explains why ("Remove them from expenses first").
- **MEM-6** Members are listed in the order they joined; the owner is first.
- **MEM-7** Given a joining user claims guest G, then G becomes that user: every expense involving G now shows the user, and G no longer appears as a guest. Claiming is optional and each guest can be claimed once.
- **MEM-8** The owner can't leave their own trip (they can delete it instead).
- **MEM-9** Given a member leaves or is removed, the trip disappears live from their Home and they lose access immediately.
