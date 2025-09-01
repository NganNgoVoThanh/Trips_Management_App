// app/api/test-ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { aiOptimizer } from '@/lib/ai-optimizer';

export async function GET(request: NextRequest) {
  try {
    // Test AI optimizer configuration
    const config = aiOptimizer.getConfiguration();
    
    console.log('Testing AI configuration:', config);
    
    // Test connection
    const connectionTest = await aiOptimizer.testConnection();
    
    return NextResponse.json({
      success: true,
      data: {
        configuration: config,
        connectionTest,
        environment: {
          hasNextPublicKey: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          hasPrivateKey: !!process.env.OPENAI_API_KEY,
          nextPublicKeyPrefix: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 
            `${process.env.NEXT_PUBLIC_OPENAI_API_KEY.substring(0, 7)}...` : 'none',
          privateKeyPrefix: process.env.OPENAI_API_KEY ? 
            `${process.env.OPENAI_API_KEY.substring(0, 7)}...` : 'none'
        }
      }
    });
  } catch (error) {
    console.error('Error testing AI configuration:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        configuration: aiOptimizer.getConfiguration(),
        environment: {
          hasNextPublicKey: !!process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          hasPrivateKey: !!process.env.OPENAI_API_KEY,
          nextPublicKeyPrefix: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 
            `${process.env.NEXT_PUBLIC_OPENAI_API_KEY.substring(0, 7)}...` : 'none',
          privateKeyPrefix: process.env.OPENAI_API_KEY ? 
            `${process.env.OPENAI_API_KEY.substring(0, 7)}...` : 'none'
        }
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { trips } = await request.json();
    
    if (!trips || !Array.isArray(trips)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid trips data'
      }, { status: 400 });
    }
    
    console.log(`Testing optimization with ${trips.length} trips`);
    
    // Test optimization
    const proposals = await aiOptimizer.optimizeTrips(trips);
    
    return NextResponse.json({
      success: true,
      data: {
        proposalsCount: proposals.length,
        proposals,
        configuration: aiOptimizer.getConfiguration()
      }
    });
    
  } catch (error) {
    console.error('Error testing optimization:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}