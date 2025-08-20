# Importador de Boletos - Frontend

Aplicação React para importação em massa de boletos através da integração com OlympiaBank.

## Funcionalidades

- ✅ Upload de arquivos CSV/XLSX com validação
- ✅ Acompanhamento de progresso em tempo real (SSE e Polling)
- ✅ Download de relatórios de sucesso e erro
- ✅ Autenticação via Bearer Token
- ✅ Histórico de importações
- ✅ Tratamento de erros detalhado
- ✅ Interface responsiva com Tailwind CSS

## Requisitos

- Node.js 18+
- npm ou yarn

## Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd boletos-import-app
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com a URL da API:
```
VITE_API_BASE_URL=https://api.seudominio.com
```

## Executando o Projeto

### Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build para Produção
```bash
npm run build
```

### Preview do Build
```bash
npm run preview
```

## Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── FileUpload.tsx   # Upload de arquivos com validações
│   ├── ImportStatus.tsx # Acompanhamento de status
│   └── ProtectedRoute.tsx # Rota protegida por autenticação
├── pages/              # Páginas da aplicação
│   ├── LoginPage.tsx   # Tela de login
│   └── ImportPage.tsx  # Tela principal de importação
├── services/           # Serviços e APIs
│   └── api.ts         # Cliente HTTP e integrações
├── hooks/             # React hooks customizados
│   └── useErrorHandler.ts # Tratamento de erros
├── types/             # Definições TypeScript
│   └── import.types.ts # Tipos da aplicação
└── App.tsx            # Componente principal

```

## Formato do Arquivo de Importação

### Colunas Obrigatórias
- `amount` - Valor do boleto (centavos ou reais)
- `name` - Nome do cliente
- `document` - CPF ou CNPJ (apenas dígitos)
- `telefone` - Telefone (apenas dígitos)
- `email` - E-mail válido
- `vencimento` - Data de vencimento (YYYY-MM-DD ou DD/MM/YYYY)

### Exemplo CSV
```csv
amount,name,document,telefone,email,vencimento
1099,João Souza,12345678901,11988887777,joao@example.com,2025-08-20
25990,Maria Lima,11222333000181,21999995555,maria@example.com,20/08/2025
```

### Limites
- Máximo 2.000 linhas por arquivo
- Tamanho máximo: 10MB
- Formatos aceitos: CSV, XLSX

## Fluxo de Uso

1. **Login**: Entre com seu e-mail e token de API
2. **Upload**: Selecione ou arraste o arquivo para upload
3. **Configuração**: Escolha delimitador (CSV) e formato de data
4. **Envio**: Clique em "Enviar Arquivo"
5. **Acompanhamento**: Veja o progresso em tempo real
6. **Download**: Baixe os relatórios após conclusão

## Tratamento de Erros

A aplicação trata os seguintes códigos de erro:

- `INVALID_FILE_TYPE` - Arquivo não é CSV/XLSX
- `MISSING_COLUMNS` - Colunas obrigatórias ausentes
- `TOO_MANY_ROWS` - Mais de 2.000 linhas
- `UNAUTHORIZED` - Token inválido
- `PAYLOAD_TOO_LARGE` - Arquivo muito grande
- `RATE_LIMITED` - Muitas requisições

## Tecnologias Utilizadas

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router DOM
- React Hot Toast
- Lucide React (ícones)

## Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
- `npm run lint` - Executar linter

## Suporte

Para dúvidas ou problemas, consulte a documentação da API ou entre em contato com a equipe de desenvolvimento.