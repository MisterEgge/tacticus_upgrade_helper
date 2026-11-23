import Link from "next/link";
export default function PriorityLink({configured=false}:{configured?:boolean}) {
    return <Link className="priorityLink" href="/priorities">{configured ? "Update priorities" : "Set priorities"}</Link>;
}
