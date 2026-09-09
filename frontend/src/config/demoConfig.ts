// Central Demo City Configuration for Frontend: Jaipur, Rajasthan, India

export const DEMO_CONFIG = {
  city: 'Jaipur',
  state: 'Rajasthan',
  country: 'India',
  
  // Default Map Viewport
  defaultMapCenter: [26.9124, 75.7873] as [number, number],
  defaultZoom: 13,

  // Designated Demo Patient: Aarav Sharma (Malviya Nagar, Jaipur)
  patient: {
    name: 'Aarav Sharma',
    address: 'B-12, Malviya Nagar, Near Gaurav Tower, Jaipur, Rajasthan',
    lat: 26.8530,
    lng: 75.8050,
    landmark: 'Near Gaurav Tower, Malviya Nagar',
  },

  // Designated Demo Driver: Raj Kumar in AMB-104 (ALS)
  driver: {
    name: 'Raj Kumar',
    email: 'raj.driver@demo.com',
    ambulanceReg: 'AMB-104',
    ambulanceType: 'ALS' as const,
    lat: 26.8650,
    lng: 75.8120,
    address: 'JLN Marg, Near World Trade Park, Jaipur',
    phone: '+91 98290 12345',
  },

  // Common Jaipur Landmarks for search & autocomplete
  quickLocations: [
    { name: 'Malviya Nagar (Aarav\'s Home)', address: 'B-12, Malviya Nagar, Near Gaurav Tower, Jaipur', lat: 26.8530, lng: 75.8050 },
    { name: 'C-Scheme (Central Jaipur)', address: 'Ashok Nagar / C-Scheme, Jaipur', lat: 26.9124, lng: 75.7873 },
    { name: 'Vaishali Nagar', address: 'Amrapali Marg, Vaishali Nagar, Jaipur', lat: 26.9050, lng: 75.7430 },
    { name: 'Mansarovar', address: 'Madhyam Marg, Mansarovar, Jaipur', lat: 26.8600, lng: 75.7600 },
    { name: 'Raja Park', address: 'Dhruv Marg, Raja Park, Jaipur', lat: 26.8980, lng: 75.8280 },
    { name: 'JLN Marg (World Trade Park)', address: 'JLN Marg, D-Block, Malviya Nagar, Jaipur', lat: 26.8650, lng: 75.8120 },
  ]
};
