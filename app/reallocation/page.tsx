import Nav from "../components/Nav";
import {getGearTransferContext} from "../lib/gearTransferContext";
import ReallocationPlanner from "./ReallocationPlanner";
export default async function ReallocationPage(){
 const context=await getGearTransferContext();
 return <main><Nav/><header><div><p className="eyebrow">EQUIPMENT</p><h1>Gear transfers</h1><p className="sub">Move gear to higher-priority upgrades.</p></div></header>{context?<ReallocationPlanner {...context}/>:<div className="empty">Sync your account to check transfers.</div>}</main>;
}
