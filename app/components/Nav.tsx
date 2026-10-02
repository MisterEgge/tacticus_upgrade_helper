"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const primary = [["/", "Dashboard"], ["/guild-raid", "Guild Raid"], ["/war-defense", "Guild War"], ["/campaigns", "Campaigns"]] as const;
const groups = [
 {label:"Equipment", links:[["/equipment", "Upgrade equipment"], ["/inventory", "Inventory demand"], ["/inventory-cleanout", "Cleanout"], ["/reallocation", "Gear audit"]]},
 {label:"Resources", links:[["/abilities", "Badge budget"], ["/farming", "Farming"], ["/elite-farming-gaps", "Elite farming gaps"], ["/material-completion", "Material completion"], ["/sources", "Shops & sources"], ["/review-status", "Review coverage"]]},
 {label:"Roster", links:[["/characters", "Characters"], ["/ratings", "Ratings"]]}
] as const;

export default function Nav()
{
 const pathname = usePathname();
 const nav = useRef<HTMLElement>(null);
 const closeMenus = () => nav.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu=>{menu.open=false;});
 useEffect(()=>{closeMenus();},[pathname]);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!nav.current?.contains(event.target))closeMenus();};
  document.addEventListener("pointerdown",outside);
  return ()=>document.removeEventListener("pointerdown",outside);
 },[]);
 const active = (href:string) => href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
 const renderLink = ([href,label]:readonly [string,string]) => <Link href={href} key={href} onClick={closeMenus} aria-current={active(href) ? "page" : undefined} className={active(href) ? "active" : undefined}>{label}</Link>;
 return <nav ref={nav} className="nav" aria-label="Main navigation" onKeyDown={event=>{if(event.key==="Escape"){const menu=(event.target as HTMLElement).closest("details");closeMenus();menu?.querySelector<HTMLElement>("summary")?.focus();}}}>
  {primary.map(renderLink)}{groups.map(group=><details key={group.label} className="navGroup" onToggle={event=>{if(event.currentTarget.open)nav.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(menu=>{if(menu!==event.currentTarget)menu.open=false;});}}>
   <summary className={group.links.some(([href])=>active(href))?"active":undefined}>{group.label}</summary>
   <div>{group.links.map(renderLink)}</div>
  </details>)}
 </nav>;
}
