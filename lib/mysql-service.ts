// lib/mysql-service.ts
import { config } from './config';
import { TripStatus } from './trip-status-config';

// Lazy import mysql2 only on server side
let pool: any = null;

// Check if we're on server side
const isServer = typeof window === 'undefined';

// Initialize pool only on server side
const getPool = async () => {
  if (pool) return pool;

  if (!isServer) {
    throw new Error('MySQL cannot be used in browser');
  }

  // ✅ SECURITY: Require database credentials from environment variables
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error(
      'Database credentials not configured. Please set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in environment variables. ' +
      'See .env.example for configuration template.'
    );
  }

  const mysql = await import('mysql2/promise');
  pool = mysql.default.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20, // Tăng từ 10 lên 20 để xử lý nhiều concurrent connections
    queueLimit: 10, // Thay đổi từ 0 để queue requests thay vì reject ngay
    maxIdle: 10, // Số connections tối đa được giữ idle
    idleTimeout: 60000, // 60 giây trước khi đóng idle connection
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // 10 giây delay trước khi bắt đầu keep-alive
    connectTimeout: 20000 // 20 giây timeout cho connection
  });

  console.log('✓ MySQL Connection Pool initialized');
  console.log(`✓ Database: ${process.env.DB_NAME}`);

  return pool;
};

export interface Trip {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  departureLocation: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  status: TripStatus;
  vehicleType?: string;
  estimatedCost?: number;
  actualCost?: number;
  optimizedGroupId?: string;
  originalDepartureTime?: string;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
  dataType?: 'raw' | 'temp' | 'final';
  parentTripId?: string;
  // Email approval workflow fields
  manager_approval_status?: 'pending' | 'approved' | 'rejected' | 'expired';
  manager_approval_token?: string;
  manager_approval_at?: string;
  manager_approved_by?: string;
  cc_emails?: string;
  is_urgent?: boolean;
  auto_approved?: boolean;
  purpose?: string;
  // Admin creation tracking
  created_by_admin?: boolean;
  admin_email?: string;
}

export interface OptimizationGroup {
  id: string;
  trips: string[];
  proposedDepartureTime: string;
  vehicleType: string;
  estimatedSavings: number;
  status: 'proposed' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  tempData?: Trip[];
}

