📅 Painel Administrativo – Programação e Territórios

Sistema web para gerenciamento de territórios, designações, programação anual de atividades e relatórios, utilizando Firebase Authentication, Firestore, Realtime Database e Storage.

O projeto foi pensado para uso administrativo, com controle rigoroso de permissões, separando usuários comuns e administradores.

🚀 Funcionalidades
🔐 Autenticação

Login com Firebase Authentication

Controle de acesso baseado em permissões no Firestore

Usuários não podem se promover a admin

🗺️ Territórios

Cadastro e edição de territórios

Upload de imagens de mapas

Associação de responsável, bairro e número do mapa

📌 Designações

Registro de designações com data

Consulta por período

Histórico preservado

📅 Programação Anual

Geração automática da escala anual

Organização por ano

Estrutura:

programacao/{ano}/agendamentos/{docId}


Escrita permitida somente para administradores

📊 Relatórios

Visualização consolidada de dados

Atualização dinâmica ao trocar abas

🧠 Arquitetura de Dados (Firestore)
usuarios/{uid}
territorios/{id}
designacoes/{id}
agendamentos/{id}               // legado / simples
programacao/{ano}/agendamentos/{docId}
mapas/{id}

Documento de Usuário (usuarios/{uid})
{
  "isAdmin": true,
  "writtenPermission": true
}

🔐 Regras de Segurança

Leitura permitida apenas para usuários autenticados

Escrita controlada por permissões

Apenas administradores podem:

Gerar programação anual

Alterar dados críticos

Usuários não podem:

Conceder permissões a si mesmos

Excluir documentos sensíveis

🛠️ Tecnologias Utilizadas

HTML5

CSS3

JavaScript (Vanilla)

Firebase:

Authentication

Firestore

Realtime Database

Storage

ExcelJS (exportação)

Service Worker (cache/offline – opcional)

📂 Estrutura do Projeto
/Public
 ├── Painel
 │   ├── programacao.js
 │   ├── script.js
 │   ├── style.css
 │   └── index.html
 ├── js
 │   └── Firebaseconfig.js
 └── sw.js

▶️ Como Executar o Projeto

Clone o repositório

Configure o Firebase no arquivo:

/js/Firebaseconfig.js


Ative os serviços no Firebase Console:

Authentication (Email/Senha)

Firestore

Storage (opcional)

Crie o documento do usuário admin em:

usuarios/{uid}


Rode o projeto via servidor local (ex: Live Server)

⚠️ Observações Importantes

O botão “Gerar escala no Firebase” só aparece/funciona para administradores

Tentativas de escrita sem permissão geram erro por segurança

A estrutura foi pensada para crescer por ano, evitando sobrescrita futura

🧩 Próximas Evoluções Planejadas

Bloqueio de edição em anos passados

Logs de auditoria (quem gerou / quando)

Permissão intermediária (editor)

Exportação por ano

Modo simulação sem salvar