import { Module, Global } from '@nestjs/common';
import { AuditLogsController } from './controllers/audit-logs.controller';

@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [],
  exports: [],
})
export class CommonModule {}
