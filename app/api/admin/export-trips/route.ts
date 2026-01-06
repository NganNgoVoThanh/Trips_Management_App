// app/api/admin/export-trips/route.ts
// Export trips to Excel file

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import mysql from 'mysql2/promise';
import * as XLSX from 'xlsx';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const connection = await getConnection();

    // Build query
    let query = `
      SELECT
        t.id,
        t.user_name,
        t.user_email,
        t.departure_location,
        t.destination,
        t.departure_date,
        t.departure_time,
        t.return_date,
        t.return_time,
        t.purpose,
        t.status,
        t.manager_approval_status,
        t.is_urgent,
        t.auto_approved,
        t.manager_approved_by,
        t.manager_approval_at,
        t.vehicle_type,
        t.estimated_cost,
        t.actual_cost,
        t.created_at,
        u.manager_name,
        u.manager_email,
        u.department,
        u.office_location
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (startDate) {
      query += ' AND t.departure_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND t.departure_date <= ?';
      params.push(endDate);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const [trips] = await connection.query<any[]>(query, params);
    await connection.end();

    if (trips.length === 0) {
      return NextResponse.json({ error: 'No trips found' }, { status: 404 });
    }

    // Transform data for Excel
    const excelData = trips.map(trip => ({
      'Trip ID': trip.id,
      'User Name': trip.user_name,
      'Email': trip.user_email,
      'Department': trip.department || 'N/A',
      'Office': trip.office_location || 'N/A',
      'From': trip.departure_location,
      'To': trip.destination,
      'Departure Date': trip.departure_date,
      'Departure Time': trip.departure_time,
      'Return Date': trip.return_date,
      'Return Time': trip.return_time,
      'Purpose': trip.purpose || '',
      'Status': trip.status,
      'Approval Status': trip.manager_approval_status || 'N/A',
      'Urgent': trip.is_urgent ? 'Yes' : 'No',
      'Auto Approved': trip.auto_approved ? 'Yes' : 'No',
      'Manager Name': trip.manager_name || 'N/A',
      'Manager Email': trip.manager_email || 'N/A',
      'Approved By': trip.manager_approved_by || 'N/A',
      'Approved At': trip.manager_approval_at ? new Date(trip.manager_approval_at).toLocaleString('vi-VN') : 'N/A',
      'Vehicle Type': trip.vehicle_type || 'N/A',
      'Estimated Cost': trip.estimated_cost || 0,
      'Actual Cost': trip.actual_cost || 0,
      'Created At': new Date(trip.created_at).toLocaleString('vi-VN'),
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Trip ID
      { wch: 20 }, // User Name
      { wch: 25 }, // Email
      { wch: 15 }, // Department
      { wch: 15 }, // Office
      { wch: 15 }, // From
      { wch: 15 }, // To
      { wch: 12 }, // Departure Date
      { wch: 12 }, // Departure Time
      { wch: 12 }, // Return Date
      { wch: 12 }, // Return Time
      { wch: 30 }, // Purpose
      { wch: 12 }, // Status
      { wch: 15 }, // Approval Status
      { wch: 8 },  // Urgent
      { wch: 12 }, // Auto Approved
      { wch: 20 }, // Manager Name
      { wch: 25 }, // Manager Email
      { wch: 25 }, // Approved By
      { wch: 20 }, // Approved At
      { wch: 12 }, // Vehicle Type
      { wch: 15 }, // Estimated Cost
      { wch: 15 }, // Actual Cost
      { wch: 20 }, // Created At
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trips');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `trips_export_${timestamp}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error exporting trips:', error);
    return NextResponse.json(
      {
        error: 'Failed to export trips',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
