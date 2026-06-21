import { Link } from "react-router-dom";

const NAME = "ASTRID";

export default function Landing() {
  return (
    <div className="hero-black min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* animated ASTRID name */}
      <h1 className="astrid-name astrid-glow select-none text-[18vw] sm:text-[15vw] md:text-[11rem]">
        {NAME.split("").map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.12 * i}s` }}>
            {ch}
          </span>
        ))}
      </h1>

      {/* buttons */}
      <div
        className="reveal mt-12 flex items-center justify-center gap-4"
        style={{ animationDelay: `${0.12 * NAME.length + 0.3}s` }}
      >
        <Link to="/login" className="btn-ghost text-sm font-medium px-7 py-3 rounded-xl">
          Log in
        </Link>
        <Link to="/register" className="btn-ember text-sm font-medium px-7 py-3 rounded-xl">
          Create account
        </Link>
      </div>
    </div>
  );
}
