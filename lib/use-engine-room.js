"use client";

import { useEffect, useState } from "react";

/**
 * Room membership for games whose rules run on the server (see
 * components/engine-room-service.js).
 *
 * The browser never builds or replaces game state: it asks the server to create
 * or join, sends named actions, and renders the seat view it gets back. Who the player is comes from the server (`room.viewerId`), and
 * the seat token that proves it lives in the service.
 *
 * @param {Object} options
 * @param {any} options.service     an engine room service
 * @param {string} options.storageKey slug for the name and active-room keys
 * @param {number} [options.computerDelay] ms the host waits before each computer move
 * @param {(room: any) => boolean} [options.computerDue] whether a computer is due to act
 */
export function useEngineRoom({ service, storageKey, computerDelay = 600, computerDue }) {
  const [room, setRoom] = useState(/** @type {any} */ (null));
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const keys = { name: `${storageKey}-player-name`, room: `${storageKey}-active-room` };
  const playerId = room?.viewerId || "";

  useEffect(() => {
    let cancelled = false;
    try {
      setName(localStorage.getItem(keys.name) || "");
    } catch {
      /* private mode: start with an empty name */
    }
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
        if (!cancelled && loaded) setRoom(loaded);
      })
      .catch(() => {
        try {
          localStorage.removeItem(keys.room);
        } catch {
          /* nothing to forget */
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return service.subscribe(room.roomCode, (/** @type {any} */ next) => {
      setRoom((/** @type {any} */ current) =>
        !current || Number(next.updatedAt || 0) >= Number(current.updatedAt || 0) ? next : current,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roomCode]);

  /** @param {any} next */
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

  /** @param {() => Promise<any>} action */
  async function withBusy(action) {
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (caught) {
      setError(/** @type {Error} */ (caught).message);
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
    return withBusy(async () => remember((await service.create(name.trim())).state));
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) {
      setError("Enter your name and a room code.");
      return null;
    }
    return withBusy(async () => {
      const code = joinCode.trim().toUpperCase();
      if (service.hasSeat(code)) {
        const loaded = await service.load(code);
        if (!loaded) throw new Error("That room could not be found.");
        return remember(loaded);
      }
      return remember((await service.join(code, name.trim())).state);
    });
  }

  /**
   * @param {string} action
   * @param {Record<string, any>} [args]
   */
  async function act(action, args) {
    if (!room) return null;
    return withBusy(async () => {
      const next = await service.action(room.roomCode, action, args);
      if (next) setRoom(next);
      return next;
    });
  }

  async function stepComputer() {
    if (!room) return null;
    return withBusy(async () => {
      const next = await service.computerStep(room.roomCode);
      if (next) setRoom(next);
      return next;
    });
  }

  // The host's browser paces the computers: one server step per delay.
  useEffect(() => {
    if (!room || room.hostId !== playerId || !computerDue?.(room)) return undefined;
    const timer = window.setTimeout(() => void stepComputer(), computerDelay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.updatedAt, playerId]);

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
      // Denied permission or an insecure origin: the code is on screen anyway.
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
    error,
    setError,
    me: room?.players?.find((/** @type {any} */ player) => player.id === playerId) ?? null,
    createRoom,
    joinRoom,
    act,
    stepComputer,
    leaveRoom,
    copyRoomCode,
  };
}
