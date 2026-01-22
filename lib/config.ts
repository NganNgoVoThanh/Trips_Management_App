// lib/config.ts
export const config = {
  // Company domain
  companyDomain: '@intersnack.com.vn',
  
  // Admin emails list - Update with real SSO user emails
  adminEmails: ['ngan.ngo@intersnack.com.vn'
    // Add your admin emails here, e.g.: 'yourname@intersnack.com.vn'
  ] as string[],
  
  // Company departments
  departments: [
    'Management',
    'Operations',
    'Human Resources',
    'Finance',
    'Information Technology',
    'Sales',
    'Marketing',
    'Production',
    'R&D',
    'Quality Control',
    'Supply Chain',
    'Procurement',
    'Customer Service',
    'Logistics',
    'Warehouse',
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

/**
 * Get passenger capacity for a vehicle type (excluding driver seat)
 * - Car 4-seater: 1 driver + 3 passengers = 3 passenger capacity
 * - Car 7-seater: 1 driver + 6 passengers = 6 passenger capacity
 * - Van 16-seater: 1 driver + 15 passengers = 15 passenger capacity
 */
export function getVehiclePassengerCapacity(vehicleType: string): number {
  // Handle both old format (car-4) and new format (car, van, bus)
  if (vehicleType === 'car-4' || vehicleType === 'car') {
    return 3; // 4 seats - 1 driver = 3 passengers
  }
  if (vehicleType === 'car-7' || vehicleType === 'van') {
    return 6; // 7 seats - 1 driver = 6 passengers
  }
  if (vehicleType === 'van-16' || vehicleType === 'bus') {
    return 15; // 16 seats - 1 driver = 15 passengers
  }
  if (vehicleType === 'truck') {
    return 2; // Typical truck: 1 driver + 2 passengers
  }
  return 3; // Default to car capacity
}

/**
 * Calculate vehicle utilization rate
 * @param totalPassengers - Total number of passengers across all trips
 * @param vehicleStats - Object with vehicle types as keys and trip counts as values
 * @returns Utilization percentage (0-100)
 */
export function calculateVehicleUtilization(
  totalPassengers: number,
  vehicleStats: Record<string, number>
): number {
  const totalCapacity = Object.entries(vehicleStats).reduce((sum, [type, count]) => {
    const passengerCapacity = getVehiclePassengerCapacity(type);
    return sum + (passengerCapacity * count);
  }, 0);

  return totalCapacity > 0 ? Math.min((totalPassengers / totalCapacity) * 100, 100) : 0;
}