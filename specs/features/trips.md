# Trips

## Description

A trip groups members and expenses. It has a name, an icon and a currency. The person who creates it is its **owner**.

## Flows

1. **Home** lists every trip the user belongs to (owned or joined), newest first. Each item shows the icon, name, currency and creation date.
2. **Empty state**: with no trips, Home explains what to do and offers "New trip" and "Join trip".
3. **Create trip**: name (required), icon (one of a fixed set, default luggage) and currency (BRL, USD, EUR, GBP). After creating it, the user stays on Home: the sheet closes, the new trip is at the top of the list, and a short notice confirms it ("Lisbon created").
4. **Trip screen**: shows the trip name, an **Invite** button for the owner (always visible, not inside a menu), and Expenses, Balances and Members sections.
5. **Trip settings (owner only)**: invite (see invites spec), add a guest, rename the trip, delete the trip. Members see "Leave trip".

## Acceptance criteria

- **TRIP-1** Given a user creates a trip, then it appears at the top of their Home immediately, and they're its owner and first member.
- **TRIP-2** A trip name is required (trimmed, non-empty).
- **TRIP-3** Currency is chosen at creation from BRL, USD, EUR, GBP, defaulting to the one matching the user's language (PT-BR → BRL, otherwise the last one they used, else USD). It can't be changed afterwards.
- **TRIP-10** Create trip opens with the name field focused and the keyboard up; icon and currency have defaults. Enter on the name closes the keyboard (so the icon and currency are in view to change); the Create trip button creates it.
- **TRIP-11** The owner can rename the trip; the new name shows live for all members.
- **TRIP-4** Icon is chosen from: luggage, flight, beach, camping, restaurant, home, celebration, sports, music, shopping, car, boat, mountain, city, work, school.
- **TRIP-5** Home shows exactly the trips the user is a member of: no more, no less. It updates live when the user joins, leaves or is removed, or when a trip is deleted.
- **TRIP-6** Only the owner sees and can use owner actions; non-owners can't perform them even by bypassing the UI.
- **TRIP-7** Given the owner deletes a trip (after confirming "This cannot be undone"), then the trip, its members and its expenses are removed, and it disappears live from every member's Home. A member currently viewing it is taken back to Home with a short notice.
- **TRIP-8** Only members can see a trip's details, members and expenses.
- **TRIP-9** Opening a trip that doesn't exist or that the user can't access shows "Trip not found" with a way back to Home.
