export default function Icon({ name }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="12"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 12 12"
      width="12"
    >
      {name === "play" ? <path d="M3 1.8v8.4L10 6z" fill="currentColor" stroke="none" /> : null}
      {name === "pause" ? <path d="M3.4 2v8M8.6 2v8" strokeWidth="2.2" /> : null}
    </svg>
  );
}
