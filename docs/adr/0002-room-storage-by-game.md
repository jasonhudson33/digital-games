# Choose room storage by game requirements

Redis stores server-authoritative rooms for Seven Up, Scum, and Hand and Foot; Supabase stores Catan and Monopoly rooms and provides cross-device updates. Mafia deliberately uses separate token-validated Supabase RPCs because shared row access would expose private roles and intents.
