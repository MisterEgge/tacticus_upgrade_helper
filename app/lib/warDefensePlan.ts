import snapshot from "../../config/war_defense_evidence.json";
import {selectEvidenceDefense,type DefenseEvidence} from "../../src/domain/warDefenseEvidence";
import type {Report} from "./report";

export const warDefenseEvidence=snapshot as DefenseEvidence;
/** Use identical rank-qualified assignments in War, resource budgets and gear protection. */
export function getAccountWarDefense(report:Report){
 const units=new Map(report.roster.map(unit=>[unit.id,unit]));
 return selectEvidenceDefense(warDefenseEvidence.cores,report.roster).map(team=>({...team,memberIds:team.members,members:team.members.map(id=>units.get(id)!.name)}));
}
