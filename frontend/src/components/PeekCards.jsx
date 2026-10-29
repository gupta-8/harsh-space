import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import TLink from "@/components/TLink";
import { EMAIL, GITHUB_USER, HANDLES, LINKS, OTHER_DOMAIN } from "@/lib/content";
import { sfx } from "@/lib/sfx";
import { compact } from "@/lib/stats";
import { useCopied } from "@/lib/use-copied";
import { useContributions, useProjects } from "@/lib/use-github";
import { usePosts } from "@/lib/use-posts";
import { beacon, useSiteStats } from "@/lib/use-stats";
import { isTouch } from "@/lib/utils";

function PeekCard({ children, compact: tight = false, fit = false, label, testId }) {
  const size = tight ? "w-fit max-w-64 px-3.5 pt-4 pb-3" : fit ? "w-fit max-w-64 px-4 pt-4 pb-4" : "w-60 px-4 pt-4 pb-4";
  return (
    <span
      className={`peek-card block rounded-xl border border-ink-10 bg-card text-left font-mono not-italic ${size}`}
      data-testid={testId}
    >
      <span className="peek-tab">{label}</span>
      {children}
    </span>
  );
}

export function AliasPeek() {
  return (
    <PeekCard compact label="also known as" testId="peek-card-name">
      <a
        className="group block whitespace-nowrap"
        href={LINKS.other}
        rel="noopener noreferrer"
        target="_blank"
        data-testid="alias-domain-link"
      >
        <span className="block text-ink text-xs group-hover:text-rose">{OTHER_DOMAIN}</span>
        <span className="block text-[10px] text-muted">same person, other door</span>
      </a>
      <a
        className="group mt-2.5 block whitespace-nowrap"
        href={LINKS.github}
        rel="noopener noreferrer"
        target="_blank"
        data-testid="alias-github-link"
      >
        <span className="block text-ink text-xs group-hover:text-rose">{GITHUB_USER}</span>
        <span className="block text-[10px] text-muted">on github</span>
      </a>
    </PeekCard>
  );
}

export function HiPeek() {
  const [copied, copy] = useCopied();
  const [touch, setTouch] = useState(false);
  const hi = useSiteStats()?.hi ?? 0;

  useEffect(() => {
    setTouch(isTouch());
  }, []);

  const onEmail = (event) => {
    beacon({ type: "hi" });
    if (touch) {
      return;
    }
    event.preventDefault();
    void copy(EMAIL).then((ok) => {
      if (!ok) {
        location.href = LINKS.email;
      }
    });
  };

  return (
    <PeekCard fit label="say hi" testId="peek-card-hi">
      <a className="group block" href={LINKS.email} onClick={onEmail} data-testid="hi-email-link">
        <span className="block whitespace-nowrap text-ink text-xs group-hover:text-rose">
          <span className="hi-email" data-done={copied ? "" : undefined}>
            {EMAIL}
          </span>
          <span aria-hidden="true" className="hi-caret" data-done={copied ? "" : undefined} />
        </span>
        <span className="block whitespace-nowrap text-[10px] text-muted">
          <span aria-live="polite" className="swap-in" key={String(copied)}>
            {copied ? "( copied )" : touch ? "opens your mail app" : "click to copy"}
          </span>
        </span>
      </a>
      <a className="group mt-2.5 block" href={LINKS.twitter} rel="noopener noreferrer" target="_blank" data-testid="hi-x-link">
        <span className="block whitespace-nowrap text-ink text-xs group-hover:text-rose">@{HANDLES.x}</span>
        <span className="block whitespace-nowrap text-[10px] text-muted">strangers welcome</span>
      </a>
      <a
        className="group mt-2.5 block"
        href={LINKS.instagram}
        rel="noopener noreferrer"
        target="_blank"
        data-testid="hi-instagram-link"
      >
        <span className="block whitespace-nowrap text-ink text-xs group-hover:text-rose">@{HANDLES.instagram}</span>
        <span className="block whitespace-nowrap text-[10px] text-muted">pictures, occasionally</span>
      </a>
      {hi > 0 ? (
        <span
          className="mt-3 block border-ink-10 border-t pt-2 text-center text-[9px] text-faint tracking-[0.1em]"
          data-testid="hi-count"
        >
          {hi === 1 ? "one person" : `${hi} people`} said hi this month
        </span>
      ) : null}
    </PeekCard>
  );
}

