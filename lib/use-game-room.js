"use client";

import { useEffect, useState } from "react";

/**
 * Room membership for the client-authoritative games.
 *
 * Twelve game clients carried their own copy of this: the same three
 * localStorage keys, the same "restore the room I was in" effect, the same
 * subscription with the same updatedAt guard, the same create-and-join pair
 * with the same four error strings, and the same busy/error bookkeeping.
 *
 * They were not literally identical — the player cap appeared variously as a
 * bare 4, 5, 6, 12 or a MAX_PLAYERS import, the remember helper was called
 * `remember` in some files and `rememberRoom` in others, Life inverted the
 * membership branch and Ticket to Ride assigned the joined room to a temporary
 * first. All spelling; the behaviour was the same everywhere. The differences
 * that matter are exactly the four parameters below.
 *
 * Fixing the join flow used to mean making the same edit twelve times, which is
 * how the error strings drifted apart in the first place.
 *
 * @param {Object} options
 * @param {Object} options.service      the game's room service
 * @param {string} options.storageKey   slug for the three localStorage keys
 * @param {Function} options.createLobby (player, roomCode) => state
 * @param {Function} options.addPlayer   (state, player) => state
 * @param {number} options.maxPlayers
 * @param {string} [options.joinablePhase="lobby"]
 */
export function useGameRoom({
  service,
  storageKey,
  createLobby,
  addPlayer,
  maxPlayers,
  joinablePhase = "lobby",
}) {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const keys = {
    id: `${storageKey}-player-id`,
    name: `${storageKey}-player-name`,
    room: `${storageKey}-active-room`,
  };

  // Identity, and the room this device was last in. Runs once: localStorage
  // does not exist during the server render.
  useEffect(() => {
    let cancelled = false;
    let storedId;
    try {
      storedId = localStorage.getItem(keys.id) || crypto.randomUUID();
      localStorage.setItem(keys.id, storedId);
      setName(localStorage.getItem(keys.name) || "");
    } catch {
      // Private mode: play as a guest for this session rather than failing.
      storedId = crypto.randomUUID();
    }
    setPlayerId(storedId);

    let activeCode = null;
    try {
      activeCode = localStorage.getItem(keys.room);
    } catch {
      /* nothing stored to resume */
    }
    if (!activeCode) return undefined;

    service
      .load(activeCode)
      .then((loaded) => {
        // Only restore a room this device is actually seated at.
        if (!cancelled && loaded?.players?.some((player) => player.id === storedId)) setRoom(loaded);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyed on the code, not the room object, so a state update does not tear the
  // subscription down and build it again.
  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return service.subscribe(room.roomCode, (next) => {
      setRoom((current) =>
        !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0) ? next : current,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roomCode]);

  function remember(next) {
    if (!next) return next;
    try {
      localStorage.setItem(keys.name, name.trim());
      localStorage.setItem(keys.room, next.roomCode);
    } catch {
      /* the room still works this session without being remembered */
    }
    setRoom(next);
    return next;
  }

  async function withBusy(action) {
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (caught) {
      setError(caught.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createRoom() {
    if (!name.trim()) {
      setError("Enter your name first.");
      return null;
    }
    return withBusy(async () => {
      const roomCode = await service.createCode();
      return remember(await service.save(createLobby({ id: playerId, name: name.trim() }, roomCode)));
    });
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) {
      setError("Enter your name and a room code.");
      return null;
    }
    return withBusy(async () => {
      const code = joinCode.trim().toUpperCase();
      const loaded = await service.load(code);
      if (!loaded) throw new Error("That room could not be found.");

      // Already seated: rejoin rather than taking a second seat.
      if (loaded.players.some((player) => player.id === playerId)) return remember(loaded);

      if (loaded.phase !== joinablePhase) throw new Error("That game has already started.");
      if (loaded.players.length >= maxPlayers) throw new Error("That room is full.");
      return remember(
        await service.update(code, (current) => addPlayer(current, { id: playerId, name: name.trim() })),
      );
    });
  }

  async function update(action) {
    if (!room) return null;
    return withBusy(async () => {
      const next = await service.update(room.roomCode, action);
      if (next) setRoom(next);
      return next;
    });
  }

  function leaveRoom() {
    try {
      localStorage.removeItem(keys.room);
    } catch {
      /* nothing to forget */
    }
    setRoom(null);
  }

  async function copyRoomCode() {
    if (!room?.roomCode) return false;
    try {
      await navigator.clipboard?.writeText(room.roomCode);
      return true;
    } catch {
      // Denied permission or an insecure origin — the code is on screen anyway.
      return false;
    }
  }

  return {
    room,
    setRoom,
    playerId,
    name,
    setName,
    joinCode,
    setJoinCode,
    busy,
    setBusy,
    error,
    setError,
    me: room?.players?.find((player) => player.id === playerId) ?? null,
    createRoom,
    joinRoom,
    update,
    remember,
    withBusy,
    leaveRoom,
    copyRoomCode,
  };
}
