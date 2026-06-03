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

export function generateCompanySpecificNews(symbol: string, name: string, sector: string): MockNewsStory[] {
  const norm = symbol.toUpperCase();
  const dateObj = new Date();
  
  // Decoupled dates to make them look realistic
  const getPastTimeStr = (hoursAgo: number) => {
    const d = new Date(dateObj.getTime() - hoursAgo * 60 * 60 * 1000);
    return d.toISOString();
  };

  const stories: Omit<MockNewsStory, "symbol" | "published_at" | "url" | "image">[] = [];

  // 1. Handcrafted Overrides for Top Assets
  if (norm === "AAPL") {
    stories.push(
      {
        title: "Bac Ninh packaging clusters expand trial of next-gen camera modules following optical sensor upgrade.",
        description: "Supply chain intelligence reports indicate Apple's assembly network in Northern Vietnam has successfully qualified secondary sub-tier sensor lines. This diversification reduces reliance on primary mainland optical labs.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Ho Chi Minh cargo hub slot congestion triggers high-priority air freight surcharges for smartphone components.",
        description: "Surging tech shipments and seasonal carrier capacity limits have choked primary airport lanes out of Vietnam. High-volume shippers are activating dedicated chartered flights to secure Q4 launch schedules.",
        sentiment: "BEARISH",
        impact: "CRITICAL"
      },
      {
        title: "Custom silicon node transition at TSMC N3E registers historic 84% yield metrics.",
        description: "Confidential foundry audits confirm Apple's upcoming processor silicon is running ahead of typical yield curves. Initial batch shipments have already been scheduled for priority transit routes.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Sub-tier raw silicon substrate impurity delays final logic driver packaging trials.",
        description: "A minor chemical variance in precision cleansing acids has temporarily forced a brief pause at a specialized Japanese compound materials provider supplying Apple's secondary display IC lines.",
        sentiment: "BEARISH",
        impact: "MODERATE"
      }
    );
  } else if (norm === "TSM") {
    stories.push(
      {
        title: "Strategic chemical raw material stockpile at Hsinchu Hub raised to 45-day reserve levels.",
        description: "In anticipation of regional maritime lane restrictions, TSMC procurement teams have successfully completed buffer accumulation of key cleanroom chemistry and raw atmospheric neon gases.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Taiwan airspace airspace transit safety audits introduce minor routing delays for high-value silicon dies.",
        description: "Regional airspace safety audits have led to minor routing adjustments for express freight carriers departing Taoyuan International Airport. Logistics managers are adding 6-hour buffers for East Asian routes.",
        sentiment: "BEARISH",
        impact: "CRITICAL"
      },
      {
        title: "CoWoS-S advanced packaging capacity scales ahead of baseline plan to absorb global AI queue.",
        description: "Engineering teams in Taichung have completed qualification of high-volume sub-lithic integration lanes, promising a 20% increase in packaging throughput for advanced deep learning hardware.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Sub-station power quality volatility at Southern Science Park prompts brief automated tool calibration reviews.",
        description: "A temporary utility frequency fluctuation triggered autonomous safety protocols on EUV scanner sub-assemblies. wafer processing resumed within 60 minutes, but calibration audits are ongoing.",
        sentiment: "BEARISH",
        impact: "MODERATE"
      }
    );
  } else if (norm === "NVDA") {
    stories.push(
      {
        title: "Secondary advanced packaging qualification with multi-tenant sub-tiers accelerates.",
        description: "Nvidia is qualifying secondary advanced packaging lines in Korea and North America to bypass current high-performance computing silicon substrate bottlenecks.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "High-density active matrix optical switches face specialized micro-lens supplier shortages.",
        description: "High-demand high-velocity network cluster components suffer delays as a key European specialized glassware supplier reports localized labor constraints and micro-cleanroom delays.",
        sentiment: "BEARISH",
        impact: "CRITICAL"
      },
      {
        title: "Unveils next-generation mesh-computing inter-node protocols to reduce network layer latency by 12%.",
        description: "Architectural teams have qualified new active interconnect protocols that significantly improve data-rate handshakes across multi-cabinet cluster configurations, lowering physical node energy dissipation.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Intermediate copper microchannel cooling assemblies face customs port clearance queues at Pacific entry points.",
        description: "Increased import compliance verification on highly specialized dense thermal cooling modules has extended customs dwell times at Long Beach to 9 business days.",
        sentiment: "BEARISH",
        impact: "MODERATE"
      }
    );
  } else if (norm === "XOM" || norm === "ARAMCO" || norm === "SHEL") {
    stories.push(
      {
        title: `${name} secures long-term alternative dynamic pipeline supply synchronization across European nodes.`,
        description: "Dynamic logistics contracts have been finalized to link central storage caverns directly into regional distribution lines, offsetting regional port demurrage and loading delays.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Bab-el-Mandeb maritime safety warnings prompt route deviations for critical crude cargo vessels.",
        description: "Unstable maritime security metrics inside the southern Red Sea corridor have forced tankers to bypass the Suez Suez Canal, diverting cargo around the Cape of Good Hope, adding 12 days to transit schedules.",
        sentiment: "BEARISH",
        impact: "CRITICAL"
      },
      {
        title: "Deepwater subocean active sensors deployed to continuously monitor undersea conduit stress points.",
        description: "Autonomous acoustic telemetry systems have been successfully connected across undersea pipelines, enabling real-time detection of seismic stress and early vessel proximity alerts.",
        sentiment: "BULLISH",
        impact: "ROUTINE"
      },
      {
        title: "Crystalline refining catalyst powders suffer logistics hold-ups at primary custom checkpoints.",
        description: "A sudden export permit review for essential catalytic compound blends has initiated cargo queues, temporarily limiting maximum daily refining throughput in secondary regional hubs.",
        sentiment: "BEARISH",
        impact: "MODERATE"
      }
    );
  } else if (norm === "TSLA") {
    stories.push(
      {
        title: "Gigafactory Shanghai secures localized lithium battery chemistry supply chains.",
        description: "Tesla purchasing has successfully locked long-term supply arrangements with key chemical brine providers, buffering the automotive division from volatile South American transport and tariff metrics.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Specialized high-impact rare earth magnets bottleneck at Rotterdam cargo yards.",
        description: "Unscheduled delays in high-density vehicle motor assembly lines have been traced to container handling backlogs in Eastern European freight depots.",
        sentiment: "BEARISH",
        impact: "CRITICAL"
      },
      {
        title: "Hardware stress trials of custom automated vehicle guidance microkernels completed successfully.",
        description: "In-house software engineers have finalized field testing on next-generation computing boards, showcasing a 40% reduction in controller pipeline cycle latency.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Port of Zeebrugge transport strike limits vehicle dispatch schedules across Western European rail lines.",
        description: "A sudden 48-hour localized maritime team strike has restricted vehicle dispatch rates outward from primary seaside consolidation terminals, forcing temporary warehousing holding overrides.",
        sentiment: "BEARISH",
        impact: "MODERATE"
      }
    );
  } else if (norm === "AMZN") {
    stories.push(
      {
        title: "Automated distribution centers in central logistics hubs deploy advanced container density optimizers.",
        description: "Amazon has qualified a new automated software system that predicts package cluster density, boosting vehicle load rates and shaving valuable milliseconds off sorting processes.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Panama Canal capacity queues restrict dynamic inter-coastal freight flow velocity.",
        description: "Reduced canal water drafts have caused carrier schedule delays. Amazon logistics planners are rerouting high-volume consumer freight to West Coast rail links.",
        sentiment: "BEARISH",
        impact: "CRITICAL"
      },
      {
        title: "High-security air-cargo priority bridges activated to handle critical logistics surcharges.",
        description: "To safeguard vital delivery metrics, Amazon Air has secured priority slots across domestic transport routes, bypassing slow-moving maritime hubs.",
        sentiment: "BULLISH",
        impact: "MODERATE"
      },
      {
        title: "Last-mile courier fleet operations report localized fuel blend surcharge margins.",
        description: "Global energy fluctuations and transport fuel restrictions have triggered fuel surcharge adjusters, marginally expanding short-range delivery overheads.",
        sentiment: "BEARISH",
        impact: "ROUTINE"
      }
    );
  } else {
    // Sector-specific tailored fallback stories (highly detailed and targeted)
    const sectorLower = sector.toLowerCase();
    if (sectorLower.includes("semi") || sectorLower.includes("chip")) {
      stories.push(
        {
          title: `Ultrapure photoresist compounds qualify for advanced sub-10nm lithic processes at ${name}.`,
          description: "Technical directors have verified next-tier photoresist packages, establishing high precision boundaries and reducing high-frequency tooling scrap rates.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Atmospheric neon gas shipments delayed as Eastern European transport connectors face customs reviews.",
          description: "High-purity noble gases essential for laser alignment arrays are experiencing short-term delays due to border transit safety checks, expanding local warehouse draw rates.",
          sentiment: "BEARISH",
          impact: "CRITICAL"
        },
        {
          title: "Dual-sourcing semiconductor base substrate wafer agreements finalized to safeguard assembly flow.",
          description: "To mitigate the risk of single-source wafer supply constraints, procurement has onboarded secondary raw materials partners across non-volatile regions.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Precision quartz etching components experience localized logistic customs queues.",
          description: "Import clearance times for high-grade quartz reactor columns have increased by 8 days, necessitating strategic buffer usage at fabrication cleanrooms.",
          sentiment: "BEARISH",
          impact: "MODERATE"
        }
      );
    } else if (sectorLower.includes("tech") || sectorLower.includes("communicat") || sectorLower.includes("software")) {
      stories.push(
        {
          title: `${name} deploys custom high-bandwidth optical switches across primary edge nodes to minimize ping latency.`,
          description: "Engineering groups have authorized the rollout of advanced optical routing frameworks, eliminating previous server packet bottlenecks under hyper-scale cloud loads.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Mainland hardware suppliers notify tech division of extended printed circuit board component delays.",
          description: "Environmental compliance audits at key component packaging facilities have created a subgrade board supply queue, pushing assembly dates back by 2 weeks.",
          sentiment: "BEARISH",
          impact: "CRITICAL"
        },
        {
          title: "Multi-regional cluster backup nodes sync successfully via secure orbital communication bridges.",
          description: "Redundant edge infrastructure has established a fallback loop using commercial satellite constellations, securing data persistence plans even during severe undersea disruptions.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Global cloud server component shipping containers face terminal queue delays at western ports.",
          description: "Unbalanced container return vectors at prime terminals have led to an 11-day logistical backlog for technical rack upgrade components.",
          sentiment: "BEARISH",
          impact: "ROUTINE"
        }
      );
    } else if (sectorLower.includes("finance") || sectorLower.includes("bank") || sectorLower.includes("invest")) {
      stories.push(
        {
          title: `${name} completes integration of secure real-time liquidity matching network to reduce transit settlements.`,
          description: "The capital management division has deployed an automated protocol that clears cross-currency trades in microseconds, dramatically reducing collateral requirements.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Cross-border sovereign security compliance barriers restrict liquidity flows across major capital corridors.",
          description: "Tightened reporting directives on offshore assets have increased transaction audit times, introducing a 30-basis-point transaction friction.",
          sentiment: "BEARISH",
          impact: "CRITICAL"
        },
        {
          title: "Launches algorithmic sovereign yield synchronization system to optimize cross-border bond holdings.",
          description: "Capital allocators are deploying advanced neural monitors to continuously map international treasury yields, maximizing asset allocation spreads.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Offshore data clearing infrastructure registers power supply and backup generator testing lags.",
          description: "A minor technical maintenance audit on regional auxiliary power banks has led to temporary clearing system lag notifications on historical transaction queues.",
          sentiment: "BEARISH",
          impact: "ROUTINE"
        }
      );
    } else if (sectorLower.includes("auto") || sectorLower.includes("vehicle") || sectorLower.includes("indust")) {
      stories.push(
        {
          title: `${name} secures multi-tiered cobalt and high-grade battery raw materials supply pathways.`,
          description: "The vehicle manufacturing group has completed contract seals to purchase traceable elements from verified miners, keeping cell inputs compliant with local sourcing guidelines.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "High-NA mechanical sub-assemblies face cargo holding holds due to component verification issues.",
          description: "Customs inspectors at northern hubs are verifying subgrade compliance on highly technical drive train components, causing specialized warehouse backlogs.",
          sentiment: "BEARISH",
          impact: "CRITICAL"
        },
        {
          title: "Qualifies high-integrity titanium casting techniques to shave substantial weight off chassis frame.",
          description: "Metallurgical teams have integrated new casting ovens, ensuring uniform molecular consistency, boosting vehicle crash-test metrics and reducing raw material waste.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Maritime vehicle freight carriers detour around bottlenecked canals, escalating transport costs.",
          description: "Persistent shipping congestion at primary canals has triggered route adjustments, expanding bulk vehicle transport shipping bills by 18%.",
          sentiment: "BEARISH",
          impact: "MODERATE"
        }
      );
    } else {
      // Default Generic Supply Chain Stories for any other sector (like retail, materials)
      stories.push(
        {
          title: `${name} streamlines automated warehouse coordination system to reduce operational container footprint.`,
          description: "Distribution managers have deployed next-generation automated sorting rigs, reducing product handling times and improving general storage density layouts.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Raw packaging boards and cellulose inputs face maritime shipping delays.",
          description: "Severe weather and congested port schedules have delayed basic shipping materials, prompting inventory planners to deploy standby cardboard stock.",
          sentiment: "BEARISH",
          impact: "CRITICAL"
        },
        {
          title: "Secures alternative rail supply corridors to stabilize multi-regional logistics targets.",
          description: "To hedge against ocean shipping volatility, the supply chain group has initialized regular continental land-bridge routes connecting primary hubs.",
          sentiment: "BULLISH",
          impact: "MODERATE"
        },
        {
          title: "Regional fuel surcharge adjustments increase short-haul truck freight expenses.",
          description: "Adjustments to carrier tariff rules have pushed short-range distributor truck delivery quotes higher, raising domestic distribution costs.",
          sentiment: "BEARISH",
          impact: "ROUTINE"
        }
      );
    }
  }

  // Map other properties to fulfill interface
  return stories.map((s, idx) => ({
    ...s,
    symbol,
    published_at: getPastTimeStr(idx * 7 + 2), // staggered hours in the past
    url: `https://example.com/logistics/intel/${symbol.toLowerCase()}-${idx}`,
    image: "",
    intelligence: {
      translatedTitle: `NEURAL ACCESS: ${s.title.toUpperCase()}`
    }
  }));
}
