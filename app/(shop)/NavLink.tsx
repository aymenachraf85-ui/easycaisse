"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Color = "emerald" | "blue" | "violet" | "orange" | "cyan" | "rose" | "amber";

const COLORS: Record<Color, { active: string; idle: string }> = {
  emerald: { active: "bg-emerald-500 text-white border-emerald-500", idle: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  blue:    { active: "bg-blue-500 text-white border-blue-500",       idle: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  violet:  { active: "bg-violet-500 text-white border-violet-500",   idle: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" },
  orange:  { active: "bg-orange-500 text-white border-orange-500",   idle: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  cyan:    { active: "bg-cyan-500 text-white border-cyan-500",       idle: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100" },
  rose:    { active: "bg-rose-500 text-white border-rose-500",       idle: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
  amber:   { active: "bg-amber-500 text-white border-amber-500",     idle: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
};

export default function NavLink({
  href,
  color,
  icon,
  label,
}: {
  href: string;
  color: Color;
  icon: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const c = COLORS[color];

  return (
    <Link
      href={href}
      className={`shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition ${active ? c.active + " shadow-sm" : c.idle}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}