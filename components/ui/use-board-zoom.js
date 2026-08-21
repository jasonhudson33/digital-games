"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pan and zoom for a board whose pieces are HTML positioned over an SVG.
 *
 * The Risk board draws its map as SVG but its territories as absolutely
 * positioned buttons on top, so zooming the SVG's viewBox alone would slide the
 * two apart. This scales a wrapper that contains both, which keeps them locked
 * together and keeps the buttons as real focusable, clickable elements.
 *
 * Once territories become polygons inside the SVG, components/ui/use-map-view.js
 * is the better hook — it drives the viewBox, so the map stays crisp at every
 * zoom level. Until then, this is the version that cannot desync.
 *
 * @param {number} max how far in to allow, as a multiple
 */
export function useBoardZoom(max = 3.4) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const frameRef = useRef(null);
  const drag = useRef(null);
  const pointers = useRef(new Map());

  /* Panning is bounded by how much of the board is off-screen, so the board can
   * never be dragged away into empty space. */
  const clamp = useCallback((next) => {
    const scale = Math.min(max, Math.max(1, next.scale));
    const box = frameRef.current?.getBoundingClientRect();
    const slackX = box ? (box.width * (scale - 1)) / 2 : 0;
    const slackY = box ? (box.height * (scale - 1)) / 2 : 0;
    return {
      scale,
      x: Math.min(slackX, Math.max(-slackX, next.x)),
      y: Math.min(slackY, Math.max(-slackY, next.y)),
    };
  }, [max]);

  /** Zoom about a point given in client pixels, so the point stays put. */
  const zoomAbout = useCallback((factor, client) => {
    setView((current) => {
      const box = frameRef.current?.getBoundingClientRect();
      const scale = Math.min(max, Math.max(1, current.scale * factor));
      if (!box || scale === current.scale) return clamp({ ...current, scale });
      const at = client ?? { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      // Where is that point on the unscaled board?
      const boardX = (at.x - box.left - box.width / 2 - current.x) / current.scale;
      const boardY = (at.y - box.top - box.height / 2 - current.y) / current.scale;
      return clamp({
        scale,
        x: current.x - boardX * (scale - current.scale),
        y: current.y - boardY * (scale - current.scale),
      });
    });
  }, [clamp, max]);

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);

  // React's onWheel is passive, so preventDefault there will not stop the page
  // scrolling. This has to be a native non-passive listener.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const onWheel = (event) => {
      if (!event.ctrlKey && Math.abs(event.deltaY) < 2) return;
      event.preventDefault();
      zoomAbout(event.deltaY < 0 ? 1.12 : 1 / 1.12, { x: event.clientX, y: event.clientY });
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [zoomAbout]);

  const onPointerDown = useCallback((event) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) drag.current = { x: event.clientX, y: event.clientY, moved: false };
  }, []);

  const onPointerMove = useCallback((event) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      const previous = drag.current?.spread;
      drag.current = { ...drag.current, spread, moved: true };
      if (previous) zoomAbout(spread / previous, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      return;
    }

    const active = drag.current;
    if (!active || event.buttons === 0) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
    setView((current) => (current.scale === 1 ? current : clamp({ ...current, x: current.x + dx, y: current.y + dy })));
  }, [clamp, zoomAbout]);

  const onPointerUp = useCallback((event) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      // Keep `moved` readable for the click that follows, then clear it.
      const wasMoved = drag.current?.moved;
      drag.current = wasMoved ? { moved: true } : null;
      if (wasMoved) setTimeout(() => { drag.current = null; }, 0);
    }
  }, []);

  return {
    frameRef,
    zoomed: view.scale > 1.001,
    /** Applied to the wrapper holding both the SVG and the territory buttons. */
    style: {
      transform: `translate(${view.x.toFixed(1)}px, ${view.y.toFixed(1)}px) scale(${view.scale.toFixed(3)})`,
    },
    zoomIn: () => zoomAbout(1.35, null),
    zoomOut: () => zoomAbout(1 / 1.35, null),
    reset,
    /** True if the pointer was dragged, so a pan is not read as a click. */
    wasDragged: () => Boolean(drag.current?.moved),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onPointerLeave: onPointerUp,
    },
  };
}
