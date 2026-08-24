/**
 * Mock data for the Stage 4 interactive map (Meghalaya).
 */

export const DEMO_MAP_DATA = {
  // Center map on Meghalaya roughly
  mapCenter: [25.5347, 91.8235],
  defaultZoom: 11,
  
  // Starting point (Shillong City Center)
  touristStart: [25.5788, 91.8933],
  
  // Current active location (Mawphlang Forest Trail)
  touristCurrent: [25.4500, 91.7500],
  
  // Simulated planned safe route
  plannedRoute: [
    [25.5788, 91.8933], // Shillong
    [25.5347, 91.8235], // Elephant Falls
    [25.4500, 91.7500], // Mawphlang
    [25.5297, 92.0000]  // Laitlum Canyon
  ],
  
  // The actual divergent path taken
  actualRoute: [
    [25.5788, 91.8933],
    [25.5347, 91.8235],
    [25.4800, 91.7800], // Off path
    [25.4500, 91.7500]  // Current location
  ],
  
  // Checkpoints
  checkpoints: [
    { id: 'cp1', name: 'Shillong Start', pos: [25.5788, 91.8933] },
    { id: 'cp2', name: 'Elephant Falls Checkpoint', pos: [25.5347, 91.8235] },
    { id: 'cp3', name: 'Mawphlang Zone', pos: [25.4500, 91.7500] },
    { id: 'cp4', name: 'Laitlum Finish', pos: [25.5297, 92.0000] }
  ],
  
  // Geographical Zones
  zones: [
    { id: 'safe1', type: 'safe', center: [25.5788, 91.8933], radius: 2500, label: 'Shillong City Safe Zone' },
    { id: 'risk1', type: 'high-risk', center: [25.4500, 91.7500], radius: 1800, label: 'Mawphlang Caution Area' }
  ],
  
  // Help Points
  helpPoints: [
    { id: 'hp1', name: 'Police Outpost', pos: [25.5400, 91.8300] },
    { id: 'hp2', name: 'Medical Center', pos: [25.5700, 91.8800] }
  ]
};
