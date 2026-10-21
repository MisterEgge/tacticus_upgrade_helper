"use client";
import {useState} from "react";
import {RANK_NAMES} from "../../src/domain/ranks";
import RankBadge from "./RankBadge";

export default function RankSelect({name,defaultValue,includeNext=false,skipFirst=false}:{name:string;defaultValue:string;includeNext?:boolean;skipFirst?:boolean}) {
 const [value,setValue]=useState(defaultValue);
 return <span className="rankSelect"><select name={name} value={value} onChange={event=>setValue(event.target.value)}>{includeNext?<option value="">Next rank</option>:null}{RANK_NAMES.map((rank,index)=>!skipFirst||index>0?<option key={rank} value={index}>{rank}</option>:null)}</select>{value!==""?<span aria-hidden="true"><RankBadge rank={Number(value)}/></span>:null}</span>;
}
