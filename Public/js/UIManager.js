// UIManager.js - Biblioteca de utilitários UI reutilizáveis
class UIUtils {
    constructor() {
        this.animationDuration = 300;
        this.toastContainer = null;
        this.modalStack = [];
    }

    // === UTILITÁRIOS DE DATA ===
    
   _formatarData(dataStr) {
    if (!dataStr) return "-";
    try {
        let date;
        if (typeof dataStr === 'object' && dataStr.seconds) {
            date = new Date(dataStr.seconds * 1000);
        } else if (typeof dataStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
            const [ano, mes, dia] = dataStr.split("-");
            date = new Date(ano, mes - 1, dia); // <-- cria como local
        } else {
            date = new Date(dataStr);
        }
        if (isNaN(date.getTime())) return dataStr;
        return new Intl.DateTimeFormat("pt-BR").format(date);
    } catch {
        return dataStr || "-";
    }
}

    formatDateForInput(dateStr) {
        if (!dateStr) return "";
        
        try {
            let date;
            if (typeof dateStr === 'object' && dateStr.seconds) {
                date = new Date(dateStr.seconds * 1000);
            } else {
                date = new Date(dateStr);
            }
            
            if (isNaN(date.getTime())) return "";
            
            return date.toISOString().split('T')[0];
        } catch (error) {
            return "";
        }
    }

    // === SISTEMA DE TOAST ===
    
    showToast(mensagem, tipo = "info", duration = 4000) {
        this._createToastContainer();
        
        const toast = document.createElement("div");
        toast.className = `toast toast-${tipo}`;
        
        const cores = {
            success: "linear-gradient(135deg, #28a745, #20c997)",
            error: "linear-gradient(135deg, #dc3545, #fd7e14)",
            info: "linear-gradient(135deg, #17a2b8, #6f42c1)",
            warning: "linear-gradient(135deg, #ffc107, #fd7e14)"
        };

        toast.style.cssText = `
            background: ${cores[tipo] || cores.info};
            color: white;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            font-weight: 600;
            max-width: 350px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            backdrop-filter: blur(8px);
            transform: translateX(100%);
            transition: all 0.3s ease;
            opacity: 0;
        `;

        toast.textContent = mensagem;
        this.toastContainer.appendChild(toast);

        // Animação de entrada
        setTimeout(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateX(0)";
        }, 10);

        // Auto-remover
        setTimeout(() => {
            this._removeToast(toast);
        }, duration);

