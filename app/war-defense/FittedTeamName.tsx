"use client";
import {useEffect,useRef} from "react";

export default function FittedTeamName({name}:{name:string})
{
    const ref=useRef<HTMLHeadingElement>(null);
    useEffect(()=>{
        const element=ref.current;
        if(!element)return;
        const fit=()=>{
            element.style.fontSize="20px";
            const available=element.clientWidth;
            const required=element.scrollWidth;
            if(available>0&&required>available)element.style.fontSize=`${20*available/required}px`;
        };
        fit();
        const observer=new ResizeObserver(fit);
        observer.observe(element);
        return()=>observer.disconnect();
    },[name]);
    return <h2 className="warTeamTitle" ref={ref} title={name}>{name}</h2>;
}
