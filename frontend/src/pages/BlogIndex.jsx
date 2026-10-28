import { useEffect } from "react";
import BackLink from "@/components/BackLink";
import TLink from "@/components/TLink";
import { usePosts } from "@/lib/use-posts";

export default function BlogIndex() {
  const posts = usePosts();

  useEffect(() => {
    document.title = "writing · harsh";
  }, []);

  return (
    <main className="min-h-dvh paper px-7 py-14 font-serif-display text-ink md:py-24" data-testid="blog-index-page">
      <div className="page-column mx-auto w-full max-w-xl">
        <BackLink className="rise font-mono text-muted text-xs" to="/" data-testid="blog-home-link">
          home
        </BackLink>

        <h1 className="rise mt-10 text-[clamp(2.4rem,7vw,3.2rem)] leading-none" style={{ animationDelay: "80ms" }}>
          writing<span className="full-stop text-rose">.</span>
        </h1>
        <p className="rise mt-3 font-mono text-faint text-[11px] italic" style={{ animationDelay: "150ms" }}>
          ( infrequent. long. )
        </p>

        <ul className="post-list mt-14" data-testid="post-list">
          {(posts ?? []).map((post, index) => (
            <li className="rise" key={post.slug} style={{ animationDelay: `${230 + index * 70}ms` }}>
              <TLink className="group block py-4" to={`/blog/${post.slug}`} data-testid={`post-link-${post.slug}`}>
                <span className="block font-mono text-faint text-[11px] tabular-nums transition-colors duration-200 group-hover:text-muted">
                  {post.dateLabel}
                  {post.sample ? " · sample" : ""}
                </span>
                <span
                  className="mt-1 block w-fit text-[clamp(1.4rem,4.5vw,1.8rem)] leading-tight transition-colors duration-200 group-hover:text-rose"
                  style={{ viewTransitionName: `post-${post.slug}` }}
                >
                  {post.title}
                  <span aria-hidden="true" className="ml-2 inline-block text-rose transition-transform duration-200 ease-strong group-hover:translate-x-1">
                    →
                  </span>
                </span>
                <span className="mt-1.5 block font-serif-body text-muted text-[15px] italic">{post.description}</span>
              </TLink>
            </li>
          ))}
          {posts && posts.length === 0 ? (
            <li className="rise py-4 font-mono text-faint text-[11px] italic">( nothing here yet )</li>
          ) : null}
        </ul>
      </div>
    </main>
  );
}
