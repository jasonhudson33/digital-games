"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/*
 * Marks <html> with the current route's slug so a game's colours can be
 * written as `html[data-route="<slug>"]` instead of on `:root`.
 *
 * Next keeps a route's stylesheet loaded after a client-side navigation, so a
 * `:root` override outlived its page and the landing inherited a dark game's
 * ground. An attribute selector stops matching the moment this changes.
 */
export function routeSlug(pathname) {
  return (pathname || "/").split("/")[1] || "";
}

/* Same rule, run before first paint on a direct load. Kept as a string so the
   inline script in the layout and this component cannot drift apart. */
export const ROUTE_SCRIPT = `document.documentElement.dataset.route=(location.pathname.split("/")[1]||"")`;

export default function RouteTheme() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    document.documentElement.dataset.route = routeSlug(pathname);
  }, [pathname]);
  return null;
}
