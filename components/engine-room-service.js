"use client";

import { createRoomPoll } from "../lib/room-poll.js";
import { asRoomError } from "../lib/room-cache.js";

/**
 * Browser side of an engine room (lib/engine-room.js).
 *
 * The seat token is kept per room in localStorage and sent as X-Seat-Token.
 * The browser never holds the whole game: every call returns this seat's view.
 */

/** Thrown when the room cannot be used: no such room, an old-format room, or no seat. */
export class EngineRoomError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message);
    this.name = "EngineRoomError";
    this.status = status;
  }
}

/**
 * @param {string} gameKey  api and storage key, e.g. "uno"
 * @param {string} gameName display name for error messages
 */
export function createEngineRoomService(gameKey, gameName) {
  const base = `/api/${gameKey}/rooms`;
  /** @param {unknown} code */
  const normalizeCode = (code) => String(code || "").trim().toUpperCase();
  /** @param {unknown} code */
  const tokenKey = (code) => `digital-games:seat:${gameKey}:${normalizeCode(code)}`;

  /** @param {string} code */
  function readToken(code) {
    try {
      return window.localStorage.getItem(tokenKey(code)) || "";
    } catch {
      return "";
    }
  }

  /** @param {string} code @param {string} token */
  function storeToken(code, token) {
    try {
      window.localStorage.setItem(tokenKey(code), token);
    } catch {
      // Private mode or a full quota: the seat works until the page reloads.
    }
  }

  /** @param {string} code */
  function seatHeaders(code) {
    const token = readToken(code);
    return token ? { "X-Seat-Token": token } : {};
  }

  /** @param {Response} response */
  async function readJson(response) {
    if (!(response.headers.get("content-type") || "").includes("application/json")) {
      throw new Error(`The room server returned an unexpected response (${response.status}).`);
    }
    return response.json();
  }

  /**
   * @param {string} url
   * @param {RequestInit} init
   * @param {string} fallback
   */
  async function request(url, init, fallback) {
    let response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw asRoomError(error);
    }
    const payload = await readJson(response);
    if (!response.ok) throw new EngineRoomError(payload.error || fallback, response.status);
    return payload;
  }

  /**
   * @param {string} code
   * @param {any} body
   * @param {string} fallback
   */
  const post = (code, body, fallback) =>
    request(
      `${base}/${normalizeCode(code)}`,
      { method: "POST", headers: { "Content-Type": "application/json", ...seatHeaders(code) }, body: JSON.stringify(body) },
      fallback,
    );

  const service = {
    /** @param {string} name */
    async create(name) {
      const payload = await request(
        base,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) },
        `Could not create the ${gameName} room.`,
      );
      storeToken(payload.state.roomCode, payload.token);
      return payload;
    },

    /** @param {string} roomCode @param {string} name */
    async join(roomCode, name) {
      const payload = await post(roomCode, { action: "join", name }, `Could not join the ${gameName} room.`);
      storeToken(payload.state.roomCode, payload.token);
      return payload;
    },

    /**
     * This seat's view, or null when there is no such room.
     * @param {string} roomCode
     */
    async load(roomCode) {
      const code = normalizeCode(roomCode);
      if (!code) return null;
      try {
        const payload = await request(
          `${base}/${code}`,
          { cache: "no-store", headers: seatHeaders(code) },
          `Could not load the ${gameName} room.`,
        );
        return payload.state;
      } catch (error) {
        if (error instanceof EngineRoomError && error.status === 404) return null;
        throw error;
      }
    },

    /**
     * @param {string} roomCode
     * @param {string} action
     * @param {Record<string, any>} [args]
     */
    async action(roomCode, action, args = {}) {
      const payload = await post(roomCode, { action, args }, `Could not update the ${gameName} room.`);
      return payload.state;
    },

    /** One host-paced computer move. @param {string} roomCode */
    async computerStep(roomCode) {
      const payload = await post(roomCode, { action: "computerStep" }, `Could not advance the ${gameName} room.`);
      return payload.state;
    },

    /** Whether this browser holds a seat in the room. @param {string} roomCode */
    hasSeat(roomCode) {
      return Boolean(readToken(roomCode));
    },

    /**
     * @param {string} roomCode
     * @param {(state: any) => void} handler
     */
    subscribe(roomCode, handler) {
      return createRoomPoll({
        load: () => service.load(roomCode),
        onState: handler,
        baseInterval: 1200,
      });
    },
  };

  return service;
}

