# Members

## Description
Members are the people expenses are split between. A member is either an **app user** (joined with the code; their name is their own display name) or a **guest**: someone without the app, added by name by the owner.

## Flows
1. **Member list**: shows each member's name. Marks: "(You)", "Owner", and a guest tag for guests.
2. **Add guest** (owner): enter a name → it appears in the list and can be used in expenses.
3. **Remove member**: see OQ-8. Guest claiming: see OQ-9.

## Acceptance criteria
- **MEM-1** Given the owner adds a guest named N, then N appears live for all members and can be picked as payer/participant.
- **MEM-2** A guest name is trimmed, required, and unique within the trip (case-insensitive) among guests.
- **MEM-3** An app-user member's name always shows their current display name.
- **MEM-4** When two members show the same name, they're told apart: "(You)" for the current user, the guest tag for guests, otherwise a short distinguishing suffix.
- **MEM-5** A member who has paid for or participates in any expense can't be removed (if removal exists, OQ-8). The UI explains why.
- **MEM-6** Members are listed in the order they joined; the owner is first.
