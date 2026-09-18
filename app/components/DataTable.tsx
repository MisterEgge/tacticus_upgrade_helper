"use client";
import {useMemo,useState} from "react";

export type Column<T>={key:string;label:string;render:(row:T)=>React.ReactNode;sort?:(row:T)=>string|number;search?:(row:T)=>string};
export default function DataTable<T>({rows,columns,placeholder="Search…"}:{rows:T[];columns:Column<T>[];placeholder?:string}){
 const [query,setQuery]=useState(""); const [sortKey,setSortKey]=useState(columns[0]?.key??""); const [desc,setDesc]=useState(false);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();const filtered=!q?rows:rows.filter(r=>columns.some(c=>(c.search?.(r)??String(c.sort?.(r)??"")).toLowerCase().includes(q)));
 const col=columns.find(c=>c.key===sortKey); if(!col?.sort)return filtered;
 return [...filtered].sort((a,b)=>{const av=col.sort!(a),bv=col.sort!(b);const n=typeof av==="number"&&typeof bv==="number"?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true});return desc?-n:n;});},[rows,columns,query,sortKey,desc]);
 function sort(key:string){if(sortKey===key)setDesc(v=>!v);else{setSortKey(key);setDesc(false);}}
 return <><div className="tableTools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder}/><span>{visible.length} of {rows.length}</span></div>
 <div className="tableWrap"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.sort?<button className="sortButton" onClick={()=>sort(c.key)}>{c.label}{sortKey===c.key?(desc?" ↓":" ↑"):""}</button>:c.label}</th>)}</tr></thead>
 <tbody>{visible.map((r,i)=><tr key={i}>{columns.map(c=><td key={c.key}>{c.render(r)}</td>)}</tr>)}</tbody></table></div></>;
}
