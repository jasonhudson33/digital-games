# Context Map

## Contexts

- [Seven Up](./docs/contexts/seven-up.md) - turn-based card play with private hands
- [Scum](./docs/contexts/scum.md) - ranked shedding rounds and class trades
- [Hand and Foot](./docs/contexts/hand-and-foot.md) - partnership meld play across hands and feet
- [Hearts](./docs/contexts/hearts.md) - classic and Killer Hearts trick-taking rules
- [Mafia](./docs/contexts/mafia.md) - hidden roles, host narration, night actions, and day voting
- [Monopoly](./docs/contexts/monopoly.md) - property ownership, trading, building, rent, and bankruptcy
- [Catan](./docs/contexts/catan.md) - board settlement, production, trading, and expansion rules

## Relationships

- **Seven Up**, **Scum**, and **Hand and Foot** use a shared private, server-side Supabase room-store Module.
- **Catan** and **Monopoly** use the shared Supabase room-sync Adapter and versioned state migrations.
- **Mafia** uses a separate token-validated Supabase RPC model because roles and intents are private.
- All contexts share the Next.js shell, site header, deployment, and root quality pipeline; game rules remain context-owned.
