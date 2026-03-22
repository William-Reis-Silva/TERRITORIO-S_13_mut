const supabaseUrl = 'https://uadexsqogjspxbirhzee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZGV4c3FvZ2pzcHhiaXJoemVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjM5MzksImV4cCI6MjA4OTU5OTkzOX0.dUzJnhXSfkXgeuASy5WtrrKe7Hab8ZQZQyPtorjSBmI';

// Initialize Supabase client
const clienteSupa = window.supabase.createClient(supabaseUrl, supabaseKey);

// Global references for easy access if needed (similar to old Firebase setup)
window.supabaseClient = clienteSupa;
window.currentCongregacaoId = null;

// Multi-tenant helper function: retorna query já filtrada pela congregação ativa (defesa dupla ao RLS)
window.getTenantQuery = (tableName) => {
  const tenantId = window.currentCongregacaoId;
  if (!tenantId) {
    console.error("ERRO: Tentativa de acessar dados sem congregacaoId logado.");
    throw new Error("Usuário não está associado a uma congregação");
  }
  return clienteSupa.from(tableName).select('*').eq('congregacao_id', tenantId);
};

window.setCongregacaoId = (id) => {
    window.currentCongregacaoId = id;
    console.log("🏢 ID da Congregação definido globalmente:", id);
};
