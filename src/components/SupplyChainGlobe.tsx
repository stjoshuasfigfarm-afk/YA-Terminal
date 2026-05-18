import React, { useRef, useMemo, useEffect } from 'react';
import Globe from 'react-globe.gl';
import { Company, COMPANIES } from '../data/companies';

interface SupplyChainGlobeProps {
  selectedStock: Company | null;
}

export const SupplyChainGlobe: React.FC<SupplyChainGlobeProps> = ({ selectedStock }) => {
  const globeEl = useRef<any>(null);

  useEffect(() => {
    if (globeEl.current && selectedStock) {
      globeEl.current.pointOfView({ lat: selectedStock.lat, lng: selectedStock.lng, altitude: 2 }, 1000);
    }
  }, [selectedStock]);

  const arcsData = useMemo(() => {
    if (!selectedStock || !selectedStock.partners) return [];
    
    return selectedStock.partners.map(pSymbol => {
      const partner = COMPANIES.find(c => c.symbol === pSymbol);
      if (!partner) return null;
      return {
        startLat: selectedStock.lat,
        startLng: selectedStock.lng,
        endLat: partner.lat,
        endLng: partner.lng,
        color: '#22ab94'
      };
    }).filter(Boolean);
  }, [selectedStock]);

  const pointsData = useMemo(() => {
    if (!selectedStock) return [];
    const points = [selectedStock];
    if (selectedStock.partners) {
      selectedStock.partners.forEach(pSymbol => {
        const partner = COMPANIES.find(c => c.symbol === pSymbol);
        if (partner) points.push(partner);
      });
    }
    return points;
  }, [selectedStock]);

  const ringsData = useMemo(() => {
    if (!selectedStock) return [];
    return [{ lat: selectedStock.lat, lng: selectedStock.lng }];
  }, [selectedStock]);

  if (!selectedStock) return null;

  return (
    <div className="w-24 h-24 rounded-full overflow-hidden border border-zinc-800 bg-black shadow-2xl z-[1002]">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        width={96}
        height={96}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#22ab94"}
        pointRadius={0.5}
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => "#22ab94"}
        ringMaxRadius={5}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1000}
        backgroundColor="rgba(0,0,0,0)"
      />
    </div>
  );
};
