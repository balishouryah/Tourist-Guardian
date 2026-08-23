/**
 * Shared constants for Tourist Guardian.
 */

// Fictional tourist for demo
export const DEMO_TOURIST = {
  id: 'TG-IND-88291',
  name: 'Aarav Sharma',
  phone: '+91 98765 43210',
  nationality: 'India',
  language: 'English',
  emergencyContact: {
    name: 'Priya Sharma',
    phone: '+91 98765 43211',
    relation: 'Spouse',
  },
};

// Meghalaya itinerary
export const DEMO_ITINERARY = {
  name: 'Meghalaya Highlands Trail',
  date: 'August 2026',
  terrain: 'Moderate Terrain',
  duration: '8h 15m',
  totalDistance: '48.5 km',
  stops: [
    {
      name: 'Shillong City Center',
      type: 'Start Point',
      time: '09:00 AM',
      status: 'Confirmed',
      icon: 'location_city',
    },
    {
      name: 'Elephant Falls',
      type: 'Estimated 1h 30m',
      time: '09:45 AM',
      status: 'Planned',
      icon: 'water',
    },
    {
      name: 'Mawphlang Sacred Forest',
      type: 'Estimated 2h 00m',
      time: '12:00 PM',
      status: 'Planned',
      icon: 'forest',
    },
    {
      name: 'Laitlum Canyon',
      type: 'End Point',
      time: '03:30 PM',
      status: 'Planned',
      icon: 'terrain',
    },
  ],
};

// Route options for the Live Safety Map
export const ROUTE_OPTIONS = [
  { name: 'Fastest', time: '31 min', safetyScore: 61, icon: 'directions_walk' },
  { name: 'Safest',  time: '39 min', safetyScore: 93, icon: 'shield',          selected: true },
  { name: 'Scenic',  time: '44 min', safetyScore: 84, icon: 'landscape' },
];

// Mock incidents for authority
export const DEMO_INCIDENTS = [
  {
    id: 'TG-1042',
    touristId: 'TG-IND-88291',
    touristName: 'Aarav Sharma',
    severity: 'CRITICAL',
    description: 'Possible distress detected: Route deviation + prolonged inactivity.',
    location: 'Mawphlang Sector B',
    time: '2 mins ago',
    signals: ['Route deviation', 'Prolonged inactivity'],
    score: 24,
  },
  {
    id: 'TG-0814',
    touristId: 'TG-IND-44012',
    touristName: 'Meera Patel',
    severity: 'HIGH',
    description: 'Route deviation + prolonged inactivity.',
    location: 'Elephant Falls Trail',
    time: '18 mins ago',
    signals: ['Route deviation', 'Prolonged inactivity'],
    score: 42,
  },
  {
    id: 'TG-2203',
    touristId: 'TG-IND-67233',
    touristName: 'Rohan Kapoor',
    severity: 'MEDIUM',
    description: 'Entered caution zone.',
    location: 'Laitlum Canyon Approach',
    time: '34 mins ago',
    signals: ['Caution zone entry'],
    score: 64,
  },
];

// Incident timeline for authority incident detail
export const DEMO_TIMELINE = [
  { time: '15:06', event: 'Authority notified',           severity: 'critical' },
  { time: '15:05', event: 'SOS activated',                severity: 'critical' },
  { time: '15:02', event: 'AI risk escalated',            severity: 'high' },
  { time: '14:48', event: 'Prolonged inactivity detected',severity: 'medium' },
  { time: '14:37', event: 'Entered high-risk zone',       severity: 'medium' },
  { time: '14:21', event: 'Route deviation detected',     severity: 'low' },
];
