import Link from "next/link";
export default function Nav(){return <nav className="nav">
<Link href="/">Dashboard</Link><Link href="/equipment">Equipment</Link><Link href="/abilities">Abilities</Link>
<Link href="/characters">Characters</Link><Link href="/review-status">Review Status</Link><Link href="/campaigns">Campaigns</Link><Link href="/inventory">Inventory</Link><Link href="/inventory-cleanout">Cleanout</Link><Link href="/farming">Farming</Link>
</nav>;}
