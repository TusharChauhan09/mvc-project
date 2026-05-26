import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/5 mt-32">
      <div className="mx-auto max-w-7xl px-6 md:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Link
            href="/"
            className="text-2xl tracking-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Bookify<sup className="text-[10px]">®</sup>
          </Link>
          <p className="mt-2 text-xs text-muted-foreground max-w-sm leading-relaxed">
            Designing tools for deep thinkers, bold creators, and quiet rebels.
            Amid the chaos, we build digital spaces for sharp focus.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/journal" className="hover:text-foreground transition-colors">Journal</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Reach Us</Link>
          <span>© {new Date().getFullYear()} Bookify</span>
        </div>
      </div>
    </footer>
  );
}
