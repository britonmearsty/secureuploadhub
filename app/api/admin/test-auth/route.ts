import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing authentication...');
    
    // Get session
    const session = await auth();
    console.log('Session:', session);
    
    if (!session) {
      console.log('❌ No session found');
      return NextResponse.json({ 
        error: 'No session',
        authenticated: false,
        cookies: Array.from(request.cookies.getAll()).reduce((acc, cookie) => {
          acc[cookie.name] = cookie.value;
          return acc;
        }, {} as Record<string, string>)
      }, { status: 401 });
    }
    
    if (!session.user) {
      console.log('❌ No user in session');
      return NextResponse.json({ 
        error: 'No user in session',
        authenticated: false,
        session
      }, { status: 401 });
    }
    
    console.log('✅ User found:', session.user.email, 'Role:', session.user.role);
    
    if (session.user.role !== 'admin') {
      console.log('❌ User is not admin');
      return NextResponse.json({ 
        error: 'Not admin',
        authenticated: true,
        isAdmin: false,
        user: session.user
      }, { status: 403 });
    }
    
    console.log('✅ Admin user authenticated successfully');
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      isAdmin: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role
      },
      cookies: Array.from(request.cookies.getAll()).reduce((acc, cookie) => {
        acc[cookie.name] = cookie.value;
        return acc;
      }, {} as Record<string, string>)
    });
    
  } catch (error) {
    console.error('❌ Auth test error:', error);
    return NextResponse.json({
      error: 'Auth test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false
    }, { status: 500 });
  }
}