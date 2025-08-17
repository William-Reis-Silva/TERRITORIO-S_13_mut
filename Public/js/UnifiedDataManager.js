// UnifiedDataManager.js - Sistema unificado usando apenas Firestore (Versão Corrigida)
class UnifiedDataManager {
  constructor() {
    this.firestore = null;
    this.auth = null;
    this.currentUser = null;
    this.userPermissions = null;
    
    // Estado dos dados
    this.registros = [];
    this.territorios = new Map();
    
    // Listeners ativos
    this.unsubscribeRegistros = null;
    this.unsubscribeTerritorios = null;
    
    // Status
    this.isInitialized = false;
    this.isOnline = navigator.onLine;
  }

  // ==================== INICIALIZAÇÃO ====================
  async init() {
    try {
      // Configura Firebase
      this.firestore = firebase.firestore();
      this.auth = firebase.auth();
      
      // Habilita persistência offline
      await this._enableOfflinePersistence();
      
      // Verifica se já tem usuário autenticado
      if (!this.auth.currentUser) {
        // Se não tem usuário, aguarda autenticação
        await this._waitForAuth();
      } else {
        this.currentUser = this.auth.currentUser;
      }
      
      // Carrega permissões do usuário
      await this._loadUserPermissions();
      
      // Inicia listeners em tempo real
      this._startRealtimeListeners();
      
      // Setup handlers de conexão
      this._setupConnectionHandlers();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      return false;
    }
  }

  async _enableOfflinePersistence() {
    try {
      await this.firestore.enablePersistence({
        synchronizeTabs: true // Sincroniza entre abas
      });

    } catch (error) {
      if (error.code === 'failed-precondition') {
        console.warn('⚠️ Persistência não habilitada - múltiplas abas abertas');
      } else if (error.code === 'unimplemented') {
        console.warn('⚠️ Persistência não suportada neste navegador');
      } else {
        console.error('❌ Erro ao habilitar persistência:', error);
      }
    }
  }

