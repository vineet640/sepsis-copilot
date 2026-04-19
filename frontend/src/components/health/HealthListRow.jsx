import React from "react";
import { Link } from "react-router-dom";

function Chevron() {
  return (
    <svg className="health-row__chev" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 18l6-6-6-6"
      />
    </svg>
  );
}

export default function HealthListRow({ label, value, to, showChevron, onClick }) {
  const show = Boolean(showChevron || to);
  const body = (
    <>
      <span className="health-row__label">{label}</span>
      <span className="health-row__value">
        {value}
        {show ? <Chevron /> : null}
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="health-row health-row--interactive">
        {body}
      </Link>
    );
  }

  return (
    <div
      className={`health-row ${onClick ? "health-row--interactive" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {body}
    </div>
  );
}
