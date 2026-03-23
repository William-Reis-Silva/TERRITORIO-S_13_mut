// UnifiedDataManager.js - Sistema unificado usando Supabase
class UnifiedDataManager {
  constructor() {
    this.supabase = null;
    this.auth = null;
    this.currentUser = null;
    this.userPermissions = null;
    
    // Estado dos dados
    this.registros = [];
    this.territorios = new Map();
    
    // Canais ativos (Realtime)
    this.channelRegistros = null;
    this.channelTerritorios = null;
    
    // Status
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
    this.congregacaoId = null;
  }

  _getQuery(tableName) {
    const tenantId = this.congregacaoId || window.currentCongregacaoId;
    let query = this.supabase.from(tableName).select('*');
    if (tenantId) {
      query = query.eq('congregacao_id', tenantId);
    }
    return query;
  }

  setActiveCongregacaoId(congregacaoId) {
    this.congregacaoId = congregacaoId?.toString() || null;
    if (window.setCongregacaoId) {
      window.setCongregacaoId(this.congregacaoId);
    }
  }

  async init() {
    try {
      if (!window.supabaseClient) {
        throw new Error("Supabase Client não inicializado");
      }
      this.supabase = window.supabaseClient;
      this.auth = this.supabase.auth;

      const { data: { user } } = await this.auth.getUser();
      
      if (!user) {
        await this._waitForAuth();
      } else {
        this.currentUser = user;
      }

      await this._loadUserPermissions();
      this._startRealtimeListeners();
      this._setupConnectionHandlers();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      return false;
    }
  }

