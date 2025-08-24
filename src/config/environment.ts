// Configurações de ambiente
// Centraliza todas as variáveis de ambiente e configurações da aplicação

// Função para converter string para boolean
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Função para converter string para number
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'https://api.envio-boleto.olympiabank.xyz'),
    timeout: parseNumber(import.meta.env.VITE_API_TIMEOUT, 30000),
    retryAttempts: parseNumber(import.meta.env.VITE_API_RETRY_ATTEMPTS, 3),
    retryDelay: parseNumber(import.meta.env.VITE_API_RETRY_DELAY, 1000),
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Importador de Boletos',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development',
    mockMode: parseBoolean(import.meta.env.VITE_MOCK_MODE, false), // Desativado para testar BE real
    debugMode: parseBoolean(import.meta.env.VITE_DEBUG_MODE, import.meta.env.DEV),
    logLevel: (import.meta.env.VITE_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    maxFileSize: parseNumber(import.meta.env.VITE_MAX_FILE_SIZE, 10 * 1024 * 1024), // 10MB
    maxRows: parseNumber(import.meta.env.VITE_MAX_ROWS, 2000),
    allowedExtensions: ['.csv', '.xlsx'] as const,
    pollingInterval: parseNumber(import.meta.env.VITE_POLLING_INTERVAL, 2000),
    sseReconnectDelay: parseNumber(import.meta.env.VITE_SSE_RECONNECT_DELAY, 5000),
  },
  features: {
    enableSSE: parseBoolean(import.meta.env.VITE_ENABLE_SSE, true),
    enableRetry: parseBoolean(import.meta.env.VITE_ENABLE_RETRY, true),
    enableCache: parseBoolean(import.meta.env.VITE_ENABLE_CACHE, true),
  },
  validation: {
    allowedExtensions: ['.csv', '.xlsx'] as string[],
    requiredHeaders: ['name', 'document', 'publicarea', 'number', 'neighborhood', 'city', 'state', 'postalcode', 'amount', 'duedate', 'description'] as string[],
    supportedDateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY', 'DD/MM/YY', 'DD-MM-YY', 'DD.MM.YY'] as const,
    supportedDelimiters: [';', ',', '\t', '|'] as const,
    supportedDecimalSeparators: [',', '.'] as const,
  },
  security: {
    enableCSP: parseBoolean(import.meta.env.VITE_ENABLE_CSP, false),
    enableHSTS: parseBoolean(import.meta.env.VITE_ENABLE_HSTS, false),
  },
  defaults: {
    webhookUrl: import.meta.env.VITE_DEFAULT_WEBHOOK_URL,
  },
} as const;

export type Config = typeof config;

// Função para debug das configurações
export const debugConfig = () => {
  if (config.app.debugMode) {
    console.group('🔧 Configurações da Aplicação');
    console.log('Environment:', config.app.environment);
    console.log('Mock Mode:', config.app.mockMode);
    console.log('API Base URL:', config.api.baseUrl);
    console.log('Debug Mode:', config.app.debugMode);
    console.log('Log Level:', config.app.logLevel);
    console.groupEnd();
  }
};

// Validação das configurações
export const validateConfig = (): boolean => {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('VITE_API_BASE_URL é obrigatório');
  }

  if (config.api.timeout < 1000) {
    errors.push('VITE_API_TIMEOUT deve ser pelo menos 1000ms');
  }

  if (config.app.maxFileSize < 1048576) { // 1MB
    errors.push('VITE_MAX_FILE_SIZE deve ser pelo menos 1MB');
  }

  if (config.app.maxRows < 1) {
    errors.push('VITE_MAX_ROWS deve ser pelo menos 1');
  }

  if (errors.length > 0) {
    console.error('❌ Erros de configuração:', errors);
    return false;
  }

  if (config.app.debugMode) {
    console.log('✅ Configurações validadas com sucesso');
  }

  return true;
};

// Executar validação e debug no carregamento (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  validateConfig();
  debugConfig();
}
