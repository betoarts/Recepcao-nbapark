# Recepção NBA Park

Sistema de gestão de recepção e agendamentos para o NBA Park, desenvolvido com tecnologias modernas para oferecer uma experiência ágil e interativa.

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, Vite, TypeScript
- **Estilização**: Tailwind CSS v4, Lucide React (ícones)
- **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Gerenciamento de Estado**: Context API (Auth, Settings, Notifications)
- **Utilitários**: date-fns (manipulação de datas), sonner (toasts)

## ✨ Funcionalidades Principais

### 1. Painel Administrativo (`/admin`)

- **Gerenciamento de Usuários**: Criar, listar, pausar, bloquear e excluir usuários.
- **Configuração de Webhooks**: Configure URLs externas para receber dados de novos agendamentos.
- **Personalização**: Upload de logomarca da aplicação.
- **Dashboard de Métricas**: Visualização rápida de usuários ativos/bloqueados.

### 2. Recepção (`/dashboard`)

- **Dashboard Interativo**: Acesso rápido às principais funções.
- **Gestão de Agendamentos**:
  - Criação de novos agendamentos (internos/externos).
  - Campo "Notas / Observações" para detalhes adicionais.
  - Visualização de disponibilidade.

### 3. Agenda de Funcionários (`/schedule`)

- **Visualização de Calendário**: Navegação intuitiva por dias.
- **Lista de Compromissos**: Detalhes dos agendamentos do dia selecionado.
- **Modal de Detalhes**: Informações completas sobre cada compromisso.

### 4. Sistema de Notificações

- **Tempo Real**: Notificações instantâneas para novos agendamentos e atualizações.
- **Central de Notificações**: Histórico de alertas recebidos.

### 5. Webhooks & Integrações

O sistema permite enviar dados de agendamentos para serviços externos (ex: n8n, Zapier, Whatsapp).

**Configuração:**

1. Acesse o Painel Admin.
2. Insira a URL do seu endpoint (POST).
3. Selecione os campos desejados.

**Payload Exemplo:**

```json
{
  "appointment_title": "Reunião de Liderança",
  "appointment_date": "08-01-2026",
  "appointment_time": "14:30",
  "appointment_type": "internal",
  "host_name": "João Silva",
  "host_email": "joao@nbapark.com",
  "notes": "Sala de conferência principal"
}
```

## 🛠️ Configuração e Instalação

### Pré-requisitos

- Node.js & npm
- Docker (para Supabase local)

### Passo a Passo

1. **Instalar dependências**

   ```bash
   npm install
   ```

2. **Iniciar Supabase Local**

   ```bash
   npx supabase start
   ```

   Isso iniciará o banco de dados, autenticação e edge functions localmente.

3. **Executar a Aplicação**

   ```bash
   npm run dev
   ```

4. **Executar Edge Functions (para Webhooks)**
   Para testar webhooks localmente:
   ```bash
   npx supabase functions serve
   ```

## 🔐 Perfis de Acesso

- **Admin**: Acesso total ao sistema, configurações e gestão de usuários.
- **Recepcionista**: Gestão de agendamentos, check-in de visitantes e visualização de agendas.
- **Funcionário**: Visualização da própria agenda e notificações.

## 📂 Estrutura do Projeto

- `/src`
  - `/components`: Componentes reutilizáveis (Forms, Layout, UI).
  - `/contexts`: Gerenciamento de estado global.
  - `/pages`: Páginas da aplicação (Admin, Dashboard, Schedule).
  - `/lib`: Configurações de serviços (Supabase, Utils).
- `/supabase`
  - `/functions`: Edge Functions (Webhooks).
  - `/migrations`: Scripts de banco de dados.

## 🚀 Deploy no Easypanel

A aplicação já está configurada com `Dockerfile` para deploy facilitado.

### Configuração no Easypanel

1. **Criar Serviço**:

   - Tipo: **App**
   - Source: Github (selecione este repositório)
   - Build Method: **Dockerfile**

2. **Variáveis de Ambiente (Build Args)**:
   É crucial definir estas variáveis na aba **Build** (ou Environment, dependendo da versão) para que o Vite consiga "emburtr" as chaves no frontend durante o build.

   | Variável                 | Valor                                    |
   | ------------------------ | ---------------------------------------- |
   | `VITE_SUPABASE_URL`      | https://wqbvtqxryhyqcxcvvbxi.supabase.co |
   | `VITE_SUPABASE_ANON_KEY` | (Sua chave anon pública)                 |

   > **Nota**: Como é uma aplicação SPA (Single Page Application), as variáveis precisam estar disponíveis no momento do _Build_.

3. **Porta**:
   - Container Port: **80**