  _waitForAuth() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        authListener.data.subscription.unsubscribe();
        reject(new Error('Timeout na autenticação'));
      }, 10000);

      const authListener = this.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          clearTimeout(timeout);
          authListener.data.subscription.unsubscribe();
          this.currentUser = session.user;
          resolve(session.user);
        }
      });
    });
  }

  async _loadUserPermissions() {
    try {
      if (!this.currentUser) throw new Error('Usuário não definido');

      const { data: userDoc, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();

      if (!error && userDoc) {
        const selectedCongregacao = userDoc.congregacao_id;

        if (selectedCongregacao) {
          this.setActiveCongregacaoId(selectedCongregacao);
        }

        const isAdminValue = userDoc.is_admin === true;
        const permissoes = userDoc.permissoes || {};
        const canWriteValue = permissoes.canWrite === true;

        this.userPermissions = {
          canWrite: canWriteValue,
          isAdmin: isAdminValue,
          username: userDoc.nome || this.currentUser.email?.split('@')[0] || 'Usuário',
          congregacaoId: selectedCongregacao,
          congregacoes: [selectedCongregacao].filter(Boolean)
        };
      } else {
        // Fallback or handle later via RPC on user creation
        this.userPermissions = {
          canWrite: false,
          isAdmin: false,
          username: this.currentUser.email?.split('@')[0] || 'Usuário'
        };
      }
    } catch (error) {
      console.error('❌ Erro ao carregar permissões:', error);
      this.userPermissions = { canWrite: false, isAdmin: false, username: 'Usuário' };
    }
  }

  // ==================== LISTENERS EM TEMPO REAL ====================
  async _loadInitialData() {
    // Registros
    let queryReq = this.supabase.from('designacoes').select('*').order('data_inicio', { ascending: false }).limit(200);
    const tId = this.congregacaoId || window.currentCongregacaoId;
    if (tId) queryReq = queryReq.eq('congregacao_id', tId);

    const { data: desigData } = await queryReq;
    if (desigData) {
      this.registros = desigData.map(r => this._normalizeRegistro(r.id, r));
      this._emitEvent('registrosUpdated', { total: this.registros.length });
    }

    // Territorios
    let queryTerr = this.supabase.from('territorios').select('*');
    if (tId) queryTerr = queryTerr.eq('congregacao_id', tId);
    const { data: terrData } = await queryTerr;
    if (terrData) {
      terrData.forEach(t => this.territorios.set(t.numero, { id: t.id, mapa: t.numero, status: t.status, bairro: t.bairro }));
      this._emitEvent('territoriosUpdated', { total: this.territorios.size });
    }
  }

  _startRealtimeListeners() {
    try {
      const tenantId = this.congregacaoId || window.currentCongregacaoId;
      const filter = tenantId ? `congregacao_id=eq.${tenantId}` : undefined;

      this._loadInitialData();

      // Listener para registros
      this.channelRegistros = this.supabase.channel('public:designacoes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'designacoes', filter }, payload => {
          this._handleRealtimeChange('designacoes', payload);
        })
        .subscribe();

      // Listener para territorios
      this.channelTerritorios = this.supabase.channel('public:territorios')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'territorios', filter }, payload => {
          this._handleRealtimeChange('territorios', payload);
        })
        .subscribe();

    } catch (error) {
      console.error('❌ Erro ao iniciar listeners:', error);
    }
  }

  _handleRealtimeChange(table, payload) {
    if (table === 'designacoes') {
      const data = payload.new || payload.old;
      const id = data?.id;
      if (!id) return;

      if (payload.eventType === 'INSERT') {
        const registro = this._normalizeRegistro(id, payload.new);
        this._addRegistro(registro, 0);
      } else if (payload.eventType === 'UPDATE') {
        const registro = this._normalizeRegistro(id, payload.new);
        this._updateRegistro(registro);
      } else if (payload.eventType === 'DELETE') {
        this._removeRegistro(payload.old.id);
      }
      this._emitEvent('registrosUpdated', { total: this.registros.length });
    } 
    else if (table === 'territorios') {
      const data = payload.new || payload.old;
      const numeroMapa = data?.numero;
      if (!numeroMapa) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        this.territorios.set(numeroMapa, { id: data.id, mapa: data.numero, status: data.status, bairro: data.bairro });
      } else if (payload.eventType === 'DELETE') {
        this.territorios.delete(numeroMapa);
      }
      this._emitEvent('territoriosUpdated', { total: this.territorios.size });
    }
  }

  // ==================== OPERAÇÕES CRUD - DESIGNAÇÕES ====================
  async createDesignacao(dados) {
    if (!this.userPermissions?.canWrite) throw new Error('Sem permissão para criar registros');

    try {
      const { data, error } = await this.supabase.from('designacoes').insert([{
        mapa: dados.mapa || dados.numeroMapa,
        bairro: dados.bairro || '',
        designado_para: dados.designadoPara,
        data_inicio: dados.dataInicio,
        data_conclusao: dados.dataConclusao || null,
        status: dados.dataConclusao ? 'concluído' : 'em andamento',
        congregacao_id: this.congregacaoId || window.currentCongregacaoId
      }]).select().single();

      if (error) throw error;

      await this._updateTerritorioStatus(data.mapa, data.status);
      this._emitEvent('designacaoCriada', { id: data.id, mapa: data.mapa });
      return data.id;
    } catch (error) {
      console.error('❌ Erro ao criar designação:', error);
      throw error;
    }
  }

  async updateDesignacao(id, dadosAtualizados) {
    if (!this.userPermissions?.canWrite) throw new Error('Sem permissão para editar registros');

    try {
      const updates = {
        mapa: dadosAtualizados.mapa,
        bairro: dadosAtualizados.bairro,
        designado_para: dadosAtualizados.designadoPara,
        data_inicio: dadosAtualizados.dataInicio,
        data_conclusao: dadosAtualizados.dataConclusao || null,
        status: dadosAtualizados.dataConclusao ? 'concluído' : 'em andamento',
      };
      
      // Limpa undefined
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      const { data, error } = await this.supabase.from('designacoes')
        .update(updates)
        .eq('id', id)
        .select().single();

      if (error) throw error;

      const numeroMapa = updates.mapa || dadosAtualizados.mapa;
      if (numeroMapa) {
        await this._updateTerritorioStatus(numeroMapa, updates.status || data.status);
      }

      this._emitEvent('designacaoAtualizada', { id, updates });
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar designação:', error);
      throw error;
    }
  }

  async deleteDesignacao(id) {
    if (!this.userPermissions?.canWrite) throw new Error('Sem permissão para deletar registros');

    try {
      const registro = this.registros.find(r => r.id === id);
      const { error } = await this.supabase.from('designacoes').delete().eq('id', id);
      if (error) throw error;

      if (registro) {
        await this._updateTerritorioStatus(registro.mapa, 'disponível');
      }
      this._emitEvent('designacaoDeletada', { id, mapa: registro?.mapa });
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar designação:', error);
      throw error;
    }
  }

  // ==================== OPERAÇÕES - TERRITÓRIOS ====================
  getTerritorio(numeroMapa) {
    return this.territorios.get(numeroMapa) || null;
  }

  getAllTerritorios() {
    return Array.from(this.territorios.values());
  }

  async _updateTerritorioStatus(numeroMapa, novoStatus) {
    try {    
      let territorio = this.territorios.get(numeroMapa);
      
      if (!territorio) {        
        let query = this.supabase.from('territorios').select('*').eq('numero', parseInt(numeroMapa)).limit(1);
        const tId = this.congregacaoId || window.currentCongregacaoId;
        if (tId) query = query.eq('congregacao_id', tId);

        const { data } = await query;
        if (data && data.length > 0) {
          territorio = { id: data[0].id, mapa: data[0].numero, status: data[0].status };
          this.territorios.set(numeroMapa, territorio);
        } else {
          console.warn(`⚠️ Território ${numeroMapa} não existe no Supabase`);
          return false;
        }
      }

      const statusTerritorio = this._determinarStatusTerritorio(novoStatus);
      if (territorio.status === statusTerritorio) return true;

      await this.supabase.from('territorios').update({ status: statusTerritorio }).eq('id', territorio.id);

      this.territorios.set(numeroMapa, { ...territorio, status: statusTerritorio });
      return true;

    } catch (error) {
      console.error(`❌ Erro ao atualizar status do território ${numeroMapa}:`, error);
      return false;
    }
  }

  _determinarStatusTerritorio(statusDesignacao) {
    switch (statusDesignacao) {
      case 'concluído':
      case 'concluido':
        return 'concluído';
      case 'disponível':
      case 'disponivel':
        return 'disponível';
      case 'em andamento':
      case 'em_andamento':
      case 'andamento':
        return 'em andamento';
      default:
        return 'em andamento';
    }
  }

  // ==================== MANIPULAÇÃO DE DADOS LOCAIS ====================
  _normalizeRegistro(id, dbData) {
    return {
      id,
      mapa: dbData.mapa,
      bairro: dbData.bairro,
      designadoPara: dbData.designado_para,
      dataInicio: dbData.data_inicio,
      dataConclusao: dbData.data_conclusao,
      status: dbData.status,
      criadoEm: dbData.created_at
    };
  }

  _addRegistro(registro, index) {
    this.registros = this.registros.filter(r => r.id !== registro.id);
    this.registros.splice(index, 0, registro);
    if (this.registros.length > 200) this.registros = this.registros.slice(0, 200);
  }

  _updateRegistro(registro) {
    const existingIndex = this.registros.findIndex(r => r.id === registro.id);
    if (existingIndex !== -1) {
      this.registros[existingIndex] = registro;
    }
  }

  _removeRegistro(id) {
    this.registros = this.registros.filter(r => r.id !== id);
  }

  // ==================== UTILITÁRIOS ====================
  _setupConnectionHandlers() {
    window.addEventListener('online', () => { this.isOnline = true; this._emitEvent('connectionRestored'); });
    window.addEventListener('offline', () => { this.isOnline = false; this._emitEvent('connectionLost'); });
  }

  _emitEvent(eventName, data = {}) {
    const event = new CustomEvent(`unified:${eventName}`, { detail: { ...data, timestamp: Date.now() } });
    window.dispatchEvent(event);
  }

  // ==================== GETTERS PÚBLICOS ====================
  get data() { return [...this.registros]; }
  get permissions() { return { ...this.userPermissions }; }
  get stats() {
    return {
      total: this.registros.length,
      emAndamento: this.registros.filter(r => !r.dataConclusao).length,
      concluidos: this.registros.filter(r => r.dataConclusao).length,
      isOnline: this.isOnline,
      isInitialized: this.isInitialized
    };
  }
  get connectionStatus() {
    return {
      isOnline: this.isOnline,
      isInitialized: this.isInitialized,
      hasUser: !!this.currentUser,
      canWrite: this.userPermissions?.canWrite || false
    };
  }

  debugInfo() {
    return {
      user: this.currentUser?.email || 'não autenticado',
      registros: this.registros.length,
      territorios: this.territorios.size,
      permissions: this.userPermissions,
      status: this.connectionStatus,
      stats: this.stats
    };
  }

  exportData() {
    // Retido p/ compatibilidade
  }

  destroy() {
    if (this.channelRegistros) this.supabase.removeChannel(this.channelRegistros);
    if (this.channelTerritorios) this.supabase.removeChannel(this.channelTerritorios);
    this.registros = [];
    this.territorios.clear();
    this.isInitialized = false;
  }
}

const unifiedDataManager = new UnifiedDataManager();
window.unifiedDataManager = unifiedDataManager;
export default unifiedDataManager;