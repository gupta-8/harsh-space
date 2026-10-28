import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import BackLink from "@/components/BackLink";
import NotFound from "@/components/NotFound";
import { sfx } from "@/lib/sfx";
import { useCopied } from "@/lib/use-copied";
import { usePost } from "@/lib/use-posts";

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const textOf = (node) => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node?.props?.children) return textOf(node.props.children);
  return "";
};

function ReadingProgress() {
  const barRef = useRef(null);

  useEffect(() => {
    let frame = 0;
    let max = 0;
    const update = () => {
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      barRef.current?.style.setProperty("scale", `${progress} 1`);
    };
    const measure = () => {
      max = document.documentElement.scrollHeight - window.innerHeight;
      update();
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
    };
  }, []);

  return <div aria-hidden="true" className="reading-progress fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-rose" ref={barRef} />;
}

function Toc({ entries }) {
  const navRef = useRef(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const headings = entries.map((entry) => document.getElementById(entry.id)).filter(Boolean);
    let frame = 0;
    const update = () => {
      const line = window.innerHeight * 0.24;
      let current = null;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > line) {
          break;
        }
        current = heading.id;
      }
      setActive((previous) => (previous === current ? previous : current));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      return;
    }
    const current = active ? nav.querySelector(`[href="#${active}"]`) : null;
    if (!current) {
      nav.style.setProperty("--toc-on", "0");
      return;
    }
    nav.style.setProperty("--toc-on", "1");
    nav.style.setProperty("--toc-y", `${current.offsetTop}px`);
    nav.style.setProperty("--toc-h", `${current.offsetHeight}px`);
  }, [active]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <aside className="toc-column">
      <div className="toc rise" ref={navRef}>
        <nav aria-label="contents">
          <span className="toc-label">contents</span>
          {entries.map((entry, index) => (
            <a
              className={`toc-item toc-depth-${entry.depth}${active === entry.id ? " toc-active" : ""}`}
              href={`#${entry.id}`}
              key={entry.id}
              onClick={() => sfx("tick", 720 + (index % 4) * 60)}
            >
              {entry.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function FallingPetal() {
  const stageRef = useRef(null);
  const [drop, setDrop] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setDrop(true);
        sfx("chime");
        observer.disconnect();
      }
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <span aria-hidden="true" className="petal-stage" ref={stageRef}>
      {drop ? (
        <span className="petal">
          <span className="petal-glyph">*</span>
        </span>
      ) : null}
    </span>
  );
}

const heading = (Tag, depth) =>
  function Heading({ children }) {
    const id = slugify(textOf(children));
    return (
      <Tag id={id} data-depth={depth}>
        <a className="heading-anchor" href={`#${id}`}>
          {children}
        </a>
      </Tag>
    );
  };

const QUIET_LANGS = new Set(["", "text", "txt", "plain", "plaintext"]);

function Pre({ children }) {
  const [copied, copy] = useCopied();
  const code = textOf(children).replace(/\n$/, "");
  const lang = (children?.props?.className ?? "").replace("language-", "");
  return (
    <div className="code-shell" data-testid="code-block">
      <span className="code-tools">
        <button className="code-copy" onClick={() => copy(code)} type="button" data-testid="code-copy-button">
          <span aria-live="polite" className="swap-in" key={String(copied)}>
            {copied ? "( copied )" : "copy"}
          </span>
        </button>
        {QUIET_LANGS.has(lang) ? null : (
          <span aria-hidden="true" className="code-lang">
            {lang}
          </span>
        )}
      </span>
      <pre className="code-card" tabIndex={0}>
        {children}
      </pre>
    </div>
  );
}

const components = {
  h1: heading("h2", 2),
  h2: heading("h2", 2),
  h3: heading("h3", 3),
  h4: heading("h4", 4),
  pre: Pre,
  a: ({ href, children }) => (
    <a href={href} rel="noopener noreferrer" target={href?.startsWith("#") ? undefined : "_blank"}>
      {children}
    </a>
  ),
};

export default function Post() {
  const { slug } = useParams();
  const { post, missing } = usePost(slug);

  useEffect(() => {
    if (post) {
      document.title = `${post.title} · harsh`;
    }
  }, [post]);

  const toc = useMemo(() => {
    if (!post?.content) return [];
    return [...post.content.matchAll(/^(#{1,3})\s+(.+)$/gm)].map((m) => ({
      depth: Math.max(2, m[1].length),
      id: slugify(m[2]),
      text: m[2].toLowerCase(),
    }));
  }, [post]);

  if (missing) {
    return <NotFound to="/blog" />;
  }
  if (!post) {
    return <main className="min-h-dvh paper" />;
  }
  const loaded = typeof post.content === "string";

  return (
    <main className="min-h-dvh paper px-7 py-14 font-serif-display text-ink md:py-24" data-testid="post-page">
      <ReadingProgress />
      <div className="page-column mx-auto w-full max-w-xl">
        <header className="post-header">
          <BackLink className="rise font-mono text-muted text-xs" to="/blog" data-testid="post-back-link">
            writing
          </BackLink>
          <h1
            className="mt-9 w-fit text-[clamp(2rem,6.5vw,2.9rem)] leading-[1.1]"
            data-testid="post-title"
            style={{ viewTransitionName: `post-${post.slug}` }}
          >
            {post.title}
            <span className="full-stop text-rose">.</span>
          </h1>
          <p className="rise mt-4 font-mono text-faint text-[11px]" style={{ animationDelay: "120ms" }} data-testid="post-meta">
            {[post.dateLabel, post.sample ? "sample post" : null, `${post.readingMinutes} min read`].filter(Boolean).join(" · ")}
          </p>
        </header>

        <div className="relative mt-10">
          <Toc entries={toc} />
          {loaded ? (
            <article className="rise prose-post" style={{ animationDelay: "200ms" }} data-testid="post-body">
              <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </article>
          ) : null}
        </div>

        {loaded ? (
          <footer className="rise mt-16 text-center">
            <FallingPetal />
            <p aria-hidden="true" className="font-mono text-faint text-[11px] italic">
              ( fin )
            </p>
            <BackLink className="mt-6 font-mono text-muted text-xs" to="/blog">
              more writing
            </BackLink>
            <span className="mx-3 font-mono text-faint text-[11px]">·</span>
            <BackLink className="mt-6 font-mono text-muted text-xs" to="/" data-testid="post-home-link">
              home
            </BackLink>
          </footer>
        ) : null}
      </div>
    </main>
  );
}
