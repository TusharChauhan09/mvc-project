import Link from "next/link";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

export default function Home() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden -mt-[88px]">
      {/* Fullscreen looping background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Subtle floor gradient to anchor text without obscuring the video */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(var(--background) / 0.35) 60%, hsl(var(--background) / 0.7) 100%)",
        }}
      />

      {/* Hero content */}
      <section
        className="relative z-10 flex flex-col items-center justify-center px-4 pt-32 pb-40 text-center sm:px-6"
        style={{ paddingTop: 132, paddingBottom: 160 }}
      >
        <h1
          className="animate-fade-rise max-w-7xl break-words text-4xl font-normal leading-[0.95] text-balance sm:text-7xl md:text-8xl"
          style={{
            fontFamily: "'Instrument Serif', serif",
          }}
        >
          Where{" "}
          <em className="not-italic text-muted-foreground">dreams</em> rise{" "}
          <em className="not-italic text-muted-foreground">
            through the silence.
          </em>
        </h1>

        <p className="animate-fade-rise-delay text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed text-pretty">
          We&apos;re designing tools for deep thinkers, bold creators, and quiet
          rebels. Amid the chaos, we build digital spaces for sharp focus and
          inspired work.
        </p>

        <Link
          href="/register"
          className="animate-fade-rise-delay-2 liquid-glass mt-12 inline-flex cursor-pointer items-center justify-center rounded-full px-8 py-4 text-base text-foreground transition-transform hover:scale-[1.03] sm:px-14 sm:py-5"
        >
          Begin Journey
        </Link>
      </section>
    </div>
  );
}
