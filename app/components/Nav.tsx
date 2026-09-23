"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Dashboard"], ["/equipment", "Equipment"], ["/abilities", "Abilities"], ["/characters", "Characters"],
  ["/review-status", "Review Status"], ["/guild-raid", "Guild Raid"], ["/war-defense", "War Defense"], ["/campaigns", "Campaigns"], ["/inventory", "Inventory"], ["/inventory-cleanout", "Cleanout"], ["/reallocation", "Gear Audit"],
  ["/farming", "Farming"], ["/sources", "Shops & Sources"]
] as const;

export default function Nav()
{
  const pathname = usePathname();
  return <nav className="nav" aria-label="Main navigation">{links.map(([href, label]) =>
  {
    const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    return <Link href={href} key={href} aria-current={active ? "page" : undefined} className={active ? "active" : undefined}>{label}</Link>;
  })}</nav>;
}
