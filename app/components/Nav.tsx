import Link from "next/link";

export default function Nav() {
  return <nav className="nav">
    <Link href="/">Dashboard</Link>
    <Link href="/equipment">Equipment</Link>
    <span>Abilities</span><span>Characters</span><span>Inventory</span><span>Farming</span>
  </nav>;
}