class MySQLService {
  private hasCheckedConnection: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    if (isServer) {
      this.checkConnection();
    }
  }

  private async checkConnection(): Promise<void> {
    if (!isServer || this.hasCheckedConnection) return;
    
    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      await connection.ping();
      connection.release();
      console.log('✓ MySQL connection verified');
      this.isConnected = true;
    } catch (err: any) {
      console.warn('X MySQL connection check failed:', err.message);
      this.isConnected = false;
    } finally {
      this.hasCheckedConnection = true;
    }
  }
  // ✓ THÃŠM helper function nÃ y
  private toMySQLDateTime(isoString: string): string {
    if (!isoString) return new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    try {
      const date = new Date(isoString);
      // Convert to MySQL format: YYYY-MM-DD HH:MM:SS
      return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch (error) {
      console.error('Invalid datetime:', isoString);
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
  }

  // Helper: Convert camelCase to snake_case for DB
  private toSnakeCase(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => this.toSnakeCase(item));
    
    const converted: any = {};
    Object.keys(data).forEach(key => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      // ✓ THÃŠM: Convert datetime fields
      if ((snakeKey === 'created_at' || snakeKey === 'updated_at' || 
           snakeKey === 'approved_at' || snakeKey === 'processed_at') && 
          typeof data[key] === 'string') {
        converted[snakeKey] = this.toMySQLDateTime(data[key]);
      } else {
        converted[snakeKey] = data[key];
      }
    });
    return converted;
  }

  // ✓ Sá»¬A createTrip - Ä‘áº£m báº£o datetime Ä‘Ãºng format
  async createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trip> {
    const now = new Date();
    const mysqlNow = now.toISOString().slice(0, 19).replace('T', ' ');
    
    const newTrip: Trip = {
      ...trip,
      id: this.generateId(),
      createdAt: now.toISOString(), // Keep ISO for return value
      updatedAt: now.toISOString(),
      dataType: trip.dataType || 'raw',
      status: trip.status || 'pending',
      notified: trip.notified ?? false
    };

    if (!this.ensureServerSide('createTrip')) return newTrip;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      // Convert to snake_case and ensure MySQL datetime format
      const snakeData = this.toSnakeCase(newTrip);
      
      // ✓ QUAN TRá»ŒNG: Override datetime fields vá»›i MySQL format
      snakeData.created_at = mysqlNow;
      snakeData.updated_at = mysqlNow;
      
      console.log('ðŸ“ Creating trip with data:', {
        id: snakeData.id,
        created_at: snakeData.created_at,
        updated_at: snakeData.updated_at
      });
      
      await connection.query(
        `INSERT INTO trips SET ?`,
        [snakeData]
      );
      
      connection.release();
      console.log('✓ Trip created in MySQL:', newTrip.id);
      return newTrip;
    } catch (err: any) {
      console.error('âŒ MySQL error creating trip:', err.message);
      throw new Error(`Failed to create trip: ${err.message}`);
    }
  }

  // Helper: Convert snake_case DB results to camelCase
  private toCamelCase(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => this.toCamelCase(item));
    
    const converted: any = {};
    Object.keys(data).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      converted[camelKey] = data[key];
    });
    return converted;
  }

  // Server-side check wrapper
  private ensureServerSide(methodName: string) {
    if (!isServer) {
      console.warn(`âŒ ${methodName} called on client side - skipping`);
      return false;
    }
    return true;
  }

  // Initialize tables
  async initializeTables(): Promise<void> {
    if (!this.ensureServerSide('initializeTables')) return;
    
    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      // Create trips table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS trips (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          departure_location VARCHAR(255) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          departure_date DATE NOT NULL,
          departure_time TIME NOT NULL,
          return_date DATE NOT NULL,
          return_time TIME NOT NULL,
          status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft', 'approved', 'rejected') DEFAULT 'pending',
          vehicle_type VARCHAR(50),
          estimated_cost DECIMAL(10, 2),
          actual_cost DECIMAL(10, 2),
          optimized_group_id VARCHAR(255),
          original_departure_time TIME,
          notified BOOLEAN DEFAULT FALSE,
          data_type ENUM('raw', 'temp', 'final') DEFAULT 'raw',
          parent_trip_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_user_email (user_email),
          INDEX idx_status (status),
          INDEX idx_departure_date (departure_date),
          INDEX idx_optimized_group_id (optimized_group_id),
          INDEX idx_data_type (data_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create temp_trips table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS temp_trips (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          departure_location VARCHAR(255) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          departure_date DATE NOT NULL,
          departure_time TIME NOT NULL,
          return_date DATE NOT NULL,
          return_time TIME NOT NULL,
          status ENUM('pending', 'confirmed', 'optimized', 'cancelled', 'draft') DEFAULT 'draft',
          vehicle_type VARCHAR(50),
          estimated_cost DECIMAL(10, 2),
          actual_cost DECIMAL(10, 2),
          optimized_group_id VARCHAR(255),
          original_departure_time TIME,
          notified BOOLEAN DEFAULT FALSE,
          data_type ENUM('raw', 'temp', 'final') DEFAULT 'temp',
          parent_trip_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_optimized_group_id (optimized_group_id),
          INDEX idx_parent_trip_id (parent_trip_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create optimization_groups table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS optimization_groups (
          id VARCHAR(255) PRIMARY KEY,
          trips JSON NOT NULL,
          proposed_departure_time TIME NOT NULL,
          vehicle_type VARCHAR(50) NOT NULL,
          estimated_savings DECIMAL(10, 2) NOT NULL,
          status ENUM('proposed', 'approved', 'rejected') DEFAULT 'proposed',
          created_by VARCHAR(255) NOT NULL,
          approved_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          approved_at TIMESTAMP NULL,
          INDEX idx_status (status),
          INDEX idx_created_by (created_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create join_requests table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS join_requests (
          id VARCHAR(255) PRIMARY KEY,
          trip_id VARCHAR(255) NOT NULL,
          trip_details JSON NOT NULL,
          requester_id VARCHAR(255) NOT NULL,
          requester_name VARCHAR(255) NOT NULL,
          requester_email VARCHAR(255) NOT NULL,
          requester_department VARCHAR(255),
          reason TEXT,
          status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
          admin_notes TEXT,
          processed_by VARCHAR(255),
          processed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_trip_id (trip_id),
          INDEX idx_requester_id (requester_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      connection.release();
      console.log('✓ MySQL tables initialized successfully');
    } catch (error: any) {
      console.error('âŒ Failed to initialize tables:', error.message);
      throw error;
    }
  }



  // Get all trips
  async getTrips(filters?: {
    userId?: string;
    userEmail?: string;
    status?: string;
    includeTemp?: boolean;
    optimizedGroupId?: string;
    dataType?: string;
    departureLocation?: string;
    destination?: string;
    departureDate?: string;
  }): Promise<Trip[]> {
    if (!this.ensureServerSide('getTrips')) return [];

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      let query = 'SELECT * FROM trips';
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters?.userId) {
        conditions.push('user_id = ?');
        params.push(filters.userId);
      }
      if (filters?.userEmail) {
        conditions.push('user_email = ?');
        params.push(filters.userEmail);
      }
      if (filters?.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      if (filters?.optimizedGroupId) {
        conditions.push('optimized_group_id = ?');
        params.push(filters.optimizedGroupId);
      }
      if (filters?.dataType) {
        conditions.push('data_type = ?');
        params.push(filters.dataType);
      }
      if (filters?.departureLocation) {
        conditions.push('departure_location = ?');
        params.push(filters.departureLocation);
      }
      if (filters?.destination) {
        conditions.push('destination = ?');
        params.push(filters.destination);
      }
      if (filters?.departureDate) {
        conditions.push('departure_date = ?');
        params.push(filters.departureDate);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [rows] = await connection.query(query, params);
      let allTrips = Array.isArray(rows) ? rows.map(r => this.toCamelCase(r) as Trip) : [];

      // Include temp trips if requested
      if (filters?.includeTemp) {
        try {
          const [tempRows] = await connection.query(
            'SELECT * FROM temp_trips ORDER BY created_at DESC'
          );
          if (Array.isArray(tempRows)) {
            allTrips = [...allTrips, ...tempRows.map(r => this.toCamelCase(r) as Trip)];
          }
        } catch (tempErr) {
          console.debug('Temp trips table not available');
        }
      }

      connection.release();
      return allTrips;
    } catch (err: any) {
      console.warn('âš ï¸ Error in getTrips:', err.message);
      return [];
    }
  }

  // Create temporary optimized trips
  async createTempOptimizedTrips(originalTripIds: string[], optimizationData: {
    proposedDepartureTime: string;
    vehicleType: string;
    groupId: string;
    estimatedSavings?: number;
  }): Promise<Trip[]> {
    if (!this.ensureServerSide('createTempOptimizedTrips')) return [];

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      const [rows] = await connection.query(
        'SELECT * FROM trips WHERE id IN (?)',
        [originalTripIds]
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        connection.release();
        return [];
      }

      const tempTrips: Trip[] = [];
      
      for (const originalTrip of rows) {
        const camelTrip = this.toCamelCase(originalTrip);
        const tempTrip = {
          ...camelTrip,
          id: `temp-${this.generateId()}`,
          parentTripId: camelTrip.id,
          dataType: 'temp',
          status: 'draft',
          departureTime: optimizationData.proposedDepartureTime,
          vehicleType: optimizationData.vehicleType,
          actualCost: camelTrip.estimatedCost ? camelTrip.estimatedCost * 0.75 : null,
          optimizedGroupId: optimizationData.groupId,
          originalDepartureTime: camelTrip.departureTime,
          updatedAt: new Date().toISOString()
        };
        
        const snakeData = this.toSnakeCase(tempTrip);
        await connection.query('INSERT INTO temp_trips SET ?', [snakeData]);
        tempTrips.push(tempTrip);
      }

      connection.release();
      console.log(`✓ Created ${tempTrips.length} TEMP trips in MySQL`);
      return tempTrips;
    } catch (err: any) {
      console.warn('âš ï¸ Error creating temp trips:', err.message);
      return [];
    }
  }

  // Approve optimization
async approveOptimization(groupId: string): Promise<void> {
  if (!this.ensureServerSide('approveOptimization')) return;

  try {
    const poolInstance = await getPool();
    const connection = await poolInstance.getConnection();
    
    // ✅ QUAN TRỌNG: Convert sang MySQL datetime format
    const mysqlNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    console.log(`✅ MySQL datetime format: ${mysqlNow}`); // Debug log
    
    const [tempRows] = await connection.query(
      'SELECT * FROM temp_trips WHERE optimized_group_id = ?',
      [groupId]
    );

    if (Array.isArray(tempRows)) {
      for (const tempTrip of tempRows) {
        const camelTrip = this.toCamelCase(tempTrip);

        if (camelTrip.parentTripId) {
          // ✅ CRITICAL FIX: Get original departure_time before updating
          const [originalRows] = await connection.query(
            'SELECT departure_time FROM trips WHERE id = ?',
            [camelTrip.parentTripId]
          );

          const originalTime = Array.isArray(originalRows) && originalRows.length > 0
            ? (originalRows[0] as any).departure_time
            : camelTrip.departureTime;

          // Update parent trip with optimized data from TEMP
          await connection.query(
            `UPDATE trips SET
              data_type = ?,
              status = ?,
              departure_time = ?,
              vehicle_type = ?,
              actual_cost = ?,
              optimized_group_id = ?,
              original_departure_time = ?,
              updated_at = ?
            WHERE id = ?`,
            [
              'final',
              'optimized',
              camelTrip.departureTime, // ← Use optimized time from TEMP
              camelTrip.vehicleType, // ← Use optimized vehicle from TEMP
              camelTrip.actualCost,
              camelTrip.optimizedGroupId,
              originalTime, // ← Save original time
              mysqlNow,
              camelTrip.parentTripId
            ]
          );

          console.log(`✅ Trip ${camelTrip.parentTripId} optimized: ${originalTime} → ${camelTrip.departureTime}`);
        }
      }
    }

    await connection.query(
      'DELETE FROM temp_trips WHERE optimized_group_id = ?',
      [groupId]
    );

    await connection.query(
      'UPDATE optimization_groups SET status = ?, approved_at = ? WHERE id = ?',
      ['approved', mysqlNow, groupId] // ✅ Dùng MySQL format
    );

    connection.release();
    console.log(`✅ Optimization ${groupId} approved`);
  } catch (err: any) {
    console.error('❌ Error approving optimization:', err.message);
    throw new Error(`Failed to approve optimization: ${err.message}`); // ✅ Throw error
  }
}

  // Reject optimization
async rejectOptimization(groupId: string): Promise<void> {
  if (!this.ensureServerSide('rejectOptimization')) return;

  try {
    const poolInstance = await getPool();
    const connection = await poolInstance.getConnection();
    
    // ✅ QUAN TRỌNG: Convert sang MySQL datetime format
    const mysqlNow = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    console.log(`✅ MySQL datetime format: ${mysqlNow}`); // Debug log
    
    await connection.query(
      'DELETE FROM temp_trips WHERE optimized_group_id = ?',
      [groupId]
    );

    await connection.query(
      'UPDATE optimization_groups SET status = ? WHERE id = ?',
      ['rejected', groupId]
    );

    const [groupRows] = await connection.query(
      'SELECT trips FROM optimization_groups WHERE id = ?',
      [groupId]
    );

    if (Array.isArray(groupRows) && groupRows.length > 0) {
      const group = groupRows[0] as any;
      const tripIds = JSON.parse(group.trips);
      
      if (Array.isArray(tripIds) && tripIds.length > 0) {
        await connection.query(
          'UPDATE trips SET status = ?, updated_at = ? WHERE id IN (?)',
          ['pending', mysqlNow, tripIds] // ✅ Dùng MySQL format
        );
      }
    }

    connection.release();
    console.log(`✅ Optimization ${groupId} rejected`);
  } catch (err: any) {
    console.error('❌ Error rejecting optimization:', err.message);
    throw new Error(`Failed to reject optimization: ${err.message}`); // ✅ Throw error
  }
}

  // Get temp trips by group ID
  async getTempTripsByGroupId(groupId: string): Promise<Trip[]> {
    if (!this.ensureServerSide('getTempTripsByGroupId')) return [];

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const [rows] = await connection.query(
        'SELECT * FROM temp_trips WHERE optimized_group_id = ?',
        [groupId]
      );
      connection.release();
      
      return Array.isArray(rows) ? rows.map(r => this.toCamelCase(r) as Trip) : [];
    } catch (err) {
      console.warn('âš ï¸ Error fetching temp trips:', err);
      return [];
    }
  }

  // Get trip by ID
  async getTripById(id: string): Promise<Trip | null> {
    if (!this.ensureServerSide('getTripById')) return null;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      const [rows] = await connection.query(
        'SELECT * FROM trips WHERE id = ?',
        [id]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        connection.release();
        return this.toCamelCase(rows[0]) as Trip;
      }

      const [tempRows] = await connection.query(
        'SELECT * FROM temp_trips WHERE id = ?',
        [id]
      );

      connection.release();
      
      if (Array.isArray(tempRows) && tempRows.length > 0) {
        return this.toCamelCase(tempRows[0]) as Trip;
      }

      return null;
    } catch (err) {
      console.warn('âš ï¸ Error fetching trip by ID:', err);
      return null;
    }
  }

  // Update trip
  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip> {
    const updatedTrip: Trip = {
      id,
      userId: updates.userId || '',
      userName: updates.userName || '',
      userEmail: updates.userEmail || '',
      departureLocation: updates.departureLocation || '',
      destination: updates.destination || '',
      departureDate: updates.departureDate || '',
      departureTime: updates.departureTime || '',
      returnDate: updates.returnDate || '',
      returnTime: updates.returnTime || '',
      status: updates.status || 'pending',
      notified: updates.notified ?? false,
      createdAt: updates.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates
    };

    if (!this.ensureServerSide('updateTrip')) return updatedTrip;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const snakeData = this.toSnakeCase({
        ...updates,
        updated_at: this.toMySQLDateTime(new Date().toISOString())
      });
      
      await connection.query(
        'UPDATE trips SET ? WHERE id = ?',
        [snakeData, id]
      );
      
      connection.release();
      console.log('✓ Trip updated:', id);
      return updatedTrip;
    } catch (err: any) {
      console.warn('âš ï¸ Error updating trip:', err.message);
      return updatedTrip;
    }
  }

  // Delete trip
  async deleteTrip(id: string): Promise<void> {
    if (!this.ensureServerSide('deleteTrip')) return;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      await connection.query('DELETE FROM trips WHERE id = ?', [id]);
      connection.release();
      console.log('✓ Trip deleted:', id);
    } catch (err: any) {
      console.warn('âš ï¸ Error deleting trip:', err.message);
    }
  }

  // Create optimization group
  async createOptimizationGroup(group: Omit<OptimizationGroup, 'id' | 'createdAt'>): Promise<OptimizationGroup> {
    const newGroup: OptimizationGroup = {
      ...group,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    if (!this.ensureServerSide('createOptimizationGroup')) return newGroup;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      await connection.query(
        `INSERT INTO optimization_groups 
        (id, trips, proposed_departure_time, vehicle_type, estimated_savings, status, created_by, approved_by, approved_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newGroup.id,
          JSON.stringify(group.trips),
          group.proposedDepartureTime,
          group.vehicleType,
          group.estimatedSavings,
          group.status,
          group.createdBy,
          group.approvedBy || null,
          group.approvedAt || null
        ]
      );
      
      connection.release();
      console.log('✓ Optimization group created:', newGroup.id);
      return newGroup;
    } catch (err: any) {
      console.warn('âš ï¸ Error creating optimization group:', err.message);
      return newGroup;
    }
  }

  // Get optimization groups
  async getOptimizationGroups(status?: string): Promise<OptimizationGroup[]> {
    if (!this.ensureServerSide('getOptimizationGroups')) return [];

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      let query = 'SELECT * FROM optimization_groups';
      const params: any[] = [];
      
      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [rows] = await connection.query(query, params);
      connection.release();
      
      if (Array.isArray(rows)) {
        return rows.map(r => {
          const camel = this.toCamelCase(r);
          return {
            ...camel,
            trips: JSON.parse(camel.trips)
          } as OptimizationGroup;
        });
      }
      
      return [];
    } catch (err) {
      console.warn('âš ï¸ Error fetching optimization groups:', err);
      return [];
    }
  }

  // Get optimization group by ID
  async getOptimizationGroupById(id: string): Promise<OptimizationGroup | null> {
    if (!this.ensureServerSide('getOptimizationGroupById')) return null;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const [rows] = await connection.query(
        'SELECT * FROM optimization_groups WHERE id = ?',
        [id]
      );
      connection.release();

      if (Array.isArray(rows) && rows.length > 0) {
        const camel = this.toCamelCase(rows[0]);
        return {
          ...camel,
          trips: JSON.parse(camel.trips)
        } as OptimizationGroup;
      }

      return null;
    } catch (err) {
      console.warn('âš ï¸ Error fetching optimization group:', err);
      return null;
    }
  }

  // Update optimization group
  async updateOptimizationGroup(id: string, updates: Partial<OptimizationGroup>): Promise<OptimizationGroup> {
    const updatedGroup: OptimizationGroup = {
      id,
      trips: updates.trips || [],
      proposedDepartureTime: updates.proposedDepartureTime || '',
      vehicleType: updates.vehicleType || '',
      estimatedSavings: updates.estimatedSavings || 0,
      status: updates.status || 'proposed',
      createdBy: updates.createdBy || '',
      createdAt: updates.createdAt || new Date().toISOString(),
      ...updates
    };

    if (!this.ensureServerSide('updateOptimizationGroup')) return updatedGroup;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const updateFields: string[] = [];
      const params: any[] = [];
      
      if (updates.trips) {
        updateFields.push('trips = ?');
        params.push(JSON.stringify(updates.trips));
      }
      if (updates.status) {
        updateFields.push('status = ?');
        params.push(updates.status);
      }
      if (updates.approvedBy) {
        updateFields.push('approved_by = ?');
        params.push(updates.approvedBy);
      }
      if (updates.approvedAt) {
        updateFields.push('approved_at = ?');
        params.push(updates.approvedAt);
      }
      
      if (updateFields.length > 0) {
        params.push(id);
        await connection.query(
          `UPDATE optimization_groups SET ${updateFields.join(', ')} WHERE id = ?`,
          params
        );
      }
      
      connection.release();
      console.log('✓ Optimization group updated:', id);
      return updatedGroup;
    } catch (err: any) {
      console.warn('âš ï¸ Error updating optimization group:', err.message);
      return updatedGroup;
    }
  }

  // Delete optimization group
  async deleteOptimizationGroup(proposalId: string): Promise<void> {
    if (!this.ensureServerSide('deleteOptimizationGroup')) return;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      await connection.query(
        'DELETE FROM optimization_groups WHERE id = ?',
        [proposalId]
      );
      connection.release();
      console.log('✓ Optimization group deleted:', proposalId);
    } catch (err) {
      console.warn('âš ï¸ Error deleting optimization group:', err);
    }
  }

  // Delete temp data
  async deleteTempData(proposalId: string): Promise<void> {
    if (!this.ensureServerSide('deleteTempData')) return;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      await connection.query(
        'DELETE FROM temp_trips WHERE optimized_group_id = ?',
        [proposalId]
      );
      connection.release();
      console.log('✓ Temp data deleted:', proposalId);
    } catch (err) {
      console.warn('âš ï¸ Error deleting temp data:', err);
    }
  }

  // Get data statistics
  async getDataStats(): Promise<{
    rawCount: number;
    tempCount: number;
    finalCount: number;
    totalCount: number;
  }> {
    if (!this.ensureServerSide('getDataStats')) {
      return {
        rawCount: 0,
        tempCount: 0,
        finalCount: 0,
        totalCount: 0
      };
    }

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      const [tripRows] = await connection.query(
        'SELECT data_type, status FROM trips'
      );
      
      const [tempRows] = await connection.query(
        'SELECT COUNT(*) as count FROM temp_trips'
      );

      const trips = Array.isArray(tripRows) ? tripRows : [];
      const rawCount = trips.filter((t: any) => 
        t.data_type === 'raw' || (!t.data_type && t.status === 'pending')
      ).length;
      const finalCount = trips.filter((t: any) => 
        t.data_type === 'final' || t.status === 'optimized'
      ).length;
      const tempCount = Array.isArray(tempRows) && tempRows.length > 0 
        ? (tempRows[0] as any).count 
        : 0;

      connection.release();

      return {
        rawCount,
        tempCount,
        finalCount,
        totalCount: rawCount + tempCount + finalCount
      };
    } catch (err) {
      console.warn('âš ï¸ Error getting data stats:', err);
      return {
        rawCount: 0,
        tempCount: 0,
        finalCount: 0,
        totalCount: 0
      };
    }
  }

  // Clean up old temp data
  async cleanupOldTempData(daysOld: number = 7): Promise<void> {
    if (!this.ensureServerSide('cleanupOldTempData')) return;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await connection.query(
        'DELETE FROM temp_trips WHERE created_at < ?',
        [cutoffDate.toISOString()]
      );

      connection.release();
      console.log('✓ Old temp data cleaned up');
    } catch (err) {
      console.warn('âš ï¸ Error in cleanup:', err);
    }
  }

  // Export data
  async exportData(): Promise<{ trips: Trip[]; tempTrips: Trip[]; optimizationGroups: OptimizationGroup[] }> {
    if (!this.ensureServerSide('exportData')) {
      return {
        trips: [],
        tempTrips: [],
        optimizationGroups: []
      };
    }

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      
      const [tripRows] = await connection.query('SELECT * FROM trips');
      const [tempRows] = await connection.query('SELECT * FROM temp_trips');
      const [groupRows] = await connection.query('SELECT * FROM optimization_groups');

      connection.release();

      return {
        trips: Array.isArray(tripRows) ? tripRows.map(t => this.toCamelCase(t) as Trip) : [],
        tempTrips: Array.isArray(tempRows) ? tempRows.map(t => this.toCamelCase(t) as Trip) : [],
        optimizationGroups: Array.isArray(groupRows) ? groupRows.map(g => {
          const camel = this.toCamelCase(g);
          return {
            ...camel,
            trips: JSON.parse(camel.trips)
          } as OptimizationGroup;
        }) : []
      };
    } catch (err) {
      console.warn('âš ï¸ Error exporting data:', err);
      return {
        trips: [],
        tempTrips: [],
        optimizationGroups: []
      };
    }
  }

  // Import data
  async importData(data: { trips?: Trip[]; tempTrips?: Trip[]; optimizationGroups?: OptimizationGroup[] }): Promise<void> {
    if (!this.ensureServerSide('importData')) return;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();

      if (data.trips && data.trips.length > 0) {
        for (const trip of data.trips) {
          const snakeData = this.toSnakeCase(trip);
          await connection.query('INSERT INTO trips SET ?', [snakeData]);
        }
      }

      if (data.tempTrips && data.tempTrips.length > 0) {
        for (const trip of data.tempTrips) {
          const snakeData = this.toSnakeCase(trip);
          await connection.query('INSERT INTO temp_trips SET ?', [snakeData]);
        }
      }

      if (data.optimizationGroups && data.optimizationGroups.length > 0) {
        for (const group of data.optimizationGroups) {
          await connection.query(
            `INSERT INTO optimization_groups 
            (id, trips, proposed_departure_time, vehicle_type, estimated_savings, status, created_by, approved_by, approved_at, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              group.id,
              JSON.stringify(group.trips),
              group.proposedDepartureTime,
              group.vehicleType,
              group.estimatedSavings,
              group.status,
              group.createdBy,
              group.approvedBy || null,
              group.approvedAt || null,
              group.createdAt
            ]
          );
        }
      }

      connection.release();
      console.log('✓ Data imported successfully');
    } catch (err) {
      console.warn('âš ï¸ Error importing data:', err);
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.ensureServerSide('clearAllData')) return;

    try {
      const poolInstance = await getPool();
      const connection = await poolInstance.getConnection();
      await connection.query('DELETE FROM temp_trips');
      await connection.query('DELETE FROM optimization_groups');
      await connection.query('DELETE FROM trips');
      await connection.query('DELETE FROM join_requests');
      connection.release();
      console.log('✓ All data cleared');
    } catch (err) {
      console.warn('âš ï¸ Error clearing data:', err);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if service is configured
  public isServiceConfigured(): boolean {
    return true;
  }

  // Check if connected to database
  public isDatabaseConnected(): boolean {
    return this.isConnected;
  }
}

// Helper function for calculating distance
export function calculateDistance(from: string, to: string): number {
  const fromLoc = config.locations[from as keyof typeof config.locations];
  const toLoc = config.locations[to as keyof typeof config.locations];
  
  if (!fromLoc || !toLoc) return 0;
  
  const R = 6371;
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

// Export the service instance
export const fabricService = new MySQLService();