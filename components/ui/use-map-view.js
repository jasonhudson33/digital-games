"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pan and zoom for an SVG board.
 *
 * The Ticket to Ride map was pinned to a fixed 760px inside a horizontally
 * scrolling box on phones, with no way to zoom. On a 390px screen that meant
 * hunting for a two-unit route by dragging a board twice the width of the
 * viewport, with the city labels rendering at about 5px.
 *
 * This drives the viewBox rather than a CSS transform, so the map stays crisp at
 * every zoom level and hit targets keep matching what is drawn.
 *
 * @param {number} width  board width in user units
 * @param {number} height board height in user units
 */
export function useMapView(width, height) {
  const [view, setView] = useState({ x: 0, y: 0, w: width, h: height });
  const svgRef = useRef(null);
  const gesture = useRef(null);

  const clamp = useCallback(
    (next) => {
      // Zoom range: the whole board, in to about 3.5x.
      const w = Math.min(width, Math.max(width / 3.5, next.w));
      const h = w * (height / width);
      // Keep at least a third of the board on screen at every edge.
      const slackX = w / 3;
      const slackY = h / 3;
      return {
        w,
        h,
        x: Math.min(Math.max(next.x, -slackX), width - w + slackX),
        y: Math.min(Math.max(next.y, -slackY), height - h + slackY),
      };
    },
    [width, height],
  );

  /** Zoom by a factor about a point given in user units. */
  const zoomAbout = useCallback(
    (factor, at) => {
      setView((current) => {
        const w = current.w / factor;
        const h = current.h / factor;
        const anchor = at ?? { x: current.x + current.w / 2, y: current.y + current.h / 2 };
        return clamp({
          w,
          h,
          x: anchor.x - ((anchor.x - current.x) * w) / current.w,
          y: anchor.y - ((anchor.y - current.y) * h) / current.h,
        });
      });
    },
    [clamp],
  );

  const reset = useCallback(() => setView({ x: 0, y: 0, w: width, h: height }), [width, height]);

  /** Client pixels -> user units, using the element's own box. */
  const toUser = useCallback((event) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    const current = svg.viewBox.baseVal;
    return {
      x: current.x + ((event.clientX - box.left) / box.width) * current.width,
      y: current.y + ((event.clientY - box.top) / box.height) * current.height,
    };
  }, []);

  // Wheel zoom has to be a non-passive native listener; React's onWheel is
  // passive, so preventDefault there does not stop the page scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    function onWheel(event) {
      if (!event.ctrlKey && Math.abs(event.deltaY) < 2) return;
      event.preventDefault();
      zoomAbout(event.deltaY < 0 ? 1.12 : 1 / 1.12, toUser(event));
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAbout, toUser]);

  const pointers = useRef(new Map());

  const onPointerDown = useCallback(
    (event) => {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size === 1) {
        gesture.current = { from: toUser(event), view: null, moved: false };
      }
    },
    [toUser],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        const spread = Math.hypot(a.x - b.x, a.y - b.y);
        const previous = gesture.current?.spread;
        gesture.current = { ...gesture.current, spread, moved: true };
        if (previous) zoomAbout(spread / previous, null);
        return;
      }

      const active = gesture.current;
      if (!active?.from || event.buttons === 0) return;
      const now = toUser(event);
      if (!now) return;
      gesture.current.moved = true;
      setView((current) =>
        clamp({ ...current, x: current.x - (now.x - active.from.x), y: current.y - (now.y - active.from.y) }),
      );
    },
    [clamp, toUser, zoomAbout],
  );

  const onPointerUp = useCallback((event) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
  }, []);

  const zoomed = view.w < width - 0.5;

  return {
    svgRef,
    viewBox: `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`,
    zoomed,
    zoomIn: () => zoomAbout(1.35, null),
    zoomOut: () => zoomAbout(1 / 1.35, null),
    reset,
    /** True if the pointer was dragged, so a click can be ignored as a pan. */
    wasDragged: () => Boolean(gesture.current?.moved),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onPointerLeave: onPointerUp,
    },
  };
}
