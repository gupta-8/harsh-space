import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Credit from "@/components/Credit";
import Guestbook from "@/components/Guestbook";
import ParticleRose from "@/components/ParticleRose";
import { TheSentence } from "@/components/TheSentence";
import TintStrips from "@/components/TintStrips";
import { visitorTag } from "@/lib/stats";
import { useNowPlaying } from "@/lib/use-now-playing";
import { usePreview } from "@/lib/use-preview";
import { useSiteStats, visitor } from "@/lib/use-stats";

// Lifts are tuned for a phone page that fits the screen; --below adds whatever
// is still under the fold.
const ROSE = {
  name: {
    mode: "shiver",
    caption: "( flustered )",
    lift: "max-md:portrait:-translate-y-[calc(50px_+_var(--below))]",
  },
  builds: {
    mode: "cube",
    caption: "( assembling )",
    lift: "max-md:portrait:-translate-y-[calc(218px_+_var(--below))]",
  },
  writes: {
    mode: "caret",
    caption: "( waiting for the first word )",
    lift: "max-md:portrait:-translate-y-[calc(66px_+_var(--below))]",
  },
  music: {
    mode: "art",
    caption: "( listening for something )",
    lift: "max-md:portrait:-translate-y-[calc(85px_+_var(--below))]",
  },
  hi: {
    mode: "hi",
    caption: "( saying it back )",
    lift: "max-md:portrait:-translate-y-[calc(66px_+_var(--below))]",
  },
};
const MUSIC_COMPACT_LIFT = "max-md:portrait:-translate-y-[calc(73px_+_var(--below))]";

const GREETING_MS = 4200;
const NOTE_EVERY_MS = 11_000;
const NOTE_FOR_MS = 3800;
const RECENT_AGO_RE = /^(just now|[1-4]m)$/;

const roseNotes = (stats) => {
  if (!stats) {
    return [];
  }
  const notes = [];
  const others = stats.online - 1;
  if (others === 1) {
    notes.push("( one other person is looking at this )");
  } else if (others > 1) {
    notes.push(`( ${others} others are looking at this )`);
  }
  const mine = visitorTag(visitor());
  const arrival = stats.recent.find((r) => r.tag !== mine && RECENT_AGO_RE.test(r.ago) && r.place !== "somewhere");
  if (arrival) {
    notes.push(`( someone in ${arrival.place} just arrived )`);
  }
  if (stats.today >= 10) {
    notes.push(`( ${stats.today} of you today. hi. )`);
  }
  return notes;
};

const HOST_PREFIX_RE = /^(?:www|m|l|lm|old|mobile|out|link)\./;
const HOST_ALIASES = {
  "t.co": "x.com",
  "twitter.com": "x.com",
  "lnkd.in": "linkedin.com",
  "news.ycombinator.com": "hacker news",
  "com.google.android.gm": "gmail",
  "mail.google.com": "gmail",
  "l.instagram.com": "instagram.com",
};

const referrerHost = () => {
  try {
    const host = new URL(document.referrer).hostname.replace(HOST_PREFIX_RE, "");
    if (!host || host === location.hostname) {
      return null;
    }
    return HOST_ALIASES[host] ?? host;
  } catch {
    return null;
  }
};

function useRoseNote(idle, stats, greet) {
  const [note, setNote] = useState(null);
  const notesRef = useRef([]);
  notesRef.current = roseNotes(stats);

  useEffect(() => {
    const host = greet ? referrerHost() : null;
    if (!host) {
      return;
    }
    setNote(`( ${host} sent you. hi. )`);
    const timer = setTimeout(() => setNote(null), GREETING_MS);
    return () => clearTimeout(timer);
  }, [greet]);

  useEffect(() => {
    if (!idle) {
      setNote(null);
      return;
    }
    let i = 0;
    let hide;
    const show = setInterval(() => {
      const notes = notesRef.current;
      if (notes.length === 0) {
        return;
      }
      setNote(notes[i % notes.length]);
      i += 1;
      hide = setTimeout(() => setNote(null), NOTE_FOR_MS);
    }, NOTE_EVERY_MS);
    return () => {
      clearInterval(show);
      clearTimeout(hide);
    };
  }, [idle]);

  return note;
}

