import sys

p = sys.argv[1]
s = open(p, encoding="utf-8").read()

def do(old, new, n=1, label=""):
    global s
    count = s.count(old)
    assert count == n, f"{label or old[:60]!r}: expected {n}, found {count}"
    s = s.replace(old, new)

# 1) Base tableau/suit-lane block: replace the edge-slot machinery with the
#    growing fan, and give the new felt seating section a width to sit in.
old_base = """.tableau {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.suit-lane {
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 244, 236, 0.96));
}

.suit-lane h3 {
  margin: 0 0 12px;
  text-transform: capitalize;
  font-size: 1rem;
}

.suit-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  min-height: 132px;
  overflow: hidden;
}

.suit-cards.condensed {
  grid-template-columns: auto auto;
  justify-content: center;
  gap: 10px;
}

.card-button {"""
new_base = """.seats-panel {
  grid-column: span 12;
}

.seven-up-table {
  max-width: 820px;
  margin: 0 auto;
}

.tableau {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.suit-lane {
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 244, 236, 0.96));
}

.suit-lane h3 {
  margin: 0 0 12px;
  text-transform: capitalize;
  font-size: 1rem;
}

/* A suit's lane never clears the way a trick does — everything played in it
   is still there, in rank order, growing to the right of the 7 it started
   from and to the left of it. Cards overlap like a fanned hand so a full run
   (up to all 13 ranks) still fits the lane; each keeps enough of a sliver
   showing to read its corner. */
.lane-run {
  display: flex;
  align-items: flex-end;
  min-height: 96px;
  padding: 6px 4px 0;
}

.lane-card {
  width: 38px;
  flex: 0 0 auto;
  z-index: calc(var(--i) + 1);
  filter: drop-shadow(0 4px 8px rgba(39, 26, 16, 0.18));
}

.lane-card:not(:first-child) {
  margin-left: -21px;
}

.lane-card .table-card {
  width: 38px;
}

.lane-card.is-seven {
  z-index: 20;
  margin-top: -10px;
  filter: drop-shadow(0 8px 14px rgba(39, 26, 16, 0.28));
}

.lane-card.is-seven .table-card {
  width: 42px;
}

.card-button {"""
do(old_base, new_base, label="tableau/suit-lane block")

# 2) Drop the now-unused edge-slot / stack machinery entirely.
old_stack = """.table-stack {
  position: relative;
  min-width: 0;
  width: 100%;
  min-height: 92px;
  overflow: hidden;
}

.table-stack-low {
  padding-right: 8px;
}

.table-stack-high {
  padding-left: 8px;
}

.table-edge-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 92px;
  width: 100%;
}

.table-card-wrap {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  filter: drop-shadow(0 10px 16px rgba(39, 26, 16, 0.14));
}

.table-center-card {
  position: relative;
  z-index: 20;
  transform: rotate(180deg);
  filter: drop-shadow(0 14px 20px rgba(39, 26, 16, 0.2));
}

.table-card,
.hand-card {"""
new_stack = """.table-card,
.hand-card {"""
do(old_stack, new_stack, label="remove edge-slot machinery")

# 3) 960px tier: the felt panel behaves like the other full-width panels
#    already listed there, and the old 2-up meta-grid rule still applies.
old_960 = """  .control-panel,
  .room-panel,
  .status-panel,
  .tableau-panel,
  .hand-panel,
  .log-panel {
    grid-column: span 12;
  }"""
new_960 = """  .control-panel,
  .room-panel,
  .status-panel,
  .seats-panel,
  .tableau-panel,
  .hand-panel,
  .log-panel {
    grid-column: span 12;
  }"""
do(old_960, new_960, label="960px panel list")

# 4) 640px tier: the old rule sized the grid to fit two fixed edge-slot lanes
#    side by side (`max-content`); the fan is its own intrinsic width now, so
#    fall back to the same 2-up fraction rule the 960px tier already uses.
#    The compact-suit-lane / suit-cards rules it also carried are gone with
#    the markup that used them.
old_640 = """  .tableau {
    grid-template-columns: repeat(2, max-content);
    justify-content: center;
    gap: 10px;
  }

  .player-rail {
    grid-template-columns: 1fr;
  }

  .suit-cards {
    grid-template-columns: 1fr;
    gap: 4px;
    justify-items: center;
  }

  .suit-lane {
    width: fit-content;
    min-width: 0;
    margin-inline: auto;
    padding: 10px 2px;
  }

  .suit-lane.compact-suit-lane {
    width: fit-content;
    min-width: 0;
    margin-inline: auto;
    padding-left: 6px;
    padding-right: 6px;
  }

  .suit-lane.compact-suit-lane h3 {
    text-align: center;
  }

  .suit-lane.compact-suit-lane .suit-cards {
    width: fit-content;
    margin-inline: auto;
  }

  .table-stack-low,
  .table-stack-high {
    padding: 0;
  }

  .table-card,
  .hand-card {
    width: 56px;
  }

  .table-card {
    width: 44px;
  }
}"""
new_640 = """  .tableau {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .player-rail {
    grid-template-columns: 1fr;
  }

  .suit-lane {
    padding: 12px;
  }

  .table-card,
  .hand-card {
    width: 56px;
  }

  .lane-card,
  .lane-card .table-card {
    width: 30px;
  }

  .lane-card:not(:first-child) {
    margin-left: -16px;
  }

  .lane-card.is-seven .table-card {
    width: 34px;
  }
}"""
do(old_640, new_640, label="640px tier")

open(p, "w", encoding="utf-8").write(s)
print("ok")
