// DTO exports for gamification module

export interface UpdateSettingDto {
  key: string;
  value: string;
}

export interface UpdateSettingsDto {
  settings: UpdateSettingDto[];
}

export interface ApproveRejectDto {
  approved_by: string;
  reason?: string;
}

export interface TrainingSampleFilters {
  status?: 'all' | 'pending' | 'approved' | 'rejected';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ExportFormat {
  format?: 'json' | 'jsonl' | 'csv';
}
