import { NextRequest, NextResponse } from 'next/server';

const IMAGE_AI_URL = process.env.IMAGE_AI_INTERNAL_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Validate required fields
    const employeeCode = formData.get('employeeCode');
    const name = formData.get('name');
    const storeId = formData.get('storeId');
    
    if (!employeeCode || !name || !storeId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'employeeCode, name, and storeId are required' 
        },
        { status: 400 }
      );
    }

    // Count images - backend expects 'faces' field name
    const images = formData.getAll('image');
    if (images.length < 3) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'At least 3 face images are required for accurate enrollment' 
        },
        { status: 400 }
      );
    }

    if (images.length > 10) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Maximum 10 images allowed' 
        },
        { status: 400 }
      );
    }

    // Create new FormData with correct field name for backend
    const backendFormData = new FormData();
    
    // Add employee details
    backendFormData.append('employeeCode', employeeCode as string);
    backendFormData.append('name', name as string);
    backendFormData.append('storeId', storeId as string);
    
    const email = formData.get('email');
    const phone = formData.get('phone');
    const department = formData.get('department');
    const position = formData.get('position');
    
    if (email) backendFormData.append('email', email as string);
    if (phone) backendFormData.append('phone', phone as string);
    if (department) backendFormData.append('department', department as string);
    if (position) backendFormData.append('position', position as string);
    
    // Add images with 'faces' field name (backend expects this)
    images.forEach((image) => {
      backendFormData.append('faces', image as Blob);
    });

    // Forward to Image AI backend
    const response = await fetch(`${IMAGE_AI_URL}/employees/enroll`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { 
          success: false, 
          message: errorData.message || `Image AI service error: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return successful response
    return NextResponse.json({
      success: true,
      employee: data.employee,
      faceCount: data.faceCount,
      qualityScore: data.qualityScore,
      message: data.message || 'Employee enrolled successfully',
    });

  } catch (error) {
    console.error('Employee enrollment error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