  _waitForAuth() {
    return new Promise((resolve, reject) => {
      // Timeout para evitar espera infinita
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Timeout na autenticação'));
      }, 10000); // 10 segundos

      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        clearTimeout(timeout);
        unsubscribe();
        
        if (user) {
          this.currentUser = user;
          resolve(user);
        } else {
          reject(new Error('Usuário não autenticado'));
        }
      });
    });
  }

  async _loadUserPermissions() {
    try {
      if (!this.currentUser) {
        throw new Error('Usuário não definido');
      }

      const userDoc = await this.firestore
        .collection('usuarios')
        .doc(this.currentUser.uid)
        .get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        this.userPermissions = {
          canWrite: userData.writtenPermission === true,
          isAdmin: userData.isAdmin === true,
          username: userData.usuario || userData.displayName || this.currentUser.email?.split('@')[0] || 'Usuário'
        };
      
      } else {
        // Criar documento do usuário com permissões padrão
        const defaultUserData = {
          usuario: this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'Usuário',
          email: this.currentUser.email,
          writtenPermission: false,
          isAdmin: false,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.firestore
          .collection('usuarios')
          .doc(this.currentUser.uid)
          .set(defaultUserData);

        this.userPermissions = {
          canWrite: false,
          isAdmin: false,
          username: defaultUserData.usuario
        };
        
     
      }
    } catch (error) {
      console.error('❌ Erro ao carregar permissões:', error);
      // Permissões de emergência
      this.userPermissions = { 
        canWrite: false, 
        isAdmin: false, 
        username: this.currentUser?.email?.split('@')[0] || 'Usuário' 
      };
    }
  }

  // ==================== LISTENERS EM TEMPO REAL ====================
  _startRealtimeListeners() {
    try {
      // Listener para registros (Últimos 20)
      this.unsubscribeRegistros = this.firestore
        .collection('designacoes')
        .orderBy('dataInicio', 'desc')
        .limit(20)
        .onSnapshot(
          (snapshot) => this._handleRegistrosSnapshot(snapshot),
          (error) => this._handleSnapshotError('registros', error)
        );

      // Listener para territórios
      this.unsubscribeTerritorios = this.firestore
        .collection('territorios')
        .onSnapshot(
          (snapshot) => this._handleTerritoriosSnapshot(snapshot),
          (error) => this._handleSnapshotError('territorios', error)
        );

    } catch (error) {
      console.error('❌ Erro ao iniciar listeners:', error);
    }
  }

  _handleRegistrosSnapshot(snapshot) {
    try {
      const changes = snapshot.docChanges();
      let hasChanges = false;

      changes.forEach(change => {
        const docData = change.doc.data();
        const registro = this._normalizeRegistro(change.doc.id, docData);

        switch (change.type) {
          case 'added':
            this._addRegistro(registro, change.newIndex);
            hasChanges = true;
            break;
          
          case 'modified':
            this._updateRegistro(registro, change.oldIndex, change.newIndex);
            hasChanges = true;
            break;
          
          case 'removed':
            this._removeRegistro(change.doc.id);
            hasChanges = true;
            break;
        }
      });

      if (hasChanges) {
        this._emitEvent('registrosUpdated', {
          total: this.registros.length,
          changes: changes.length,
          source: snapshot.metadata.fromCache ? 'cache' : 'server'
        });
      }
    } catch (error) {
      console.error('❌ Erro ao processar snapshot de registros:', error);
    }
  }

  _handleTerritoriosSnapshot(snapshot) {
    try {
      snapshot.docChanges().forEach(change => {
        const territorio = { id: change.doc.id, ...change.doc.data() };

        switch (change.type) {
          case 'added':
          case 'modified':
            this.territorios.set(territorio.mapa, territorio);
            break;
          
          case 'removed':
            // Encontra e remove pelo ID
            for (const [mapa, terr] of this.territorios.entries()) {
              if (terr.id === change.doc.id) {
                this.territorios.delete(mapa);
                break;
              }
            }
            break;
        }
      });

      this._emitEvent('territoriosUpdated', {
        total: this.territorios.size,
        source: snapshot.metadata.fromCache ? 'cache' : 'server'
      });
    } catch (error) {
      console.error('❌ Erro ao processar snapshot de territórios:', error);
    }
  }

  _handleSnapshotError(type, error) {
    console.error(`❌ Erro no listener de ${type}:`, error);
    this._emitEvent('snapshotError', { type, error: error.message });
  }

  // ==================== OPERAÇÕES CRUD - DESIGNAÇÕES ====================
  async createDesignacao(dados) {
    if (!this.userPermissions?.canWrite) {
      throw new Error('Sem permissão para criar registros');
    }

    try {
      const novoRegistro = {
        mapa: dados.mapa || dados.numeroMapa,
        bairro: dados.bairro || '',
        designadoPara: dados.designadoPara,
        dataInicio: dados.dataInicio,
        dataConclusao: dados.dataConclusao || null,
        status: dados.dataConclusao ? 'concluído' : 'em andamento',
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        criadoPor: this.currentUser.uid
      };

      const docRef = await this.firestore
        .collection('designacoes')
        .add(novoRegistro);

      // Atualiza status do território se existir
      await this._updateTerritorioStatus(novoRegistro.mapa, novoRegistro.status);
      this._emitEvent('designacaoCriada', { id: docRef.id, mapa: novoRegistro.mapa });
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao criar designação:', error);
      throw error;
    }
  }

  async updateDesignacao(id, dadosAtualizados) {
    if (!this.userPermissions?.canWrite) {
      throw new Error('Sem permissão para editar registros');
    }

    try {
      const updates = {
        ...dadosAtualizados,
        status: dadosAtualizados.dataConclusao ? 'concluído' : 'em andamento',
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoPor: this.currentUser.uid
      };

      await this.firestore
        .collection('designacoes')
        .doc(id)
        .update(updates);

      // **FIX PRINCIPAL**: Sempre atualizar status do território quando há mudanças
      const numeroMapa = updates.mapa || dadosAtualizados.mapa;
      if (numeroMapa) {
        await this._updateTerritorioStatus(numeroMapa, updates.status);
      }

      this._emitEvent('designacaoAtualizada', { id, updates });
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar designação:', error);
      throw error;
    }
  }

  async deleteDesignacao(id) {
    if (!this.userPermissions?.canWrite) {
      throw new Error('Sem permissão para deletar registros');
    }

    try {
      const registro = this.registros.find(r => r.id === id);
      
      await this.firestore
        .collection('designacoes')
        .doc(id)
        .delete();

      // Libera território se existir
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

  // ==================== OPERAÇÕES - TERRITÓRIOS (VERSÃO CORRIGIDA) ====================
  getTerritorio(numeroMapa) {
    return this.territorios.get(numeroMapa) || null;
  }

  getAllTerritorios() {
    return Array.from(this.territorios.values());
  }

  async _updateTerritorioStatus(numeroMapa, novoStatus) {
    try {    
      // Primeiro, verificar se o território existe no cache local
      let territorio = this.territorios.get(numeroMapa);
      
      // Se não está no cache, buscar direto no Firestore
      if (!territorio) {        
        const snapshot = await this.firestore
          .collection('territorios')
          .where('mapa', '==', parseInt(numeroMapa)) // Garantir que seja número
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          territorio = { id: doc.id, ...doc.data() };
          // Adicionar ao cache local
          this.territorios.set(numeroMapa, territorio);
        } else {
          console.warn(`⚠️ Território ${numeroMapa} não existe no Firestore`);
          return false;
        }
      }

      // Determinar o status correto do território
      const statusTerritorio = this._determinarStatusTerritorio(novoStatus);
      
      // Verificar se precisa atualizar (evitar escritas desnecessárias)
      if (territorio.status === statusTerritorio) {
        return true;
      }

      // Atualizar no Firestore
      await this.firestore
        .collection('territorios')
        .doc(territorio.id)
        .update({
          status: statusTerritorio,
          ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
        });

      // Atualizar cache local imediatamente
      this.territorios.set(numeroMapa, {
        ...territorio,
        status: statusTerritorio,
        ultimaAtualizacao: new Date()
      });
      return true;

    } catch (error) {
      console.error(`❌ Erro ao atualizar status do território ${numeroMapa}:`, error);

      if (error.code === 'unavailable' || error.message.includes('network')) {
        setTimeout(() => {
          this._updateTerritorioStatus(numeroMapa, novoStatus);
        }, 2000);
      }
      
      return false;
    }
  }

  // **NOVO MÉTODO**: Lógica centralizada para determinar status do território
  _determinarStatusTerritorio(statusDesignacao) {
    switch (statusDesignacao) {
      case 'concluído':
      case 'concluido':
      case 'disponível':
      case 'disponivel':
        return 'disponível';
      
      case 'em andamento':
      case 'em_andamento':
      case 'andamento':
        return 'em andamento';
      
      default:
        console.warn(`⚠️ Status desconhecido: ${statusDesignacao}, usando 'em andamento' como padrão`);
        return 'em andamento';
    }
  }

  // **NOVO MÉTODO**: Sincronizar todos os territórios (útil para manutenção)
  async sincronizarTerritorios() {

    try {
      const designacoes = this.registros;
      const territoriosProcessados = new Set();
      
      for (const designacao of designacoes) {
        if (!territoriosProcessados.has(designacao.mapa)) {
          await this._updateTerritorioStatus(designacao.mapa, designacao.status);
          territoriosProcessados.add(designacao.mapa);
          
          // Pequeno delay para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return true;
      
    } catch (error) {
      console.error('❌ Erro na sincronização de territórios:', error);
      return false;
    }
  }

  // ==================== MANIPULAÇÃO DE DADOS LOCAIS ====================
  _normalizeRegistro(id, firebaseData) {
    return {
      id,
      mapa: firebaseData.mapa || firebaseData.numeroMapa,
      bairro: firebaseData.bairro || 'Desconhecido',
      designadoPara: firebaseData.designadoPara,
      dataInicio: firebaseData.dataInicio,
      dataConclusao: firebaseData.dataConclusao || null,
      status: firebaseData.status || (firebaseData.dataConclusao ? 'concluído' : 'em andamento'),
      criadoEm: firebaseData.criadoEm,
      atualizadoEm: firebaseData.atualizadoEm,
      criadoPor: firebaseData.criadoPor,
      atualizadoPor: firebaseData.atualizadoPor
    };
  }

  _addRegistro(registro, index) {
    // Remove duplicata se existir
    this.registros = this.registros.filter(r => r.id !== registro.id);
    
    // Adiciona na posição correta
    this.registros.splice(index, 0, registro);
    
    // Mantém apenas os 50 mais recentes
    if (this.registros.length > 50) {
      this.registros = this.registros.slice(0, 50);
    }
  }

  _updateRegistro(registro, oldIndex, newIndex) {
    // Remove da posição antiga
    const existingIndex = this.registros.findIndex(r => r.id === registro.id);
    if (existingIndex !== -1) {
      this.registros.splice(existingIndex, 1);
    }
    
    // Adiciona na nova posição
    this.registros.splice(newIndex, 0, registro);
  }

  _removeRegistro(id) {
    this.registros = this.registros.filter(r => r.id !== id);
  }

  // ==================== UTILITÁRIOS ====================
  _setupConnectionHandlers() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this._emitEvent('connectionRestored');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this._emitEvent('connectionLost');
    });
  }

  _emitEvent(eventName, data = {}) {
    const event = new CustomEvent(`unified:${eventName}`, {
      detail: { ...data, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  // ==================== GETTERS PÚBLICOS ====================
  get data() {
    return [...this.registros];
  }

  get permissions() {
    return { ...this.userPermissions };
  }

  get stats() {
    const emAndamento = this.registros.filter(r => !r.dataConclusao).length;
    const concluidos = this.registros.filter(r => r.dataConclusao).length;
    
    return {
      total: this.registros.length,
      emAndamento,
      concluidos,
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

  // ==================== MÉTODOS DE DEBUG ====================
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
    const data = {
      registros: this.registros,
      territorios: Array.from(this.territorios.values()),
      exportedAt: new Date().toISOString(),
      user: this.currentUser?.email || 'desconhecido'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `designacoes_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
 
  }

  // ==================== CLEANUP ====================
  destroy() {
    // Para listeners
    if (this.unsubscribeRegistros) {
      this.unsubscribeRegistros();
      this.unsubscribeRegistros = null;
    }
    
    if (this.unsubscribeTerritorios) {
      this.unsubscribeTerritorios();
      this.unsubscribeTerritorios = null;
    }
    
    // Limpa dados
    this.registros = [];
    this.territorios.clear();
    this.isInitialized = false;
    
  }
}

// Cria e exporta instância única
const unifiedDataManager = new UnifiedDataManager();
window.unifiedDataManager = unifiedDataManager; // Para debug

export default unifiedDataManager;