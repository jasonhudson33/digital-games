# Sequence context

Sequence is a room-based card-and-board game for official table sizes of 2, 3, 4, 6, 8, 9, 10, or 12 players. Human and computer seats may be mixed. Up to three players may play individually; larger tables divide evenly into two or three teams, with teammates seated in alternating turn order.

## Rules owned here

- The board is the classic 10×10 layout: every non-Jack card appears twice and the four corners are shared free spaces.
- The deck contains two standard 52-card decks without Jokers.
- Two-eyed Jacks place a chip on any open non-corner space. One-eyed Jacks remove an opponent chip unless it is part of a completed sequence.
- A dead card may be exchanged once at the beginning of a turn when both matching board spaces are occupied.
- A sequence is five team chips in a horizontal, vertical, or diagonal line. A second sequence may overlap the first at one space.
- Two players or teams need two sequences. Three players or teams need one.
- Completed sequences are protected from removal.

## Rooms and computers

Rooms use the shared server-only Supabase room store and five-character codes. The host can add or remove computer seats in the lobby. Computer turns are chosen from the same legal target functions used for human turns and prioritize strong lines, blocking moves, and removal of threats.
