# Importador de Boletos - OlympiaBank Integration

Frontend moderno para importação de boletos bancários via API OlympiaBank, desenvolvido com React, TypeScript e Material-UI.

## 🚀 **Funcionalidades**

- **Autenticação JWT** com refresh automático de token
- **Upload de arquivos** CSV/XLSX com validação em tempo real
- **Monitoramento em tempo real** via Server-Sent Events (SSE)
- **Fallback automático** para polling em caso de falha no SSE
- **Validação robusta** de arquivos (formato, tamanho, colunas)
- **Histórico de importações** com cache inteligente
- **Retry automático** para erros de rede
- **Interface responsiva** e moderna
- **Tratamento de erros** abrangente
- **Logout automático** em caso de token expirado

## 🛠️ **Stack Tecnológica**

- **Frontend**: React 19 + TypeScript
- **UI Framework**: Material-UI (MUI) v7
- **HTTP Client**: Axios com interceptors
- **Estado**: React Hooks personalizados
- **Validação**: Validação em tempo real
- **Build**: Vite
- **Linting**: ESLint

## 📋 **Requisitos**

- Node.js 18+
- npm ou yarn

## 🚀 **Instalação e Configuração**

### 1. **Clone o repositório**
```bash
git clone <repository-url>
cd front-boletos-gatway
```

### 2. **Instale as dependências**
```bash
npm install
```

### 3. **Configure as variáveis de ambiente**
Crie um arquivo `.env.local` na raiz do projeto:

```env
# URL da API OlympiaBank
VITE_API_BASE_URL=https://api.envio-boleto.olympiabank.xyz

# Modo de desenvolvimento (true para mock, false para API real)
VITE_MOCK_MODE=false

# Nome da aplicação
VITE_APP_NAME=Importador de Boletos

# Configurações de autenticação
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=warn
```


### 4. **Execute o projeto**
```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview da build
npm run preview
```

## 📁 **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── FileUpload.tsx  # Upload e validação de arquivos
│   └── ImportStatus.tsx # Status e progresso das importações
├── config/             # Configurações centralizadas
│   └── environment.ts  # Variáveis de ambiente e configurações
├── hooks/              # Hooks personalizados
│   ├── useErrorHandler.ts # Tratamento de erros
│   └── useImportManager.ts # Gerenciamento de importações
├── pages/              # Páginas da aplicação
│   ├── ImportPage.tsx  # Página principal de importação
│   └── LoginPage.tsx   # Página de login
├── services/           # Serviços da API
│   ├── api.ts         # Cliente HTTP com interceptors
│   └── authService.ts # Serviço de autenticação JWT
├── types/              # Definições de tipos TypeScript
│   └── import.types.ts # Tipos relacionados a importações
└── theme/              # Configurações de tema
    └── theme.ts        # Tema Material-UI personalizado
```

## 🔐 **Sistema de Autenticação**

O sistema implementa autenticação JWT completa seguindo o padrão da API OlympiaBank:

### **Fluxo de Autenticação**
1. **Login**: Usuário fornece email e token OlympiaBank
2. **Validação**: Sistema valida credenciais e retorna JWT
3. **Refresh**: Token é renovado automaticamente 5 minutos antes da expiração
4. **Logout**: Token é invalidado e dados locais são limpos

### **Segurança**
- **JWT válido por 30 dias** com refresh automático
- **Interceptors automáticos** para adicionar token em todas as requisições
- **Logout automático** em caso de token expirado
- **Validação de token** em cada requisição

### **Uso**
```typescript
import { authService } from './services/authService';

// Login
const result = await authService.login(email, olympiaToken);

// Verificar autenticação
if (authService.isAuthenticated()) {
  const user = authService.getUser();
  console.log('Usuário logado:', user.companyName);
}

// Logout
await authService.logout();
```

## 🔧 **Configurações Avançadas**

### **Configuração da API**
O arquivo `src/config/environment.ts` centraliza todas as configurações:

```typescript
export const config = {
  api: {
    baseUrl: 'https://api.envio-boleto.olympiabank.xyz',
    timeout: 30000,        // 30 segundos
    retryAttempts: 3,      // Tentativas de retry
    retryDelay: 1000,      // Delay entre tentativas
  },
  app: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRows: 2000,                  // Máximo de linhas
    pollingInterval: 2000,          // Intervalo de polling
    sseReconnectDelay: 5000,        // Delay de reconexão SSE
  }
};
```

### **Modo Mock**
Para desenvolvimento sem API real, configure:

```env
VITE_MOCK_MODE=true
```

## 📊 **Formato dos Arquivos**

### **Colunas Obrigatórias**
- `amount` - Valor do boleto (centavos ou reais)
- `name` - Nome do cliente
- `document` - CPF/CNPJ (apenas dígitos)
- `telefone` - Telefone (apenas dígitos)
- `email` - E-mail válido
- `vencimento` - Data de vencimento

### **Formatos Suportados**
- **CSV**: UTF-8, delimitador vírgula (,) ou ponto e vírgula (;)
- **XLSX**: Primeira aba, primeira linha como cabeçalho

### **Limites**
- Máximo: 2.000 linhas por arquivo
- Tamanho: Máximo 10MB
- Colunas: Ordem livre, nomes devem corresponder

## 🔄 **Fluxo de Importação**

1. **Upload**: Usuário seleciona arquivo CSV/XLSX
2. **Validação**: Validação em tempo real do arquivo
3. **Envio**: Upload para API OlympiaBank
4. **Monitoramento**: Acompanhamento via SSE ou polling
5. **Conclusão**: Download de relatórios de sucesso e erro

## 🚨 **Tratamento de Erros**

### **Códigos de Erro da API**
- `400` - Validação de arquivo
- `401` - Não autorizado
- `413` - Arquivo muito grande
- `429` - Rate limit
- `500` - Erro interno

### **Retry Automático**
- Erros 5xx: Retry automático com backoff exponencial
- Erros 429: Retry automático após delay
- Máximo de 3 tentativas

## 🔧 **Desenvolvimento**

### **Scripts Disponíveis**
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview da build
npm run lint         # Verificação de código
```

### **Estrutura de Commits**
```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação de código
refactor: refatoração
test: testes
chore: tarefas de manutenção
```

## 📱 **Responsividade**

- **Mobile First**: Design otimizado para dispositivos móveis
- **Breakpoints**: Adaptação automática para diferentes tamanhos de tela
- **Touch Friendly**: Interface otimizada para toque

## 🔒 **Segurança**

- **Autenticação**: Bearer token via localStorage
- **Validação**: Validação client-side e server-side
- **Sanitização**: Limpeza automática de dados de entrada
- **HTTPS**: Comunicação segura com a API

## 🚀 **Deploy**

### **Build de Produção**
```bash
npm run build
```

### **Servidor Web**
Configure seu servidor web para servir os arquivos da pasta `dist/`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 **Suporte**

Para suporte técnico ou dúvidas:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ para OlympiaBank Integration**