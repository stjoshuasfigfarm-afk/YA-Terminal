const fs = require('fs');
let code = fs.readFileSync('src/components/OrbitalMap.tsx', 'utf8');

const oldReturn = `      return {
        type: "Feature",
        properties: {
          color: lineColor,
          width: pWidth,
          relData: typeof line.relData === "string" ? line.relData : JSON.stringify(line.relData || {}),
          fromSymbol,
          fromName: line.from?.name || "",
          toSymbol,
          toName: line.to?.name || "",
          isImpacted: isLineImpacted || corridorBlocked ? 1 : 0,
          blockedChokes: JSON.stringify(blockedChokes),
        },
        geometry: {
          type: "LineString",
          coordinates: arcCoords,
        },
      };`;

const newReturn = `      
      const popupHtml = \`
        <div class="p-2.5 font-mono bg-zinc-950/95 backdrop-blur-md text-zinc-300 border border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.8)] rounded-sm min-w-[200px]">
          <div class="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white">\${fromSymbol}</span>
              <span class="text-zinc-500 text-[8px]">▶</span>
              <span class="font-bold text-white">\${toSymbol}</span>
            </div>
            <span class="text-[8px] font-bold px-1.5 py-0.5 rounded-xs" style="color: \${lineColor}; background: \${lineColor}20; border: 1px solid \${lineColor}40">
              \${relDataObj.healthStatus || (isLineImpacted || corridorBlocked ? 'BLOCKED' : 'ACTIVE')}
            </span>
          </div>
          <div class="space-y-1 text-[9px]">
            \${relDataObj.relType ? \`<div class="flex justify-between"><span class="text-zinc-500">TYPE</span><span class="text-emerald-400">\${relDataObj.relType}</span></div>\` : ''}
            \${relDataObj.commodity ? \`<div class="flex justify-between"><span class="text-zinc-500">CARGO</span><span class="text-zinc-300">\${relDataObj.commodity}</span></div>\` : ''}
            \${relDataObj.qty ? \`<div class="flex justify-between"><span class="text-zinc-500">VOLUME</span><span class="text-cyan-400">\${relDataObj.qty}</span></div>\` : ''}
            \${relDataObj.currencyVol ? \`<div class="flex justify-between"><span class="text-zinc-500">VALUE</span><span class="text-green-400">\${relDataObj.currencyVol}</span></div>\` : ''}
            \${relDataObj.riskLevel ? \`<div class="flex justify-between"><span class="text-zinc-500">RISK</span><span class="\${Number(relDataObj.riskLevel) > 0.7 ? 'text-red-400' : 'text-amber-400'}">\${relDataObj.riskLevel}</span></div>\` : ''}
            \${blockedChokes.length > 0 ? \`<div class="mt-1.5 pt-1.5 border-t border-red-900/30 text-[8px] text-red-400/80 leading-tight">WARNING: Route intersects active blockage (\${blockedChokes.join(', ')})</div>\` : ''}
          </div>
        </div>
      \`;

      return {
        type: "Feature",
        properties: {
          color: lineColor,
          width: pWidth,
          relData: typeof line.relData === "string" ? line.relData : JSON.stringify(line.relData || {}),
          fromSymbol,
          fromName: line.from?.name || "",
          toSymbol,
          toName: line.to?.name || "",
          isImpacted: isLineImpacted || corridorBlocked ? 1 : 0,
          blockedChokes: JSON.stringify(blockedChokes),
          popupHtml,
        },
        geometry: {
          type: "LineString",
          coordinates: arcCoords,
        },
      };`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('src/components/OrbitalMap.tsx', code);
