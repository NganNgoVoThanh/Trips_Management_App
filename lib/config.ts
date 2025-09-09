// lib/config.ts
export const config = {
  // Company domain
  companyDomain: '@intersnack.com.vn',
  
  // Admin emails list
  adminEmails: [
    'admin@intersnack.com.vn',
    'manager@intersnack.com.vn',
    'operations@intersnack.com.vn',
    // Add more admin emails as needed
  ],
  
  // Company locations with full addresses
  locations: {
    'HCM Office': {
      id: 'HCM Office',
      name: 'Ho Chi Minh Office',
      address: '76 Le Lai Street, Ben Thanh Ward, District 1, Ho Chi Minh City, Vietnam',
      coordinates: { lat: 10.7688, lng: 106.6781 },
      type: 'office'
    },
    'Phan Thiet Factory': {
      id: 'Phan Thiet Factory',
      name: 'Phan Thiet Factory',
      address: 'Lot 1/9+11+13 & Lot 1/6 Phan Thiet Industrial Zone Phase 1, Phong Nam Commune, Phan Thiet City, Binh Thuan Province, Vietnam',
      coordinates: { lat: 10.9333, lng: 108.1000 },
      type: 'factory'
    },
    'Long An Factory': {
      id: 'Long An Factory',
      name: 'Long An Factory',
      address: 'Lot H.2 along Road No. 6 in Loi Binh Nhon Industrial Cluster, Loi Binh Nhon Commune, Tan An City, Long An Province, Vietnam',
      coordinates: { lat: 10.5356, lng: 106.4142 },
      type: 'factory'
    },
    'Tay Ninh Factory': {
      id: 'Tay Ninh Factory',
      name: 'Tay Ninh Factory',
      address: 'Kinh Te Hamlet, Binh Minh Commune, Tay Ninh City, Tay Ninh Province, Vietnam',
      coordinates: { lat: 11.3100, lng: 106.0983 },
      type: 'factory'
    }
  },
  
  // Vehicle types
  vehicles: {
    'car-4': {
      id: 'car-4',
      name: '4-Seater Car',
      capacity: 4,
      costPerKm: 8000 // VND
    },
    'car-7': {
      id: 'car-7',
      name: '7-Seater Car',
      capacity: 7,
      costPerKm: 10000 // VND
    },
    'van-16': {
      id: 'van-16',
      name: '16-Seater Van',
      capacity: 16,
      costPerKm: 15000 // VND
    }
  },
  
  // API configurations
  api: {
    openai: {
      endpoint: process.env.NEXT_PUBLIC_OPENAI_API_URL || 'https://api.openai.com/v1',
      model: 'gpt-4-turbo-preview'
    },
    claude: {
      endpoint: process.env.NEXT_PUBLIC_CLAUDE_API_URL || 'https://api.anthropic.com/v1',
      model: 'claude-3-opus-20240229'
    },
    fabric: {
      endpoint: process.env.NEXT_PUBLIC_FABRIC_API_URL || '',
      workspace: process.env.NEXT_PUBLIC_FABRIC_WORKSPACE || '',
      lakehouse: process.env.NEXT_PUBLIC_FABRIC_LAKEHOUSE || ''
    }
  },
  
  // Cost optimization settings
  optimization: {
    maxWaitTime: 30, // minutes
    maxDetour: 10, // km
    minSavingsPercentage: 15 // %
  }
};

// Helper functions

export function getLocationName(locationId: string): string {
  const location = config.locations[locationId as keyof typeof config.locations];
  return location ? location.name : locationId;
}

export function calculateDistance(from: string, to: string): number {
  const fromLoc = config.locations[from as keyof typeof config.locations];
  const toLoc = config.locations[to as keyof typeof config.locations];
  
  if (!fromLoc || !toLoc) return 0;
  
  // Haversine formula for distance calculation
  const R = 6371; // Earth's radius in km
  const dLat = (toLoc.coordinates.lat - fromLoc.coordinates.lat) * Math.PI / 180;
  const dLon = (toLoc.coordinates.lng - fromLoc.coordinates.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(fromLoc.coordinates.lat * Math.PI / 180) * 
    Math.cos(toLoc.coordinates.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance);
}

export function calculateCost(distance: number, vehicleType: string): number {
  const vehicle = config.vehicles[vehicleType as keyof typeof config.vehicles];
  if (!vehicle) return 0;
  return distance * vehicle.costPerKm;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}
