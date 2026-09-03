import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Ensure browser does not try to restore previous scroll position on navigation
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    // If navigating to an anchor hash (e.g. /#how-it-works), scroll to the element
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView();
        return;
      }
    }

    // Instantly reset scroll to top-left before the browser paints the new route
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    document.documentElement.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
    document.body.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname, hash]);

  return null;
}
