import {readFile,writeFile} from "node:fs/promises";
import {parseDefenseHtml} from "./domain/warDefenseImport";

const path=process.argv[2];
if(!path)throw new Error('Usage: npm run import:war-defense -- "path/to/defender-page.html"');
const evidence=parseDefenseHtml(await readFile(path,"utf8"));
await writeFile("config/war_defense_evidence.json",JSON.stringify(evidence,null,2)+"\n");
console.log(`Imported ${evidence.cores.length} defender cores with flex counts. Raw HTML and account details were not copied.`);
