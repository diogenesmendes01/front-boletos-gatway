import { config } from '../config/environment';

export interface User {
  userId: string;
  username: string;
  email: string;
  companyName: string;
  companyDocument: string;
}

export interface LoginResponse {
  accessToken: string;
  userId: string;
  username: string;
  email: string;
  companyName: string;
  companyDocument: string;
  expiresAt: string;
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresAt: string;
}

class AuthService {
  private accessToken: string | null;
  private user: User | null;
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    this.user = userStr ? JSON.parse(userStr) : null;
    
    // Configurar refresh automático se houver token
    if (this.accessToken) {
      this.scheduleTokenRefresh();
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${config.api.baseUrl}/v1/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Falha no login: ${response.status}`);
      }
      
      const data: LoginResponse = await response.json();
      
      // Salvar dados no localStorage
      this.accessToken = data.accessToken;
      this.user = {
        userId: data.userId,
        username: data.username,
        email: data.email,
        companyName: data.companyName,
        companyDocument: data.companyDocument
      };
      
      localStorage.setItem('accessToken', this.accessToken);
      localStorage.setItem('user', JSON.stringify(this.user));
      
      // Configurar refresh automático
      this.scheduleTokenRefresh();
      
      return data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch(`${config.api.baseUrl}/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Limpar dados locais
      this.clearAuthData();
    }
  }

  async refreshToken(): Promise<RefreshResponse> {
    try {
      if (!this.accessToken) {
        throw new Error('Nenhum token para renovar');
      }

      const response = await fetch(`${config.api.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao renovar token');
      }

      const data: RefreshResponse = await response.json();
      this.accessToken = data.accessToken;
      localStorage.setItem('accessToken', this.accessToken);
      
      // Reconfigurar refresh automático
      this.scheduleTokenRefresh();
      
      return data;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      // Se falhar, fazer logout
      await this.logout();
      throw error;
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false;
      }

      const response = await fetch(`${config.api.baseUrl}/v1/auth/validate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Erro ao validar token:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }

  getUser(): User | null {
    return this.user;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private clearAuthData(): void {
    this.accessToken = null;
    this.user = null;
    
    // Limpar timeout de refresh
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }

  private scheduleTokenRefresh(): void {
    if (!this.accessToken) return;

    try {
      // Decodificar JWT para obter expiração
      const payload = this.decodeJWT(this.accessToken);
      if (!payload.exp || typeof payload.exp !== 'number') return;

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      
      // Renovar 5 minutos antes da expiração
      const refreshIn = Math.max(0, (expiresIn - 300) * 1000);
      
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
      }
      
      this.refreshTimeout = setTimeout(async () => {
        try {
          await this.refreshToken();
        } catch (error) {
          console.error('Falha no refresh automático:', error);
          // Se falhar, fazer logout
          await this.logout();
          window.location.href = '/login';
        }
      }, refreshIn);
      
    } catch (error) {
      console.error('Erro ao agendar refresh:', error);
    }
  }

  private decodeJWT(token: string): Record<string, unknown> {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erro ao decodificar JWT:', error);
      return {};
    }
  }

  // Método para desenvolvimento/mock
  async mockLogin(email: string, password: string): Promise<LoginResponse> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Validar credenciais mock
    if (!this.isValidMockCredentials(email, password)) {
      throw new Error('Credenciais inválidas');
    }
    
    // Criar dados mock
    const mockData: LoginResponse = {
      accessToken: `mock-jwt-${Date.now()}`,
      userId: 'mock-user-id',
      username: email,
      email: email,
      companyName: 'Empresa Mock LTDA',
      companyDocument: '12.345.678/0001-90',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      message: 'Login realizado com sucesso'
    };
    
    // Salvar dados
    this.accessToken = mockData.accessToken;
    this.user = {
      userId: mockData.userId,
      username: mockData.username,
      email: mockData.email,
      companyName: mockData.companyName,
      companyDocument: mockData.companyDocument
    };
    
    localStorage.setItem('accessToken', this.accessToken);
    localStorage.setItem('user', JSON.stringify(this.user));
    
    return mockData;
  }

  private isValidMockCredentials(email: string, password: string): boolean {
    const validCredentials = [
      { email: 'demo@olympiabank.com', password: 'demo123' },
      { email: 'teste@olympiabank.com', password: 'teste456' },
      { email: 'admin@olympiabank.com', password: 'admin789' },
    ];

    return validCredentials.some(
      cred => cred.email === email && cred.password === password
    );
  }
}

export const authService = new AuthService();
