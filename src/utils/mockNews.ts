import { COMPANIES, Company } from "../data/companies";

export interface MockNewsStory {
  title: string;
  description: string;
  published_at: string;
  symbol: string;
  url: string;
  image: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  impact: "CRITICAL" | "MODERATE" | "ROUTINE";
  intelligence?: {
    translatedTitle?: string;
  };
}

// Helper to deterministically pick values based on symbol and index
function getHashedSelection<T>(arr: T[], seedStr: string): T {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % arr.length;
  return arr[index];
}

export function generateCompanySpecificNews(symbol: string, name: string, sector: string = ""): MockNewsStory[] {
  const norm = (symbol || "").toUpperCase();
  const targetCompany = COMPANIES.find(c => c.symbol === norm);
  
  // Resolve related partner companies for corporate deals
  const actualPartners = targetCompany?.partners || [];
  const partnerPool = actualPartners.length > 0 
    ? actualPartners 
    : COMPANIES.filter(c => c.symbol !== norm && c.sector === targetCompany?.sector).map(c => c.symbol);
  
  const resolvedPartner1 = partnerPool[0] || "TSM";
  const resolvedPartner2 = partnerPool[1] || "ASML";
  const partnerCo1 = COMPANIES.find(c => c.symbol === resolvedPartner1) || { name: "Taiwan Semiconductor Mfg CO", symbol: resolvedPartner1 };
  const partnerCo2 = COMPANIES.find(c => c.symbol === resolvedPartner2) || { name: "ASML Holding N.V.", symbol: resolvedPartner2 };

  const dateObj = new Date();
  const getPastTimeStr = (hoursAgo: number) => {
    const d = new Date(dateObj.getTime() - hoursAgo * 60 * 60 * 1000);
    return d.toISOString();
  };

  // 1. Precise, highly-specific data pools
  const names = [
    "COO Alistair Thorne",
    "Chief Procurement Officer Laura Sterling",
    "Global Logistics Director Marcus Vance",
    "Operations Vice President Sofia Rodriguez",
    "Director of Material Validation Chen Wei-min",
    "Senior Supply Supervisor Hans-Dieter Becker",
    "Operations Coordinator Maria Santone",
    "Infrastructure Lead Dr. Kenji Tanaka",
    "General Managing Director Alistair Vance",
    "Sourcing Specialist Elena Rostova",
    "Supply Chain VP Devon Carter",
    "Senior Logistics Analyst Gregory Vance"
  ];

  const locations = [
    "Hsinchu Science Park Fab 18A, Taiwan",
    "Bac Ninh industrial cluster near Hanoi, Vietnam",
    "Rotterdam Express Container Terminal 4B, Netherlands",
    "Port of Antwerp-Bruges Pier 12, Belgium",
    "Port of Zeebrugge general cargo yards, Belgium",
    "Singapore Jurong Island petrochemical specialized complex",
    "Helsinki shipping terminal KM-9, Finland",
    "Austin Giga-press fabrication hub, Texas",
    "Kaohsiung Harbor general customs yards, Taiwan",
    "Yantian Port deepwater container Terminal 3, Shenzhen",
    "Yokohama Precision chemical refinery, Japan",
    "Veldhoven EUV lithography system campus, Netherlands",
    "Long Beach Harbor Pier G terminal, California",
    "Port of Seattle custom Terminal 91, Washington",
    "Chennai high-density assembly hub, India",
    "Hsinchu Science Park Fab 12, Taiwan",
    "Shenzhen Bao'an tech assembly cluster, China"
  ];

  const techMaterials = [
    "sub-3nm extreme ultraviolet (EUV) lithography lens arrays",
    "monolithic high-purity single-crystal silicon wafers",
    "nanoscale chemical photoresist developer compounds",
    "ultra-dense active matrix optical server interconnects",
    "high-efficiency vapor-chamber liquid cooling sub-modules",
    "micro-lens specialized display glass substrate matrices",
    "synthetic sapphire precision display cover composites",
    "graphene ultra-high-conductivity thermal pads"
  ];

  const energyAutoMaterials = [
    "traceable high-grade cobalt hydroxide chemical concentrates",
    "lithium-iron-phosphate (LFP) high-density cell anodes",
    "solid-state crystalline lithium electrolyte matrices",
    "high-tensile multi-axial mechanical gear assemblies",
    "raw carbon-fiber reinforced structural chassis rods",
    "high-temperature synthetic catalyst refining compounds"
  ];

  const generalMaterials = [
    "cellulose-based lightweight paperboard shipping bundles",
    "recycled aircraft-grade alloy chassis mounting brackets",
    "high-density polymer composite protective panel sheets",
    "impact-resistant carbon-composite structural liners",
    "biodegradable organic transport preservation wraps",
    "high-precision linear hydraulic micro-actuators"
  ];

  // Pick appropriate materials based on industry/sector
  const isTechSemi = (sector || "").toLowerCase().includes("semi") || (sector || "").toLowerCase().includes("tech") || (sector || "").toLowerCase().includes("software");
  const isAutoEnergy = (sector || "").toLowerCase().includes("auto") || (sector || "").toLowerCase().includes("vehicle") || (sector || "").toLowerCase().includes("energy");
  
  const localMats = isTechSemi ? techMaterials : (isAutoEnergy ? energyAutoMaterials : generalMaterials);

  // Pick deterministic dynamic details for this specific company to make it extremely detailed
  const name1 = getHashedSelection(names, norm + "_name1");
  const name2 = getHashedSelection(names, norm + "_name2");
  const name3 = getHashedSelection(names, norm + "_name3");
  const name4 = getHashedSelection(names, norm + "_name4");

  const loc1 = getHashedSelection(locations, norm + "_loc1");
  const loc2 = getHashedSelection(locations, norm + "_loc2");
  const loc3 = getHashedSelection(locations, norm + "_loc3");
  const loc4 = getHashedSelection(locations, norm + "_loc4");

  const mat1 = getHashedSelection(localMats, norm + "_mat1");
  const mat2 = getHashedSelection(localMats, norm + "_mat2");

  const amountUSD_Deal = getHashedSelection(["$475 Million", "$1.2 Billion", "$890 Million", "$350 Million", "$1.6 Billion"], norm + "_deal_amt");
  const amountQty_Units = getHashedSelection(["125,000 units", "48,000 sets", "85,000 structural starts", "16,500 metric tons", "210,000 pieces"], norm + "_qty_amt");
  const amountRate = getHashedSelection(["a 6.8%", "a 12.4%", "an 8.2%", "a 14.5%", "a 9.3%"], norm + "_rate_amt");
  const oceanContainersNum = getHashedSelection(["12,400 standard TEU containers", "8,500 high-cube containers", "14,200 priority dry-bulk containers"], norm + "_containers_amt");
  const detourDelayDays = getHashedSelection(["11 additional", "9 full", "14 critical", "8 extended"], norm + "_detour_amt");
  const borderEscrowAmount = getHashedSelection(["4,500 priority shipping units", "18,200 precision control components", "9,800 secondary chipsets"], norm + "_escrow_amt");

  const stories: Omit<MockNewsStory, "symbol" | "published_at" | "url" | "image">[] = [];

  // Story 1: Custom Deep-tier Corporate Deal (Bullish)
  stories.push({
    title: `${symbol} finalizes ${amountUSD_Deal} corporate logistics integration deal with ${partnerCo1.name} (${partnerCo1.symbol}) and ${partnerCo2.name} (${partnerCo2.symbol}) at ${loc1}`,
    description: `Specifying direct operational alignments, ${name1} announced a ground-breaking supply chain agreement that links ${symbol} with core partners ${partnerCo1.symbol} and ${partnerCo2.symbol}. Under the contract, ${partnerCo1.symbol} will dedicate ${amountQty_Units} of subgrade ${mat1} per quarter to ${symbol}'s newly upgraded ${loc2} production line. This corporate pipeline consolidation stabilizes procurement rates and reduces the risk of volatile third-party pricing.`,
    sentiment: "BULLISH",
    impact: "MODERATE"
  });

  // Story 2: Maritime Choke-point & Transit Rerouting (Bearish)
  stories.push({
    title: `Suez transit congestion forces emergency routing detour for ${symbol} cargo from ${partnerCo1.symbol}, generating ${detourDelayDays} days delay`,
    description: `Suez Canal Logistics Coordinator ${name2} alerted carriers that regional blockades and security bottlenecks have forced ${symbol}'s priority oceanic containers to divert around the Cape of Good Hope, adding ${detourDelayDays} days to transit matrices. The maritime detour impacts ${oceanContainersNum} containing custom ${mat2} shipped directly from manufacturing lines operated by ${partnerCo1.name} (${partnerCo1.symbol}). Transport freight surcharges are expected to spike short-term operational margins.`,
    sentiment: "BEARISH",
    impact: "CRITICAL"
  });

  // Story 3: Innovative Yield Validation and Lab Optimization (Bullish)
  stories.push({
    title: `Precision sub-micron ${mat1} formulation trials register record yield curve at ${loc3}`,
    description: `Collaborating on an exclusive material validation study with ${partnerCo2.name} (${partnerCo2.symbol}), ${symbol}'s Lead Materials Analyst ${name3} verified that high-density testing of an upgraded chemical ${mat1} formulation succeeded with ${amountRate} yield optimization. The development, conducted under strict environmental controls at the specialized ${loc3} facility, is projected to reduce downstream manufacturing scraps by $45 Million per year and drastically improve structural durability.`,
    sentiment: "BULLISH",
    impact: "ROUTINE"
  });

  // Story 4: Customs Regulatory Hold / Transit ESD Lock (Bearish)
  stories.push({
    title: `Customs regulatory holding escrow at ${loc4} delays localized sub-tier material shipments to ${symbol}`,
    description: `A sudden compliance audit on carbon border adjustments has triggered container holding lines at ${loc4}'s general customs escrow yards, temporarily halting intermediate supply deliveries. Regional Managing Director ${name4} confirmed that ${borderEscrowAmount} bound for ${symbol}'s secondary assembly pipelines are subject to extended technical inspections. procurement coordinators have tapped strategic buffer reserves to avoid line stoppages at domestic assembly bays.`,
    sentiment: "BEARISH",
    impact: "MODERATE"
  });

  // Map to final MockNewsStory items
  return stories.map((s, idx) => ({
    ...s,
    symbol,
    published_at: getPastTimeStr(idx * 7 + 2), 
    url: `https://example.com/logistics/intel/${(symbol || "").toLowerCase()}-${idx}`,
    image: "",
    intelligence: {
      translatedTitle: `NEURAL ACCESS: ${s.title.toUpperCase()}`
    }
  }));
}
