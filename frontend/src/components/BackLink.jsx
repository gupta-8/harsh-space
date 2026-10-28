import TLink from "@/components/TLink";

export default function BackLink({ children, className = "", to, ...rest }) {
  return (
    <TLink className={`back-link ${className}`} to={to} {...rest}>
      <span aria-hidden="true" className="back-arrow">
        ←
      </span>
      {children}
    </TLink>
  );
}
