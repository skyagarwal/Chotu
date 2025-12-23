import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface Container {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'restarting' | 'unhealthy';
  health?: 'healthy' | 'unhealthy' | 'starting';
  ports: string[];
  cpu: string;
  memory: string;
  network: string;
  uptime: string;
  createdAt: string;
  isGpu?: boolean;
  gpuMemory?: string;
}

async function getDockerContainers(): Promise<Container[]> {
  try {
    // Get all containers with full details
    const { stdout } = await execAsync(
      `docker ps -a --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}|{{.Networks}}|{{.CreatedAt}}'`
    );
    
    const lines = stdout.trim().split('\n').filter(Boolean);
    const containers: Container[] = [];
    
    for (const line of lines) {
      const [id, name, image, statusRaw, ports, network, createdAt] = line.split('|');
      
      // Parse status
      let status: Container['status'] = 'stopped';
      let health: Container['health'] | undefined;
      
      if (statusRaw.toLowerCase().includes('up')) {
        status = 'running';
        if (statusRaw.toLowerCase().includes('healthy')) {
          health = 'healthy';
        } else if (statusRaw.toLowerCase().includes('unhealthy')) {
          health = 'unhealthy';
        } else if (statusRaw.toLowerCase().includes('starting')) {
          health = 'starting';
        }
      } else if (statusRaw.toLowerCase().includes('restarting')) {
        status = 'restarting';
      }
      
      // Parse uptime from status
      let uptime = 'N/A';
      const uptimeMatch = statusRaw.match(/Up\s+(.+?)(?:\s+\(|$)/);
      if (uptimeMatch) {
        uptime = uptimeMatch[1].trim();
      }
      
      // Check if it's a GPU container
      const isGpu = await checkGpuContainer(name);
      
      containers.push({
        id: id.substring(0, 12),
        name,
        image,
        status,
        health,
        ports: ports ? ports.split(',').map(p => p.trim()) : [],
        cpu: '0%',
        memory: '0 MB',
        network: network || 'none',
        uptime,
        createdAt,
        isGpu,
      });
    }
    
    // Get CPU and memory stats for running containers
    try {
      const { stdout: statsOut } = await execAsync(
        `docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}' 2>/dev/null || true`
      );
      
      const statsLines = statsOut.trim().split('\n').filter(Boolean);
      for (const line of statsLines) {
        const [name, cpu, memUsage] = line.split('|');
        const container = containers.find(c => c.name === name);
        if (container) {
          container.cpu = cpu || '0%';
          container.memory = memUsage?.split('/')[0]?.trim() || '0 MB';
        }
      }
    } catch {
      // Stats might fail for some containers
    }
    
    return containers;
  } catch (error) {
    console.error('Failed to get Docker containers:', error);
    return [];
  }
}

async function checkGpuContainer(name: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker inspect ${name} --format '{{.HostConfig.Runtime}}' 2>/dev/null || echo 'runc'`
    );
    return stdout.trim() === 'nvidia';
  } catch {
    return false;
  }
}

async function getGpuStats() {
  try {
    const { stdout } = await execAsync(
      `nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits 2>/dev/null || echo ''`
    );
    
    if (!stdout.trim()) {
      return null;
    }
    
    const [name, memUsed, memTotal, utilization] = stdout.trim().split(',').map(s => s.trim());
    
    return {
      name,
      memoryUsed: `${memUsed} MiB`,
      memoryTotal: `${memTotal} MiB`,
      utilization: `${utilization}%`,
      memoryPercent: Math.round((parseInt(memUsed) / parseInt(memTotal)) * 100),
    };
  } catch {
    return null;
  }
}

async function getSystemStats() {
  try {
    // Get memory info
    const { stdout: memInfo } = await execAsync(
      `free -b | grep Mem | awk '{print $2,$3}'`
    );
    const [totalMem, usedMem] = memInfo.trim().split(' ').map(Number);
    
    // Get CPU usage
    const { stdout: cpuInfo } = await execAsync(
      `top -bn1 | grep 'Cpu(s)' | awk '{print $2}'`
    );
    const cpuUsage = parseFloat(cpuInfo.trim()) || 0;
    
    return {
      memoryTotal: Math.round(totalMem / (1024 * 1024)), // MB
      memoryUsed: Math.round(usedMem / (1024 * 1024)), // MB
      cpuUsage: Math.round(cpuUsage),
    };
  } catch {
    return {
      memoryTotal: 32 * 1024,
      memoryUsed: 16 * 1024,
      cpuUsage: 0,
    };
  }
}

export async function GET() {
  try {
    const [containers, gpuStats, systemStats] = await Promise.all([
      getDockerContainers(),
      getGpuStats(),
      getSystemStats(),
    ]);
    
    // Count image count
    let imageCount = 0;
    try {
      const { stdout } = await execAsync(`docker images --format '{{.ID}}' | wc -l`);
      imageCount = parseInt(stdout.trim()) || 0;
    } catch {
      imageCount = containers.length;
    }
    
    const stats = {
      totalContainers: containers.length,
      runningContainers: containers.filter(c => c.status === 'running').length,
      stoppedContainers: containers.filter(c => c.status === 'stopped').length,
      totalImages: imageCount,
      cpuUsage: systemStats.cpuUsage,
      memoryUsage: systemStats.memoryUsed,
      memoryTotal: systemStats.memoryTotal,
      gpu: gpuStats,
    };

    return NextResponse.json({
      success: true,
      containers,
      stats,
    });
  } catch (error) {
    console.error('Failed to get containers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch containers', details: String(error) },
      { status: 500 }
    );
  }
}
