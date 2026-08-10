# Choose room storage by game requirements

Supabase stores every multiplayer room. Seven Up, Scum, and Hand and Foot use a shared server-only table because their state includes private cards and reconnect credentials. Catan and Monopoly use browser-accessible room tables and cross-device updates. Mafia uses separate token-validated Supabase RPCs because roles and intents are private.