function Heatmap({ total, weeks }) {
  return (
    <a
      className="group mt-3 block border-ink-10 border-t pt-3 [@media(max-height:500px)]:hidden"
      href={LINKS.github}
      rel="noopener noreferrer"
      target="_blank"
      data-testid="github-heatmap"
    >
      <span className="flex justify-center gap-px">
        {weeks.slice(-52).map((week, weekIndex) => (
          <span className="flex flex-col gap-px" key={`w${weekIndex}`}>
            {week.map((level, dayIndex) => (
              <span
                className="h-[3px] w-[3px] rounded-[1px]"
                key={`d${dayIndex}`}
                style={{ backgroundColor: level < 0 ? "transparent" : `var(--heat-${level})` }}
              />
            ))}
          </span>
        ))}
      </span>
      <span className="mt-2 block text-center text-faint text-[9px] tracking-[0.1em] transition-colors duration-150 group-hover:text-rose">
        {total.toLocaleString()} contributions, past year
      </span>
    </a>
  );
}

export function ProjectsPeek() {
  const projects = useProjects();
  const graph = useContributions();
  return (
    <PeekCard label="lately" testId="peek-card-builds">
      {projects.map((project, index) => (
        <a
          className={`group block ${index > 0 ? "mt-2.5" : ""}`}
          data-peek-spare={project.spare ? "" : undefined}
          href={project.href}
          key={project.name}
          rel="noopener noreferrer"
          target="_blank"
          data-testid={`project-${index}`}
        >
          <span className="block font-medium text-ink text-xs group-hover:text-rose">
            {project.name}
            {project.stars > 0 ? (
              <span className="ml-1.5 font-normal text-[10px] text-faint tabular-nums">★ {project.stars}</span>
            ) : null}
          </span>
          <span className="block text-muted text-[11px]">{project.description}</span>
        </a>
      ))}
      {graph && graph.weeks.length > 0 ? <Heatmap {...graph} /> : null}
    </PeekCard>
  );
}

export function PostsPeek() {
  const paths = useSiteStats()?.paths;
  const posts = usePosts() ?? [];
  return (
    <PeekCard label="recent writing" testId="peek-card-writes">
      {posts.slice(0, 3).map((post, index) => {
        const reads = paths?.[`/blog/${post.slug}`] ?? 0;
        return (
          <TLink
            className={`group block ${index > 0 ? "mt-2.5" : ""}`}
            key={post.slug}
            to={`/blog/${post.slug}`}
            data-testid={`recent-post-${index}`}
          >
            <span className="block truncate text-ink text-xs group-hover:text-rose">{post.title}</span>
            <span className="block text-muted text-[10px] tabular-nums">
              {post.date.slice(0, 7)}
              {reads > 0 ? (
                <span className="text-faint">
                  {" · "}
                  {compact(reads)} {reads === 1 ? "read" : "reads"}
                </span>
              ) : null}
            </span>
          </TLink>
        );
      })}
      <span className={`block ${posts.length ? "mt-2.5" : ""}`}>
        <span className="block whitespace-nowrap text-faint text-xs italic">
          {posts.length ? "more, eventually" : "nothing yet"}
        </span>
        <span className="block text-[10px] text-faint tabular-nums">2026-??</span>
      </span>
    </PeekCard>
  );
}

export function MusicPeek({ onToggle, playing, track }) {
  const { cover, isPlaying } = track;
  return (
    <PeekCard compact={!isPlaying} label={isPlaying ? "right now" : "last played"} testId="peek-card-music">
      <span className={`flex items-center ${isPlaying ? "gap-3" : "gap-2.5"}`}>
        {cover ? (
          <span className="relative shrink-0">
            <img
              alt=""
              className={`block rounded-md object-cover ${isPlaying ? "h-12 w-12" : "h-10 w-10"}`}
              height={isPlaying ? 48 : 40}
              loading="lazy"
              referrerPolicy="no-referrer"
              src={cover}
              width={isPlaying ? 48 : 40}
              data-testid="music-cover"
            />
            {onToggle ? (
              <button
                aria-label={playing ? "pause the preview" : "play a preview"}
                className="peek-play"
                data-playing={playing ? "" : undefined}
                data-testid="music-play-button"
                onClick={() => {
                  sfx(playing ? "pause" : "play");
                  onToggle();
                }}
                type="button"
              >
                <span>
                  <Icon name={playing ? "pause" : "play"} />
                </span>
              </button>
            ) : null}
          </span>
        ) : null}
        <a
          className={`group flex min-w-0 items-center ${isPlaying ? "flex-1 gap-3" : "gap-2.5"}`}
          href={track.url}
          rel="noopener noreferrer"
          target="_blank"
          data-testid="music-track-link"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-ink text-xs group-hover:text-rose">{track.name}</span>
            <span className="block truncate text-muted text-[11px]">{track.artist}</span>
          </span>
        </a>
      </span>
    </PeekCard>
  );
}
