# 📋 Lista de Funcionalidades - Recepção NBA Park

Este documento detalha todas as funcionalidades implementadas no sistema de recepção e agendamento.

## 🔐 Autenticação e Segurança

- **Login Seguro**: Autenticação via email e senha.
- **Controle de Acesso (RBAC)**: Interface adaptada por perfil:
  - **Administrador**: Acesso total.
  - **Recepcionista**: Gestão de agenda e status.
  - **Funcionário**: Visualização de agenda pessoal.
- **Verificação de Status**: Bloqueio automático de login para contas com status "Bloqueado" ou "Pausado".
- **Proteção de Rotas**: Redirecionamento automático de usuários não autorizados.

## 🛡️ Painel Administrativo

- **Dashboard de Métricas**: Contadores em tempo real de usuários (Total, Ativos, Bloqueados, Pausados).
- **Gestão de Usuários**:
  - **Listagem**: Visualização tabular com avatares, nomes, emails, funções e status.
  - **Filtragem e Busca**: Campo de pesquisa por nome ou email.
  - **Criação de Usuário**: Formulário completo (Nome, Email, Senha, Função, Departamento).
  - **Edição de Status**:
    - **Pausar**: Suspende temporariamente o acesso.
    - **Bloquear**: Remove acesso permanentemente.
    - **Ativar**: Restaura o acesso.
  - **Exclusão**: Remoção definitiva de usuários (com limpeza automática de agendamentos vinculados).
- **Configurações do Sistema**:
  - **Personalização**: Upload e atualização da logomarca do sistema.
  - **Webhooks**: Interface para configurar URL de integração e selecionar campos a enviar.
  - **Teste de Integração**: Botão para testar envio de webhook com dados reais.

## 📅 Recepção e Agendamentos

- **Dashboard da Recepção**:
  - **Cards de Funcionários**: Visualização rápida de todos os funcionários.
  - **Status em Tempo Real**: Indicadores visuais de disponibilidade (Disponível, Ocupado, Reunião, Almoço, Férias).
  - **Filtros**: Filtragem por departamentos.
- **Gestão de Agendamentos**:
  - **Novo Agendamento**: Formulário intuitivo para criar compromissos.
  - **Tipos de Agendamento**:
    - _Interno_: Reuniões entre equipe.
    - _Externo_: Visitas de clientes/convidados (com campo para nome do visitante).
    - _Pessoal_: Bloqueio de horário para compromissos pessoais.
  - **Campo de Notas**: Área de texto para observações detalhadas sobre o compromisso.
  - **Validação de Conflitos**: Sistema impede agendamentos sobrepostos.

## 🗓️ Agenda e Calendário

- **Visualização Pessoal**: Cada funcionário vê sua própria agenda.
- **Calendário Interativo**: Navegação por dias/meses.
- **Lista Diária**: Exibição cronológica dos compromissos do dia selecionado.
- **Detalhes do Compromisso**: Modal com informações completas (Título, Horário, Visitante, Notas).

## � Chat Interno

- **Comunicação em Tempo Real**: Troca de mensagens instantâneas entre funcionários.
- **Lista de Contatos**:
  - **Status Online/Offline**: Indicador visual de presença em tempo real.
  - **Busca de Contatos**: Pesquisa rápida por nome.
- **Inteligência de Agenda**:
  - **Alerta de Reunião**: O chat avisa automaticamente se o contato está em uma reunião no momento, exibindo o horário de término.
- **Interface Responsiva**: Design adaptado para mobile permitindo focar na lista ou na conversa.

## �🔔 Notificações e Comunicação

- **Alertas em Tempo Real (Toasts)**: Feedback visual imediato para ações (Sucesso/Erro).
- **Central de Notificações**: Histórico de alertas recebidos.
- **Ícones de Status**: Identificação visual rápida do tipo de notificação.

## 🔌 Integrações (Webhooks)

- **Gatilho Automático**: Disparo automático ao criar agendamento (perfil Recepcionista).
- **Dados Enviados (Payload)**:
  - Título do agendamento
  - Data (DD-MM-YYYY) e Hora (HH:MM)
  - Tipo de compromisso
  - Detalhes do Visitante
  - Detalhes do Funcionário (Nome, Email, Telefone)
  - Notas/Observações
- **Flexibilidade**: Admin escolhe quais campos enviar.

## 💻 Aspectos Técnicos e UI/UX

- **Design Responsivo**: Layout adaptável para Desktops, Tablets e Monitores Touch.
- **Interface Moderna**: Uso de sombras suaves, bordas arredondadas e cores institucionais.
- **Feedback Visual**: Loaders animados durante carregamento de dados.
- **Sidebar Dinâmica**: Menu lateral com recolhimento automático e logo customizável.
