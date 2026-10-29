import { useCallback } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { reducedMotion } from "@/lib/utils";

// Page changes run inside a view transition so shared names (post titles) morph between pages.
export function useTransitionNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to) => {
      if (!document.startViewTransition || reducedMotion()) {
        navigate(to);
        scrollTo(0, 0);
        return;
      }
      document.startViewTransition(() => {
        flushSync(() => navigate(to));
        scrollTo(0, 0);
      });
    },
    [navigate]
  );
}

export default function TLink({ onClick, to, ...rest }) {
  const go = useTransitionNavigate();
  return (
    <Link
      to={to}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          rest.target === "_blank"
        ) {
          return;
        }
        event.preventDefault();
        go(to);
      }}
    />
  );
}
