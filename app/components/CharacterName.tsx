function portraitKey(id: string) {
  return id.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/-/g, "_").toLowerCase();
}
export default function CharacterName({ name, id }: { name: string; id?: string }) {
  const src=id?`https://tacticusdb.com/images/generated/characters/portrait_${portraitKey(id)}.webp`:"";
  return <span className="characterCell">{src?<img className="portrait" src={src} alt={name} loading="lazy"/>:<span className="portrait fallback">{name.slice(0,1)}</span>}<strong>{name}</strong></span>;
}
