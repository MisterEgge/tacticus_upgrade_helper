import {readFile,stat} from "node:fs/promises";
import path from "node:path";

/** Cache parsed configuration, checking file versions on every request. */
export function fileCache<T>(files:string[],parse:(texts:string[])=>T) {
 let cached:{key:string;value:T}|undefined;
 return async():Promise<T>=>{
  const paths=files.map(file=>path.resolve(file));
  const versions=await Promise.all(paths.map(async file=>{
   const info=await stat(file,{bigint:true});
   return `${file}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
  }));
  const key=JSON.stringify(versions);
  if(cached?.key===key)return cached.value;
  const texts=await Promise.all(paths.map(file=>readFile(file,"utf8")));
  const value=parse(texts);
  cached={key,value};
  return value;
 };
}
