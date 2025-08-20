export type ImportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

export interface ImportStats {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

export interface ImportResponse {
  importId: string;
  status: ImportStatus;
  receivedAt: string;
  maxRows: number;
}

export interface ImportStatusResponse {
  importId: string;
  status: ImportStatus;
  stats: ImportStats;
  etaSeconds?: number;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
  links?: {
    resultsCsv: string;
    errorsCsv: string;
  };
}

export interface ProgressEvent {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  etaSeconds: number;
}

export interface WebhookPayload {
  importId: string;
  status: ImportStatus;
  totals: {
    total: number;
    succeeded: number;
    failed: number;
  };
  resultsUrl: string;
  errorsUrl: string;
  startedAt: string;
  finishedAt: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ErrorCode = 
  | 'INVALID_FILE_TYPE'
  | 'MISSING_COLUMNS'
  | 'TOO_MANY_ROWS'
  | 'UNAUTHORIZED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'ROW_VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type RowErrorCode =
  | 'INVALID_DOCUMENT'
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE_FORMAT'
  | 'UPSTREAM_VALIDATION_ERROR'
  | 'UPSTREAM_TEMP_ERROR';