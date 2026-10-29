import { Fragment, memo, useCallback, useEffect, useRef, useState } from "react";
import { AliasPeek, HiPeek, MusicPeek, PostsPeek, ProjectsPeek } from "@/components/PeekCards";
import TLink from "@/components/TLink";
import { LINKS, NAME } from "@/lib/content";
import { SCALE, sfx } from "@/lib/sfx";

const NOTES = {
  name: SCALE[0],
  builds: SCALE[1],
  writes: SCALE[2],
  music: SCALE[4],
  hi: SCALE[5],
};

// Without hover, or as bottom sheets below md, cards open on the first tap or click.
const SHEETS = "(hover: none), (max-width: 767px)";
const OPEN = ":hover, :focus-within, [data-peek-open]";
const PEEK_EDGE = 12;

export const TheSentence = memo(function TheSentence({
  className,
  onPreviewToggle,
  onWordHover,
  previewPlaying,
  track,
  wordStagger,
}) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") {
        return;
      }
      const open = document.querySelectorAll(".peek-trigger:hover, .peek-trigger:focus-within");
      for (const trigger of open) {
        trigger.setAttribute("data-peek-closed", "");
      }
      if (open.length > 0) {
        onWordHover(null);
      }
    };
    const onResize = () => {
      for (const trigger of document.querySelectorAll(`.peek-trigger:is(${OPEN})`)) {
        place(trigger);
      }
    };
    addEventListener("keydown", onKey);
    addEventListener("resize", onResize);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("resize", onResize);
    };
  }, [onWordHover]);

  let wordCount = 0;
  const nextDelay = () => {
    wordCount += 1;
    return 150 + (wordCount - 1) * 38;
  };

  const word = (node, key) => (
    <span
      className={`word inline-block${wordStagger ? " word-in" : ""}`}
      key={key}
      style={wordStagger ? { animationDelay: `${nextDelay()}ms` } : undefined}
    >
      <span className="word-body inline-block">{node}</span>
    </span>
  );

  const w = (text) =>
    text.split(/(\s+)/).map((token, index) => (/^\s*$/.test(token) ? token : word(token, `${token}-${index}`)));

  // Punctuation after a linked word stays in its inline-block so it can't wrap alone.
  const wrap = (node, tail) =>
    word(
      <>
        {node}
        {tail}
      </>
    );

  const parts = [
    "hi, i'm ",
    {
      key: "name",
      href: LINKS.other,
      text: NAME,
      tail: ".",
      tone: "name",
      peek: <AliasPeek />,
    },
    " i ",
    {
      key: "builds",
      href: LINKS.github,
      text: "build things",
      tail: ",",
      peek: <ProjectsPeek />,
    },
    " i ",
    { key: "writes", to: "/blog", text: "write", peek: <PostsPeek /> },
    " about some of them, and usually have ",
    {
      key: "music",
      href: track?.url,
      text: "something",
      peek: track ? <MusicPeek onToggle={onPreviewToggle} playing={previewPlaying} track={track} /> : null,
    },
    " on. ",
  ];

  return (
    <h1 className={className} data-testid="the-sentence">
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <Fragment key={index}>{w(part)}</Fragment>
        ) : (
          <Fragment key={part.key}>
            {wrap(
              <Peek hoverKey={part.key} href={part.href} onHover={onWordHover} peek={part.peek} to={part.to} tone={part.tone}>
                {part.text}
              </Peek>,
              part.tail
            )}
          </Fragment>
        )
      )}
      {wrap(
        <>
          {"say "}
          <Peek hoverKey="hi" href={LINKS.twitter} onHover={onWordHover} peek={<HiPeek />}>
            hi back
          </Peek>
          <span className={wordStagger ? "full-stop text-rose" : "text-rose"}>.</span>
        </>
      )}
    </h1>
  );
});

// Cards open centred above the word; shift or flip them to stay on screen.
function place(trigger) {
  const peek = trigger.querySelector(".peek");
  if (!peek) {
    return;
  }
  const word = trigger.getBoundingClientRect();
  const center = word.left + word.width / 2;
  const area = new DOMRect(0, 0, innerWidth, innerHeight);
  const half = peek.offsetWidth / 2;
  // The label tab sits half out of the card's top edge.
  const tab = (peek.querySelector(".peek-tab")?.offsetHeight ?? 0) / 2;
  const x = Math.min(Math.max(center, area.left + half + PEEK_EDGE), area.right - half - PEEK_EDGE) - center;
  trigger.style.setProperty("--peek-x", `${x}px`);
  trigger.removeAttribute("data-peek-below");
  trigger.removeAttribute("data-peek-trim");
  const fits = () => word.top - peek.offsetHeight - tab >= area.top + PEEK_EDGE;
  if (fits()) {
    return;
  }
  trigger.setAttribute("data-peek-trim", "");
  if (!fits()) {
    trigger.removeAttribute("data-peek-trim");
    trigger.toggleAttribute("data-peek-below", area.bottom - word.bottom > word.top - area.top);
  }
}