let introPlayed = false;

export default function Home() {
  const [intro] = useState(() => !introPlayed);
  useEffect(() => {
    introPlayed = true;
    document.title = "harsh's space";
  }, []);
  const { artFadeRef, previewing, previewUrl, toggle, track, warm } = usePreview(useNowPlaying());
  const [word, setWord] = useState(null);
  const [writing, setWriting] = useState(false);
  const mainRef = useRef(null);
  const [below, setBelow] = useState(0);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!(word && main)) {
      return;
    }
    const measure = () => setBelow(main.scrollHeight - main.clientHeight - main.scrollTop);
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [word]);

  useEffect(() => {
    if (word === "music") {
      warm();
    }
  }, [word, warm]);

  const albumArt = track?.thumb ?? null;

  const mode = word ? ROSE[word].mode : writing ? "paper" : previewing ? "art" : "rest";
  const stats = useSiteStats();
  const roseNote = useRoseNote(!(word || previewing || writing), stats, intro);

  const caption = (() => {
    if (roseNote) {
      return roseNote;
    }
    if (writing && !word) {
      return "( pretending to be a page )";
    }
    if (word === "music" || (!word && previewing)) {
      if (previewing) {
        return "( humming along )";
      }
      if (albumArt) {
        return previewUrl ? "( dressed as the cover, press play )" : "( dressed as the album cover )";
      }
      return ROSE.music.caption;
    }
    return word ? ROSE[word].caption : "( alive, technically )";
  })();

  const liftClass = word ? (word === "music" && !track?.isPlaying ? MUSIC_COMPACT_LIFT : ROSE[word].lift) : "";
  const onWriting = useCallback((v) => setWriting(v), []);

  return (
    <main className="fixed inset-0 overflow-y-auto overflow-x-hidden paper paper-lit font-serif-display text-ink" ref={mainRef} data-testid="home-page">
      <div className="home mx-auto flex min-h-full w-full max-w-6xl flex-col justify-between gap-8 px-7 pt-14 pb-[max(2rem,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-normal md:gap-14 md:py-[min(4rem,9vh)] md:pr-[max(3rem,env(safe-area-inset-right))] md:pl-[max(3rem,env(safe-area-inset-left))]">
        <div className="sentence-root relative max-w-2xl md:flex-1">
          <TheSentence
            className="text-[clamp(1.9rem,8.6vw,2.5rem)] leading-[1.22] tracking-[-0.01em] md:text-[clamp(1.9rem,4.4vw,3.5rem)] md:leading-[1.2]"
            onPreviewToggle={previewUrl ? toggle : undefined}
            onWordHover={setWord}
            previewPlaying={previewing}
            track={track}
            wordStagger={intro}
          />
        </div>

        <div className={`${intro ? "rise " : ""}relative z-20 flex shrink-0 flex-col items-center md:z-auto`} style={{ animationDelay: "200ms" }}>
          <div className={`rose-lift flex flex-col items-center transition-transform duration-300 ease-strong ${liftClass}`} style={{ "--below": `${below}px` }}>
            <ParticleRose
              artFadeRef={artFadeRef}
              artUrl={albumArt}
              className="w-[min(84vw,380px)] md:w-[min(34vw,440px)]"
              intro={intro}
              mode={mode}
            />
            <p aria-hidden="true" className="mt-2.5 hidden h-4 font-mono text-faint text-[10px] italic md:block" data-testid="rose-caption">
              <span className="swap-in" key={caption}>
                {caption}
              </span>
            </p>
            <Guestbook caption={caption} onWriting={onWriting} />
            <Credit />
          </div>
        </div>
      </div>
      <TintStrips />
    </main>
  );
}