        return toast;
    }

    _createToastContainer() {
        if (this.toastContainer) return;
        
        this.toastContainer = document.createElement("div");
        this.toastContainer.id = "ui-toast-container";
        this.toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(this.toastContainer);
    }

    _removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, this.animationDuration);
    }

    // === SISTEMA DE LOADING ===
    
    showLoading(container, message = "Carregando...") {
        if (!container) return;
        
        const loadingHtml = `
            <div class="ui-loading-overlay">
                <div class="ui-loading-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        container.innerHTML = loadingHtml;
        
        // Adicionar estilos se não existirem
        this._addLoadingStyles();
    }

    hideLoading(container) {
        if (!container) return;
        
        const overlay = container.querySelector('.ui-loading-overlay');
        if (overlay) {
            overlay.style.opacity = "0";
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, this.animationDuration);
        }
    }

    _addLoadingStyles() {
        if (document.getElementById('ui-loading-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'ui-loading-styles';
        styles.textContent = `
            .ui-loading-overlay {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                transition: opacity 0.3s ease;
            }
            
            .ui-loading-content {
                text-align: center;
            }
            
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styles);
    }

    // === SISTEMA DE MODAL ===
    
    openModal(modalElement, options = {}) {
        if (!modalElement) return;
        
        const defaults = {
            closeOnOverlay: true,
            closeOnEscape: true,
            focusFirst: true,
            onOpen: null,
            onClose: null
        };
        
        const config = { ...defaults, ...options };
        
        // Adicionar à pilha de modais
        this.modalStack.push({ element: modalElement, config });
        
        // Configurar modal
        modalElement.style.display = "flex";
        modalElement.style.opacity = "0";
        
        // Adicionar listeners
        if (config.closeOnOverlay) {
            modalElement.addEventListener('click', this._handleModalOverlayClick.bind(this));
        }
        
        if (config.closeOnEscape) {
            document.addEventListener('keydown', this._handleModalEscapeKey.bind(this));
        }
        
        // Animação de abertura
        setTimeout(() => {
            modalElement.style.opacity = "1";
            
            if (config.focusFirst) {
                const firstInput = modalElement.querySelector('input, textarea, select, button');
                if (firstInput) firstInput.focus();
            }
            
            if (config.onOpen) config.onOpen();
        }, 10);
        
        // Prevenir scroll do body
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalElement = null) {
        // Se não especificado, fechar o último modal da pilha
        if (!modalElement && this.modalStack.length > 0) {
            modalElement = this.modalStack[this.modalStack.length - 1].element;
        }
        
        if (!modalElement) return;
        
        // Encontrar configuração do modal
        const modalIndex = this.modalStack.findIndex(item => item.element === modalElement);
        const modalConfig = modalIndex >= 0 ? this.modalStack[modalIndex].config : {};
        
        // Animação de fechamento
        modalElement.style.opacity = "0";
        
        setTimeout(() => {
            modalElement.style.display = "none";
            
            // Remover da pilha
            if (modalIndex >= 0) {
                this.modalStack.splice(modalIndex, 1);
            }
            
            // Restaurar scroll se não há mais modais
            if (this.modalStack.length === 0) {
                document.body.style.overflow = '';
            }
            
            if (modalConfig.onClose) modalConfig.onClose();
            
        }, this.animationDuration);
    }

    _handleModalOverlayClick(event) {
        const modalContent = event.target.closest('.modal-content, .modal-body');
        if (!modalContent) {
            this.closeModal(event.currentTarget);
        }
    }

    _handleModalEscapeKey(event) {
        if (event.key === 'Escape' && this.modalStack.length > 0) {
            this.closeModal();
        }
    }

    // === UTILITÁRIOS DE ESTADO ===
    
    showEmptyState(container, options = {}) {
        const defaults = {
            icon: "📋",
            title: "Nenhum item encontrado",
            message: "Não há dados para exibir",
            actionText: null,
            actionUrl: null,
            actionCallback: null
        };
        
        const config = { ...defaults, ...options };
        
        let actionHtml = '';
        if (config.actionText) {
            if (config.actionUrl) {
                actionHtml = `
                    <a href="${config.actionUrl}" class="btn btn-primary">
                        ${config.actionText}
                    </a>
                `;
            } else if (config.actionCallback) {
                actionHtml = `
                    <button class="btn btn-primary" onclick="(${config.actionCallback.toString()})()">
                        ${config.actionText}
                    </button>
                `;
            }
        }
        
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <div style="font-size: 3em; margin-bottom: 20px;">${config.icon}</div>
                <h3 style="color: #666; margin: 0 0 15px 0;">${config.title}</h3>
                <p style="color: #999; margin: 0 0 20px 0;">${config.message}</p>
                ${actionHtml}
            </div>
        `;
    }

    showError(container, message, options = {}) {
        const defaults = {
            showRetry: true,
            retryCallback: () => location.reload()
        };
        
        const config = { ...defaults, ...options };
        
        const retryHtml = config.showRetry ? `
            <button onclick="(${config.retryCallback.toString()})()" class="btn btn-primary" style="margin-top: 15px;">
                🔄 Tentar Novamente
            </button>
        ` : '';
        
        container.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 40px;">
                <p style="color: #dc3545; margin: 0 0 15px 0; font-size: 1.1em;">❌ ${message}</p>
                ${retryHtml}
            </div>
        `;
    }

    // === UTILITÁRIOS DE ANIMAÇÃO ===
    
    fadeIn(element, duration = 300) {
        element.style.opacity = "0";
        element.style.display = "block";
        
        setTimeout(() => {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = "1";
        }, 10);
    }

    fadeOut(element, duration = 300) {
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = "0";
        
        setTimeout(() => {
            element.style.display = "none";
        }, duration);
    }

    slideDown(element, duration = 300) {
        element.style.height = "0";
        element.style.overflow = "hidden";
        element.style.display = "block";
        
        const targetHeight = element.scrollHeight + "px";
        
        setTimeout(() => {
            element.style.transition = `height ${duration}ms ease`;
            element.style.height = targetHeight;
        }, 10);
        
        setTimeout(() => {
            element.style.height = "auto";
            element.style.overflow = "visible";
        }, duration);
    }

    slideUp(element, duration = 300) {
        element.style.height = element.scrollHeight + "px";
        element.style.overflow = "hidden";
        
        setTimeout(() => {
            element.style.transition = `height ${duration}ms ease`;
            element.style.height = "0";
        }, 10);
        
        setTimeout(() => {
            element.style.display = "none";
        }, duration);
    }

    // === UTILITÁRIOS DE FORMATAÇÃO ===
    
    formatNumber(number, options = {}) {
        const defaults = {
            locale: 'pt-BR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };
        
        const config = { ...defaults, ...options };
        
        return new Intl.NumberFormat(config.locale, {
            minimumFractionDigits: config.minimumFractionDigits,
            maximumFractionDigits: config.maximumFractionDigits
        }).format(number);
    }

    formatCurrency(amount, currency = 'BRL', locale = 'pt-BR') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // === UTILITÁRIOS DE DEBOUNCE ===
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    // === UTILITÁRIOS DE VALIDAÇÃO ===
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateRequired(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    validateForm(formElement, rules = {}) {
        const errors = {};
        
        Object.keys(rules).forEach(fieldName => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            if (!field) return;
            
            const fieldRules = Array.isArray(rules[fieldName]) ? rules[fieldName] : [rules[fieldName]];
            
            fieldRules.forEach(rule => {
                if (rule.required && !this.validateRequired(field.value)) {
                    errors[fieldName] = rule.message || 'Campo obrigatório';
                }
                
                if (rule.email && field.value && !this.validateEmail(field.value)) {
                    errors[fieldName] = rule.message || 'Email inválido';
                }
                
                if (rule.minLength && field.value.length < rule.minLength) {
                    errors[fieldName] = rule.message || `Mínimo ${rule.minLength} caracteres`;
                }
            });
        });
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    }

    // === CLEANUP ===
    
    destroy() {
        // Fechar todos os modais
        this.modalStack.forEach(modal => {
            this.closeModal(modal.element);
        });
        
        // Remover toast container
        if (this.toastContainer && this.toastContainer.parentNode) {
            this.toastContainer.parentNode.removeChild(this.toastContainer);
        }
        
        // Restaurar scroll
        document.body.style.overflow = '';
        
        console.log("UIUtils limpo");
    }
}

// Instância singleton
const uiUtils = new UIUtils();

// Exportar como default e named export para compatibilidade
export default uiUtils;
export { UIUtils, uiUtils };