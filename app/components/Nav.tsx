"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const primary = [["/", "Dashboard"], ["/equipment", "Equipment"], ["/abilities", "Badge budget"], ["/guild-raid", "Guild Raid"], ["/war-defense", "Guild War"], ["/campaigns", "Campaigns"], ["/farming", "Farming"], ["/characters", "Characters"], ["/inventory", "Inventory"]] as const;
const secondary = [["/ratings", "Ratings"], ["/sources", "Shops & Sources"], ["/review-status", "Review Status"], ["/inventory-cleanout", "Cleanout"], ["/reallocation", "Gear Audit"]] as const;
export default function Nav()
{
 const pathname = usePathname();
 const active = (href:string) => href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
 const renderLink = ([href,label]:readonly [string,string]) => <Link href={href} key={href} aria-current={active(href) ? "page" : undefined} className={active(href) ? "active" : undefined}>{label}</Link>;
 const current = secondary.find(([href])=>active(href));
 return <nav className="nav" aria-label="Main navigation">{primary.map(renderLink)}<details className="navMore"><summary>{current ? `More · ${current[1]}` : "More"}</summary><div>{secondary.map(renderLink)}</div></details></nav>;
}
