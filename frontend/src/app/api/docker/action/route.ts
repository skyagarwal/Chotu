import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, containerId } = body;

    if (!action || !containerId) {
      return NextResponse.json(
        { success: false, error: 'Missing action or containerId' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['start', 'stop', 'restart', 'pause', 'unpause'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Valid actions: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute Docker command
    const command = `docker ${action} ${containerId}`;
    console.log(`Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);
      
      return NextResponse.json({
        success: true,
        action,
        containerId,
        message: `Container ${action} command executed successfully`,
        output: stdout || stderr,
      });
    } catch (execError: unknown) {
      const error = execError as { message?: string };
      return NextResponse.json(
        { success: false, error: `Docker command failed: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Docker action failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute Docker action' },
      { status: 500 }
    );
  }
}
