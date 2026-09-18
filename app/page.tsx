import fs from "node:fs/promises";
import path from "node:path";

type Row = {
  character: string;
  slotId: string;
  currentItem: string;
  currentRarity: string;
  accountPriority: number;
  recommendedItem?: string;
  preferredLegendaryItemIds?: string[];
  preferredLegendaryItems?: string[];
};

type Report = {
  generatedAt: string;
  source: { player: string; powerLevel: number };
  summary: {
    units: number;
    charactersWithAbilitiesBelow17: number;
    individualAbilityUpgradesTo17: number;
    legendaryUnderTierSlots: number;
  };
  equipmentAllocation: {
    equipNow: Row[];
    buyWatch: Row[];
    compatibilityUnknown: Row[];
  };
};

async function getReport(): Promise<Report | null> {
  try {
    const file = path.join(process.cwd(), "output", "upgrade-report.json");
    return JSON.parse(await fs.readFile(file, "utf8")) as Report;
  } catch {
    return null;
  }
}

function Card({ label, value }: { label: string; value: number }) {
  return <div className="card"><strong>{value}</strong><span>{label}</span></div>;
}

export default async function Home() {
  const report = await getReport();

  if (!report) {
    return <main><h1>Tacticus Upgrade Helper</h1><div className="empty">
      <h2>No report yet</h2>
      <p>Run <code>npm run refresh</code>, then reload this page.</p>
    </div></main>;
  }

  const rows = [...report.equipmentAllocation.equipNow, ...report.equipmentAllocation.buyWatch];

  return <main>
    <header>
      <div><p className="eyebrow">TACTICUS UPGRADE HELPER</p><h1>{report.source.player}</h1></div>
      <div className="power">Power <strong>{report.source.powerLevel}</strong></div>
    </header>

    <section className="cards">
      <Card label="Characters" value={report.summary.units} />
      <Card label="Legendary gear upgrades" value={report.summary.legendaryUnderTierSlots} />
      <Card label="Equip now" value={report.equipmentAllocation.equipNow.length} />
      <Card label="Ability upgrades to 17" value={report.summary.individualAbilityUpgradesTo17} />
    </section>

    <section className="panel">
      <div className="sectionTitle"><div><p className="eyebrow">EQUIPMENT</p><h2>Priority upgrade queue</h2></div>
      <span>{rows.length} slots</span></div>
      <div className="tableWrap"><table>
        <thead><tr><th>Priority</th><th>Character</th><th>Slot</th><th>Current item</th><th>Target</th><th>Status</th></tr></thead>
        <tbody>{rows.map((row, i) => {
          const now = report.equipmentAllocation.equipNow.includes(row);
          return <tr key={row.character + row.slotId}>
            <td>{i + 1}</td><td><strong>{row.character}</strong></td><td>{row.slotId}</td>
            <td>{row.currentItem}<small>{row.currentRarity}</small></td>
            <td>{row.recommendedItem ?? row.preferredLegendaryItems?.join(", ") ?? row.preferredLegendaryItemIds?.join(", ") ?? "Review"}</td>
            <td><span className={now ? "status ready" : "status need"}>{now ? "EQUIP NOW" : "NEED"}</span></td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>

    <footer>Generated {new Date(report.generatedAt).toLocaleString()}</footer>
  </main>;
}
