import { LINKS } from "@/lib/content";

// Credit for the template, as asked: rex.wf is MIT-licensed and this is its port.
export default function Credit() {
  return (
    <span className="credit" data-testid="template-credit">
      <span aria-hidden="true" className="paren">
        (
      </span>{" "}
      thanks{" "}
      <a className="credit-link" href={LINKS.rex} rel="noopener noreferrer" target="_blank" data-testid="credit-rex-link">
        rex
      </a>{" "}
      for the template{" "}
      <span aria-hidden="true" className="paren">
        )
      </span>
    </span>
  );
}
