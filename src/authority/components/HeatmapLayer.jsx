import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ points, options }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!heatLayerRef.current) {
      heatLayerRef.current = L.heatLayer(points, options).addTo(map);
    } else {
      heatLayerRef.current.setLatLngs(points);
      if (options) {
        heatLayerRef.current.setOptions(options);
      }
    }

    return () => {
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, points, options]);

  return null;
}