const onLinkEnter = (event) => {
  if (event.pointerType !== "touch") {
    sfx("pop");
  }
};

// Arming during the intro would pin the sheet to a word that's still
// transformed; skip to the end first.
function finishIntro() {
  for (const animation of document.getAnimations()) {
    if (
      typeof CSSAnimation !== "undefined" &&
      animation instanceof CSSAnimation &&
      (animation.animationName === "word-in" || animation.animationName === "full-stop")
    ) {
      animation.finish();
    }
  }
}

function Peek({ children, hoverKey, href, onHover, peek, to, tone = "link" }) {
  const [armed, setArmed] = useState(false);
  const wrapperRef = useRef(null);
  // Per gesture, not per device: a finger on a touch laptop arms too.
  const touchRef = useRef(false);

  const report = (word) => {
    const trigger = wrapperRef.current;
    if (word && trigger) {
      trigger.removeAttribute("data-peek-closed");
      place(trigger);
    }
    onHover(word);
  };

  useEffect(() => {
    if (!armed) {
      return;
    }
    const onKey = (event) => {
      if (event.key === "Escape") {
        setArmed(false);
        onHover(null);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [armed, onHover]);

  // A card can grow while it's open: keep it on screen.
  const watchPeek = useCallback((peekEl) => {
    const trigger = peekEl?.parentElement;
    if (!(peekEl && trigger)) {
      return;
    }
    const observer = new ResizeObserver(() =>
      requestAnimationFrame(() => {
        if (trigger.matches(OPEN)) {
          place(trigger);
        }
      })
    );
    observer.observe(peekEl);
    return () => observer.disconnect();
  }, []);

  const onClick = (event) => {
    const touch = touchRef.current;
    touchRef.current = false;
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!modified && (touch || matchMedia(SHEETS).matches)) {
      if (!armed) {
        event.preventDefault();
        finishIntro();
        setArmed(true);
        report(hoverKey);
        if (peek) {
          sfx("tick", NOTES[hoverKey]);
        }
        return;
      }
      setArmed(false);
      onHover(null);
    }
    if (event.detail) {
      event.currentTarget.blur();
    }
  };

  const link = {
    className: `sentence-link ${tone === "name" ? "link-name" : "link-rose"}`,
    onClick,
    onPointerDown: (event) => {
      touchRef.current = event.pointerType === "touch";
    },
    onPointerEnter: onLinkEnter,
    "data-testid": `sentence-link-${hoverKey}`,
  };

  return (
    <span
      className="peek-trigger relative inline-block"
      data-peek-open={armed ? "" : undefined}
      data-testid={`peek-trigger-${hoverKey}`}
      onBlur={(event) => {
        const trigger = wrapperRef.current;
        if (!trigger || trigger.contains(event.relatedTarget)) {
          return;
        }
        trigger.removeAttribute("data-peek-closed");
        setArmed(false);
        if (matchMedia(SHEETS).matches || !trigger.matches(":hover")) {
          onHover(null);
        }
      }}
      onFocus={() => {
        if (!matchMedia(SHEETS).matches) {
          report(hoverKey);
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch" && !matchMedia(SHEETS).matches) {
          report(hoverKey);
        }
      }}
      onPointerLeave={(event) => {
        const trigger = wrapperRef.current;
        if (event.pointerType === "touch" || armed || !trigger || trigger.matches(":has(:focus-visible)")) {
          return;
        }
        trigger.removeAttribute("data-peek-closed");
        onHover(null);
      }}
      ref={wrapperRef}
    >
      {to ? (
        <TLink {...link} to={to}>
          {children}
        </TLink>
      ) : href ? (
        <a {...link} href={href} rel="noopener noreferrer" target="_blank">
          {children}
        </a>
      ) : (
        <span className={link.className}>{children}</span>
      )}
      {peek ? (
        <span className="peek" ref={watchPeek} data-testid={`peek-${hoverKey}`}>
          {peek}
        </span>
      ) : null}
      {armed ? (
        <span
          className="fixed inset-0 z-30"
          data-testid="peek-tap-catcher"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setArmed(false);
            onHover(null);
          }}
        />
      ) : null}
    </span>
  );
}
