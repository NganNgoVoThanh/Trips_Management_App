import { NextRequest, NextResponse } from 'next/server';
import * as fabricService from '@/lib/fabric-service';
import { emailService } from '@/lib/email-service';
import { authService } from '@/lib/auth-service';

// Helper nội bộ, KHÔNG export từ route handler
async function createOptimizationGroup({
  trips,
  proposedDepartureTime,
  vehicleType,
  estimatedSavings,
  status,
  createdBy,
  approvedBy,
  approvedAt
}: {
  trips: string[];
  proposedDepartureTime: string | null;
  vehicleType: string;
  estimatedSavings: number;
  status: string;
  createdBy: string;
  approvedBy: string;
  approvedAt: string;
}) {
  const group = {
    id: (globalThis.crypto && 'randomUUID' in globalThis.crypto) ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2),
    trips,
    proposedDepartureTime,
    vehicleType,
    estimatedSavings,
    status,
    createdBy,
    approvedBy,
    approvedAt,
    createdAt: new Date().toISOString()
  };

  // TODO: thay bằng DB thực tế, ví dụ: await db.optimizationGroups.insert(group)
  return group;
}

// Đổi signature cho đúng với Next.js 15 App Router
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params trong Next.js 15
    const { id } = await context.params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const {
      trips = [],
      proposedDepartureTime = null,
      vehicleType = 'unknown',
      estimatedSavings = 0,
      status = 'approved',
      createdBy = (await authService.getCurrentUser())?.id ?? 'system',
      approvedBy = (await authService.getCurrentUser())?.id ?? 'system',
      approvedAt = new Date().toISOString()
    } = body;

    // Ví dụ: tương tác dịch vụ nội bộ nếu cần
    // await fabricService.prepareSomething?.(trips);

    const optimizationGroup = await createOptimizationGroup({
      trips,
      proposedDepartureTime,
      vehicleType,
      estimatedSavings,
      status,
      createdBy,
      approvedBy,
      approvedAt
    });

    // Ví dụ: gửi thông báo duyệt
    // await emailService.notifyApproval?.({ proposalId: id, group: optimizationGroup });

    return NextResponse.json({ ok: true, proposalId: id, optimizationGroup }, { status: 200 });
  } catch (err: any) {
    console.error('approve route error:', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Internal Error' }, { status: 500 });
  }
}