import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/"><Logo size={32} /></Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
