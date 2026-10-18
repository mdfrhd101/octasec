// OctaSec mark (brand/octasec-logo/mark.svg) — red-team red octagon seal with a
// red command chevron and a live-green cursor. Inline, no background; sized by CSS.
export default function BrandMark() {
  return (
    <svg viewBox="30 30 196 196" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="octasecMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a86" />
          <stop offset=".5" stopColor="#e8433a" />
          <stop offset="1" stopColor="#9a1f18" />
        </linearGradient>
      </defs>
      <path
        d="M91.3 39.3 L164.7 39.3 L216.7 91.3 L216.7 164.7 L164.7 216.7 L91.3 216.7 L39.3 164.7 L39.3 91.3 Z"
        fill="none" stroke="url(#octasecMark)" strokeWidth="11" strokeLinejoin="round"
      />
      <path d="M173.2 47.8 L208.2 82.8" fill="none" stroke="#ffd9cf" strokeWidth="7" strokeLinecap="round" opacity=".85" />
      <path
        d="M110.4 85.5 L145.6 85.5 L170.5 110.4 L170.5 145.6 L145.6 170.5 L110.4 170.5 L85.5 145.6 L85.5 110.4 Z"
        fill="#05090d" stroke="#e8433a" strokeWidth="2" strokeOpacity=".4"
      />
      <path d="M109 110 L129 128 L109 146" fill="none" stroke="#e8433a" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="139" y="111" width="9" height="34" rx="3.5" fill="#15a06b" />
    </svg>
  );
}
