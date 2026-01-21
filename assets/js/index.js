// index.js
// 首页订单列表逻辑

class IndexPage {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 12;
        this.currentFilter = {
            type: 'all',
            status: 'pending',
            keyword: ''
        };
        this.isLoading = false;
        this.subscription = null;
    }

    // 初始化
    init() {
        this.loadOrders();
        this.setupEventListeners();
        this.loadStats();
        
        // 实时订阅订单变化
        this.setupRealtimeSubscription();
        
        // 每30秒刷新一次
        setInterval(() => {
            if (!this.isLoading) {
                this.loadOrders();
                this.loadStats();
            }
        }, 30000);
    }

    // 加载订单
    async loadOrders() {
        this.isLoading = true;
        this.showLoading();
        
        try {
            const result = await window.paotuiDB.getOrders(
                this.currentFilter,
                this.currentPage,
                this.pageSize
            );
            
            if (result.success) {
                this.displayOrders(result.data);
                this.updatePagination(result.total);
            } else {
                this.showError('加载订单失败: ' + result.error);
            }
        } catch (error) {
            console.error('加载订单异常:', error);
            this.showError('网络异常，请稍后重试');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    // 显示加载状态
    showLoading() {
        let container = document.getElementById('ordersContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>正在加载订单...</p>
                </div>
            `;
        }
    }

    // 隐藏加载状态
    hideLoading() {
        const loading = document.querySelector('#ordersContainer .loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // 显示订单列表
    displayOrders(orders) {
        const container = document.getElementById('ordersContainer');
        if (!container) return;
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="no-orders">
                    <div class="no-orders-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h3>暂无跑腿需求</h3>
                    <p>快来发布第一个需求吧！</p>
                    <a href="publish.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> 发布需求
                    </a>
                </div>
            `;
            return;
        }
        
        let html = '<div class="orders-grid">';
        
        orders.forEach(order => {
            const statusClass = this.getStatusClass(order.status);
            const statusText = this.getStatusText(order.status);
            const isNew = this.isOrderNew(order.created_at);
            
            html += `
                <div class="order-card" data-order-id="${order.order_id}">
                    ${isNew ? '<div class="badge-new">NEW</div>' : ''}
                    
                    <div class="order-header">
                        <div class="order-id">${order.order_id}</div>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                    
                    <div class="order-type">
                        <i class="${this.getTypeIcon(order.type)}"></i>
                        ${order.type}
                    </div>
                    
                    <div class="order-detail">
                        ${this.truncateText(order.detail, 100)}
                    </div>
                    
                    <div class="order-meta">
                        <div class="order-reward">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>${order.reward}元</span>
                        </div>
                        <div class="order-time">
                            <i class="fas fa-clock"></i>
                            <span>${order.expect_time}</span>
                        </div>
                    </div>
                    
                    <div class="order-footer">
                        <div class="order-info">
                            <span class="order-publisher">
                                <i class="fas fa-user"></i>
                                ${order.publisher_name || '匿名用户'}
                            </span>
                            <span class="order-date">
                                ${window.paotuiCommon.formatTime(order.created_at)}
                            </span>
                        </div>
                        <div class="order-actions">
                            <button class="btn btn-secondary btn-sm" onclick="indexPage.viewOrder('${order.order_id}')">
                                查看详情
                            </button>
                            ${order.status === 'pending' ? `
                                <button class="btn btn-primary btn-sm" onclick="indexPage.takeOrder('${order.order_id}')">
                                    我要接单
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    // 更新分页
    updatePagination(total) {
        const container = document.getElementById('pagination');
        if (!container) return;
        
        const totalPages = Math.ceil(total / this.pageSize);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination-inner">';
        
        // 上一页按钮
        html += `
            <button class="pagination-btn ${this.currentPage <= 1 ? 'disabled' : ''}" 
                    ${this.currentPage > 1 ? `onclick="indexPage.goToPage(${this.currentPage - 1})"` : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // 页码
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="indexPage.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // 下一页按钮
        html += `
            <button class="pagination-btn ${this.currentPage >= totalPages ? 'disabled' : ''}" 
                    ${this.currentPage < totalPages ? `onclick="indexPage.goToPage(${this.currentPage + 1})"` : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        html += '</div>';
        container.innerHTML = html;
    }

    // 跳转到指定页
    goToPage(page) {
        this.currentPage = page;
        this.loadOrders();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 设置事件监听器
    setupEventListeners() {
        // 搜索框
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', window.paotuiCommon.debounce((e) => {
                this.currentFilter.keyword = e.target.value.trim();
                this.currentPage = 1;
                this.loadOrders();
            }, 500));
        }
        
        // 类型筛选
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilter.type = e.target.value;
                this.currentPage = 1;
                this.loadOrders();
            });
        }
        
        // 状态筛选
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilter.status = e.target.value;
                this.currentPage = 1;
                this.loadOrders();
            });
        }
        
        // 排序选择
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                // 这里可以根据排序选项重新加载订单
                // 需要后端支持排序参数
                this.loadOrders();
            });
        }
        
        // 筛选标签
        const filterTags = document.querySelectorAll('.filter-tag');
        filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.currentFilter.type = type === '' ? 'all' : type;
                this.currentPage = 1;
                
                // 更新活动标签
                filterTags.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                this.loadOrders();
            });
        });
        
        // 刷新按钮
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadOrders();
                this.loadStats();
                window.paotuiCommon.showMessage('已刷新', 'success');
            });
        }
    }

    // 加载统计信息
    async loadStats() {
        try {
            const result = await window.paotuiDB.getStats();
            if (result.success) {
                this.updateStats(result.data);
            }
        } catch (error) {
            console.error('加载统计失败:', error);
        }
    }

    // 更新统计显示
    updateStats(stats) {
        const elements = {
            totalOrders: document.getElementById('totalOrders'),
            pendingOrders: document.getElementById('pendingOrders'),
            completedOrders: document.getElementById('completedOrders'),
            totalReward: document.getElementById('totalReward')
        };
        
        if (elements.totalOrders) elements.totalOrders.textContent = stats.totalOrders;
        if (elements.pendingOrders) elements.pendingOrders.textContent = stats.pendingOrders;
        if (elements.completedOrders) elements.completedOrders.textContent = stats.completedOrders;
        if (elements.totalReward) elements.totalReward.textContent = stats.totalReward + '元';
    }

    // 查看订单详情
    viewOrder(orderId) {
        window.location.href = `order-detail.html?id=${orderId}`;
    }

    // 接单
    async takeOrder(orderId) {
        const user = window.paotuiCommon.checkLoginStatus();
        if (!user) {
            window.paotuiCommon.showMessage('请先登录', 'warning');
            window.paotuiCommon.showLoginModal();
            return;
        }
        
        const confirm = window.confirm(`确认接单：${orderId}\n\n接单后，客服会通过微信联系你，为你对接发布者。`);
        if (!confirm) return;
        
        try {
            // 这里应该调用API更新订单状态
            // 暂时模拟接单成功
            window.paotuiCommon.showMessage('接单成功！请添加客服微信：hecaipaotui', 'success');
            
            // 延迟刷新列表
            setTimeout(() => {
                this.loadOrders();
                this.loadStats();
            }, 1000);
            
        } catch (error) {
            window.paotuiCommon.showMessage('接单失败: ' + error.message, 'error');
        }
    }

    // 设置实时订阅
    setupRealtimeSubscription() {
        this.subscription = window.paotuiDB.subscribeToOrders((payload) => {
            // 当订单有变化时，刷新列表
            console.log('订单变化:', payload);
            this.loadOrders();
            this.loadStats();
        });
    }

    // 辅助函数
    getStatusClass(status) {
        const classes = {
            pending: 'status-pending',
            matched: 'status-matched',
            completed: 'status-completed',
            canceled: 'status-canceled'
        };
        return classes[status] || 'status-pending';
    }

    getStatusText(status) {
        const texts = {
            pending: '待接单',
            matched: '已匹配',
            completed: '已完成',
            canceled: '已取消'
        };
        return texts[status] || '待接单';
    }

    getTypeIcon(type) {
        const icons = {
            '取快递': 'fas fa-box',
            '打印资料': 'fas fa-print',
            '食堂代买': 'fas fa-utensils',
            '超市代购': 'fas fa-shopping-cart',
            '送东西': 'fas fa-paper-plane',
            '其他': 'fas fa-ellipsis-h'
        };
        return icons[type] || 'fas fa-question-circle';
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    isOrderNew(timestamp) {
        const orderTime = new Date(timestamp);
        const now = new Date();
        const diffHours = (now - orderTime) / (1000 * 60 * 60);
        return diffHours < 24; // 24小时内为新订单
    }

    showError(message) {
        const container = document.getElementById('ordersContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>加载失败</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="indexPage.loadOrders()">
                        重新加载
                    </button>
                </div>
            `;
        }
    }
}

// 创建全局实例
window.indexPage = new IndexPage();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.indexPage.init();
});