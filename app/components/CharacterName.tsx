const ICONS: Record<string,string> = {
  "Bellator":"bellator.webp",
  "Incisus":"incisus-removebg-preview.webp",
  "Titus":"titus.webp",
  "Makhotep":"Makhotep-removebg-preview.webp",
  "Marneus Calgar":"marneus_calgar-removebg-preview.webp"
};

function fallback(name:string){return name.slice(0,1).toUpperCase();}

export default function CharacterName({name,id}:{name:string;id?:string}){
  const icon=ICONS[name];
  const src=icon?`https://raw.githubusercontent.com/unrstuart/datamine_tacticus/main/images/${encodeURIComponent(icon)}`:null;
  return <span className="characterCell">
    {src?<img className="portrait" src={src} alt={name} loading="lazy"/>:<span className="portrait fallback">{fallback(name)}</span>}
    <strong>{name}</strong>
  </span>;
}
