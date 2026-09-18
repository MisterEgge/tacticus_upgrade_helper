const FILE_NAMES: Record<string, string> = {
  "Kharn": "Kharn.png",
  "Trajann": "Trajann.png",
  "Re'vas": "Re'vas.png",
  "Isabella": "Isabella.png",
  "Abraxas": "Abraxas.png",
  "Anuphet": "Anuphet.png",
  "Nauseous": "Nauseous Rotbone.png",
  "Archimatos": "Archimatos.png",
  "Typhus": "Typhus.png",
  "Jain Zar": "Jain Zar.png",
  "Nicodemus": "Nicodemus.png",
  "Haarken": "Haarken Worldclaimer.png",
  "Laviscus": "Laviscus.png",
  "Judh": "Judh.png",
  "Tyrith": "Tyrith.png"
};

export default function CharacterName({ name }: { name: string }) {
  const file = FILE_NAMES[name] ?? `${name}.png`;
  const src = `https://tacticus.wiki.gg/wiki/Special:Redirect/file/${encodeURIComponent(file)}`;
  return <span className="characterCell"><img className="portrait" src={src} alt="" loading="lazy" /><strong>{name}</strong></span>;
}
