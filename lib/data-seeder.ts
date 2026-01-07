// lib/data-seeder.ts
import { fabricService, Trip } from './mysql-service';
import { config } from './config';

export class DataSeeder {
  // Initialize database tables
  async initializeTables() {
    console.log('Initializing database tables...');
    
    try {
      await fabricService.initializeTables();
      console.log('✅ Tables initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize tables:', error);
      throw error;
    }
  }

  // Create demo data for testing
  async createDemoData() {
    console.log('Creating demo data...');
    
    const demoTrips: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        userId: 'user-demo-1',
        userName: 'Nguyen Van An',
        userEmail: 'nguyen.van.an@intersnack.com.vn',
        departureLocation: 'HCM Office',
        destination: 'Phan Thiet Factory',
        departureDate: this.getDateString(5),
        departureTime: '08:00',
        returnDate: this.getDateString(7),
        returnTime: '17:00',
        status: 'pending_approval',
        vehicleType: 'car-4',
        estimatedCost: 1200000,
        notified: false
      },
      {
        userId: 'user-demo-2',
        userName: 'Tran Thi Binh',
        userEmail: 'tran.thi.binh@intersnack.com.vn',
        departureLocation: 'HCM Office',
        destination: 'Phan Thiet Factory',
        departureDate: this.getDateString(5),
        departureTime: '08:30',
        returnDate: this.getDateString(7),
        returnTime: '17:00',
        status: 'pending_approval',
        vehicleType: 'car-4',
        estimatedCost: 1200000,
        notified: false
      },
      {
        userId: 'user-demo-3',
        userName: 'Le Van Cuong',
        userEmail: 'le.van.cuong@intersnack.com.vn',
        departureLocation: 'HCM Office',
        destination: 'Long An Factory',
        departureDate: this.getDateString(3),
        departureTime: '09:00',
        returnDate: this.getDateString(3),
        returnTime: '18:00',
        status: 'approved_solo',
        vehicleType: 'car-4',
        estimatedCost: 400000,
        notified: true
      },
      {
        userId: 'user-demo-4',
        userName: 'Pham Thi Dung',
        userEmail: 'pham.thi.dung@intersnack.com.vn',
        departureLocation: 'Long An Factory',
        destination: 'Tay Ninh Factory',
        departureDate: this.getDateString(10),
        departureTime: '07:30',
        returnDate: this.getDateString(10),
        returnTime: '17:30',
        status: 'pending_approval',
        vehicleType: 'car-7',
        estimatedCost: 600000,
        notified: false
      },
      {
        userId: 'user-demo-5',
        userName: 'Hoang Van Em',
        userEmail: 'hoang.van.em@intersnack.com.vn',
        departureLocation: 'HCM Office',
        destination: 'Tay Ninh Factory',
        departureDate: this.getDateString(8),
        departureTime: '08:00',
        returnDate: this.getDateString(9),
        returnTime: '17:00',
        status: 'pending_approval',
        vehicleType: 'car-4',
        estimatedCost: 900000,
        notified: false
      }
    ];

    const createdTrips: Trip[] = [];
    
    for (const tripData of demoTrips) {
      try {
        const trip = await fabricService.createTrip(tripData);
        createdTrips.push(trip);
        console.log(`✅ Created trip for ${trip.userName}`);
      } catch (error) {
        console.error(`❌ Failed to create trip for ${tripData.userName}:`, error);
      }
    }
    
    console.log(`Created ${createdTrips.length} demo trips`);
    return createdTrips;
  }
  
  // ✅ Backward-compat shims cho route.ts cũ
  async seedTrips(): Promise<void> {
    // Dự án của bạn đang dùng createDemoData để tạo trip demo
    await this.createDemoData();
  }

  async seedOptimizationProposals(): Promise<void> {
    // Nếu fabricService có hàm tạo nhóm/proposal thì gọi, nếu không thì no-op
    const fsAny = fabricService as any;

    if (typeof fsAny.createOptimizationGroupsFromTrips === 'function') {
      await fsAny.createOptimizationGroupsFromTrips();
    } else if (typeof fsAny.seedOptimizationProposals === 'function') {
      await fsAny.seedOptimizationProposals();
    } else {
      console.warn('[DataSeeder] seedOptimizationProposals(): no implementation found on fabricService, skipping');
    }
  }

  // Initialize demo data if needed
  async initializeDemoData() {
    try {
      // Check if data already exists
      const existingTrips = await fabricService.getTrips();
      
      if (existingTrips.length === 0) {
        console.log('No existing trips found. Creating demo data...');
        await this.createDemoData();
      } else {
        console.log(`Found ${existingTrips.length} existing trips`);
      }
    } catch (error) {
      console.error('Error initializing demo data:', error);
    }
  }

  // Clear all data (use with caution!)
  async clearAllData() {
    console.log('⚠️ Clearing all data...');
    
    try {
      await fabricService.clearAllData();
      console.log('✅ All data cleared');
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
    }
  }

  // Helper function to get date string relative to today
  private getDateString(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  // Initialize everything needed for first run
  async initializeSystem() {
    console.log('=================================');
    console.log('Trips Management System Setup');
    console.log('=================================');
    
    // Step 1: Initialize tables
    await this.initializeTables();
    
    // Step 2: Initialize demo data if needed
    await this.initializeDemoData();
    
    console.log('=================================');
    console.log('Setup complete!');
    console.log('=================================');
  }
}

export const dataSeeder = new DataSeeder();