import {JSDOM} from "jsdom";
import {createHash} from "node:crypto";
import type {DefenseEvidence} from "./warDefenseEvidence";

/** Parse inert HTML only. Never persist scripts, account details, cookies or form tokens. */
export function parseDefenseHtml(html:string,importedAt=new Date().toISOString()):DefenseEvidence{
 const dom=new JSDOM(html),document=dom.window.document;
 try{
  const form=document.querySelector('form[action="/wars/analyze/defenders"]');
  if(!form)throw new Error("No defender report filter form found; use a fully loaded defender export.");
  const supported=new Set(["battlefield[]","season[]","map[]"]);
  if([...form.querySelectorAll<HTMLInputElement>('input:checked')].some(input=>input.name&&!supported.has(input.name)))throw new Error("Unsupported selected source filter; clear guild/player filters or extend the import schema before importing.");
  const selected=(name:string)=>[...(form?.querySelectorAll<HTMLInputElement>('input:checked')??[])].filter(input=>input.name===name).map(input=>input.value);
  const value=(name:string)=>form?.querySelector<HTMLSelectElement>(`select[name="${name}"]`)?.value??"";
  if(value("outcome"))throw new Error("Use All Results when exporting; outcome-filtered counts cannot rank defense performance.");
  const cores=[...document.querySelectorAll<HTMLTableRowElement>('tr[data-core-key]')].map(row=>{
   const key=row.dataset.coreKey!,core=key.split("|"),cells=[...row.cells];
   const used=Number(cells[2]?.textContent?.trim()),wins=Number(cells[3]?.textContent?.trim());
   const detail=document.getElementById(`core-details-${key}`);
   const cards=[...(detail?.querySelector('.grid')?.children??[])];
   const flex=cards.map(card=>{
    const id=card.querySelector('img[alt]')?.getAttribute('alt');
    const fragment=new JSDOM(card.innerHTML.replace(/<!--([\s\S]*?)-->/g,"$1"));
    const text=fragment.window.document.body.textContent??"";
    const used=Number(text.match(/Used\s+(\d+)/)?.[1]),wins=Number(text.match(/Wins\s+(\d+)/)?.[1]);
    fragment.window.close();
    if(!id||!Number.isSafeInteger(used)||used<=0||!Number.isSafeInteger(wins)||wins<0||wins>used)throw new Error(`Invalid flex evidence for ${key}`);
    return {id,used,wins};
   });
   if(core.length!==3||new Set(core).size!==3||!Number.isSafeInteger(used)||used<=0||!Number.isSafeInteger(wins)||wins<0||wins>used||flex.length<2)throw new Error(`Invalid core evidence for ${key}`);
   return {key,core,used,wins,flex};
  });
  if(!cores.length)throw new Error("No defender core statistics found; use a fully loaded defender HTML export.");
  if(new Set(cores.map(core=>core.key)).size!==cores.length)throw new Error("Duplicate defender cores in export.");
  const metric="Follow-up/debuffed attacks: holds / attacks faced. Core and individual flex cohorts; not exact five-character results.";
  if(!document.body.textContent?.includes('debuffed'))throw new Error("Unrecognized source metric; review the exported page before importing.");
  return {schemaVersion:1,sourceUrl:"https://tacticus.xyz/wars/analyze/defenders",importedAt,sourceSha256:createHash("sha256").update(html).digest("hex"),metric,scope:{battlefields:selected("battlefield[]"),seasons:selected("season[]"),maps:selected("map[]"),outcome:value("outcome"),battle:value("battle")},cores};
 }finally{dom.window.close();}
}
