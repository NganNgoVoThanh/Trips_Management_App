// app/api/test-fabric/route.ts
import { NextResponse } from 'next/server';

type Problem = {
  success: false;
  message: string;
  hint?: string;
};

type Ok = {
  success: true;
  configuration: {
    workspace: string;
    lakehouse: string;
    tokenProvided: boolean;
    tokenLength: number;
    tokenPreview: string;
  };
  probe?: {
    url: string;
    status: number;
  };
};

export async function GET() {
  // ENV đọc từ Next
  const workspace = process.env.NEXT_PUBLIC_FABRIC_WORKSPACE || '27bbe521-04c2-4251-a56a-3c86f348eaed';
  const lakehouse = process.env.NEXT_PUBLIC_FABRIC_LAKEHOUSE || '760dc750-d070-4e5a-b0aa-035b60b3420d';
  const token = process.env.FABRIC_ACCESS_TOKEN || process.env.NEXT_PUBLIC_FABRIC_TOKEN || '';

  // Biến lỗi phải là string | null, KHÔNG phải null
  let errorMessage: string | null = null;

  // 1) Thiếu token
  if (!token) {
    errorMessage = 'Please add FABRIC_ACCESS_TOKEN to .env.local';
  }

  // 2) (Tùy chọn) Token quá ngắn → coi như chưa hợp lệ
  if (!errorMessage && token.length < 100) {
    errorMessage = 'Please generate a new access token from Fabric portal';
  }

  // Nếu có lỗi cấu hình thì trả luôn
  if (errorMessage) {
    const body: Problem = {
      success: false,
      message: errorMessage,
      hint:
        'Open Developer Tools on app.fabric.microsoft.com → Network → copy Authorization Bearer token (without the "Bearer " prefix) and set FABRIC_ACCESS_TOKEN in .env.local',
    };
    return NextResponse.json(body, { status: 400 });
  }

  // Chuẩn bị thông tin cấu hình trả ra
  const configuration = {
    workspace,
    lakehouse,
    tokenProvided: !!token,
    tokenLength: token.length,
    tokenPreview: token ? `${token.substring(0, 10)}...${token.substring(token.length - 4)}` : 'NOT SET',
  };

  // (Tùy chọn) Gọi thử một endpoint nhẹ của Fabric để “probe”
  const probeUrl = `https://api.fabric.microsoft.com/v1/workspaces`;
  try {
    const response = await fetch(probeUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Vẫn trả cấu hình + mã lỗi HTTP của Fabric để debug
      const body: Ok = {
        success: true,
        configuration,
        probe: {
          url: probeUrl,
          status: response.status,
        },
      };
      return NextResponse.json(body, { status: 207 }); // Multi-Status: cấu hình OK, probe FAIL
    }

    // Thành công
    const body: Ok = {
      success: true,
      configuration,
      probe: {
        url: probeUrl,
        status: response.status,
      },
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err: any) {
    const body: Problem = {
      success: false,
      message: err?.message || 'Unexpected error while probing Fabric API',
    };
    return NextResponse.json(body, { status: 500 });
  }
}
