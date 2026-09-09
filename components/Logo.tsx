/**
 * Brand mark: the actual designed "CF" aperture logo (public/logo.png),
 * cropped in via a scaled/positioned background-image to trim the source
 * file's black padding so the mark itself fills the badge.
 */
export default function Logo({
  size = 32,
  wordmark = true,
  wordmarkClassName = "text-sm font-bold tracking-tight text-white",
  className = "",
}: {
  /** Badge edge length in px. */
  size?: number;
  /** Render the "CreativeFlow" wordmark next to the badge. */
  wordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
      <span
        role="img"
        aria-label="CreativeFlow"
        className="block shrink-0 bg-[#05060a]"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundImage: "url(/logo.png)",
          backgroundSize: "165% 165%",
          backgroundPosition: "62% 46%",
          backgroundRepeat: "no-repeat",
        }}
      />
      {wordmark && (
        <span className={wordmarkClassName}>
          Creative<span className="text-neutral-400">Flow</span>
        </span>
      )}
    </span>
  );
}
