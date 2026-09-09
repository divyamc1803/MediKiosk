import React, { createContext, useContext, ReactNode, useState } from 'react';

export type MapProviderType = 'leaflet' | 'mapbox' | 'google';

interface MapContextProps {
  provider: MapProviderType;
  setProvider: (p: MapProviderType) => void;
  defaultCenter: [number, number];
  defaultZoom: number;
}

const MapContext = createContext<MapContextProps>({
  provider: 'leaflet',
  setProvider: () => {},
  defaultCenter: [26.9124, 75.7873],
  defaultZoom: 13,
});

export const useMapProvider = () => useContext(MapContext);

interface MapProviderProps {
  children: ReactNode;
  initialProvider?: MapProviderType;
  center?: [number, number];
  zoom?: number;
}

export function MapProvider({
  children,
  initialProvider = 'leaflet',
  center = [26.9124, 75.7873],
  zoom = 13,
}: MapProviderProps) {
  const [provider, setProvider] = useState<MapProviderType>(initialProvider);

  return (
    <MapContext.Provider
      value={{
        provider,
        setProvider,
        defaultCenter: center,
        defaultZoom: zoom,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}
