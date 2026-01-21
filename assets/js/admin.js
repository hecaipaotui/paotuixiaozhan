// admin.js - 管理后台功能

class AdminDashboard {
    constructor() {
        this.supabase = window.supabase.createClient(
            'https://zmtgvjulvnzwcnfjmaxo.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdGd2anVsdm56d2NuZmptYXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjEzOTUsImV4cCI6MjA4NDUzNzM5NX0.vUoSSSYnn81T6SthfcKz0UT7cq5cHHEDX1NPDnnPDkU'
        );
    }

    // 初始化
    async init() {
        await this.loadDashboardStats();
        await this.loadRecentOrders();
        this.setupEventListeners();
    }

    // 加载仪表板统计数据
    async loadDashboardStats() {
        try {
            // 总订单数
            const { count: totalOrders, error: totalError } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true });
            
            if (totalError) throw totalError;

            // 待接单数
            const { count: pendingOrders, error: pendingError } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            if (pendingError) throw pendingError;

            // 今日新增订单
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count: todayOrders, error: todayError } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            if (todayError) throw todayError;

            // 更新UI
            document.getElementById('statTotalOrders').textContent = totalOrders || '0';
            document.getElementById('statPendingOrders').textContent = pendingOrders || '0';
            document.getElementById('statTodayOrders').textContent = todayOrders || '0';

        } catch (error) {
            console.error('加载统计数据失败:', error);
            document.getElementById('adminOrdersList').innerHTML = 
                `<p class="error">加载数据失败: ${error.message}</p>`;
        }
    }

    // 加载最近订单
    async loadRecentOrders() {
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;

            const container = document.getElementById('adminOrdersList');
            
            if (!data || data.length === 0) {
                container.innerHTML = '<p class="empty">暂无订单数据</p>';
                return;
            }

            let html = `
                <div class="orders-table">
                    <div class="table-header">
                        <div>订单号</div>
                        <div>类型</div>
                        <div>状态</div>
                        <div>报酬</div>
                        <div>发布时间</div>
                        <div>操作</div>
                    </div>
            `;
            
            data.forEach(order => {
                const rewardYuan = (order.reward / 100).toFixed(2);
                const statusClass = this.getStatusClass(order.status);
                const statusText = this.getStatusText(order.status);
                const createdDate = new Date(order.created_at).toLocaleString('zh-CN');
                
                html += `
                    <div class="table-row">
                        <div class="order-id">${order.order_id}</div>
                        <div class="order-type">${order.type}</div>
                        <div class="order-status ${statusClass}">${statusText}</div>
                        <div class="order-reward">${rewardYuan}元</div>
                        <div class="order-time">${createdDate}</div>
                        <div class="order-actions">
                            <button class="btn btn-sm btn-info" onclick="adminDashboard.viewOrder('${order.order_id}')">
                                查看
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="adminDashboard.editOrder('${order.order_id}')">
                                编辑
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('加载最近订单失败:', error);
            document.getElementById('adminOrdersList').innerHTML = 
                `<p class="error">加载订单失败: ${error.message}</p>`;
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刷新中...';
                refreshBtn.disabled = true;
                
                await this.loadDashboardStats();
                await this.loadRecentOrders();
                
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新';
                refreshBtn.disabled = false;
                
                this.showMessage('数据已刷新', 'success');
            });
        }

        // 搜索功能
        const searchInput = document.getElementById('adminSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchOrders(e.target.value);
            });
        }

        // 状态筛选
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterByStatus(e.target.value);
            });
        }
    }

    // 搜索订单
    async searchOrders(keyword) {
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*')
                .or(`order_id.ilike.%${keyword}%,detail.ilike.%${keyword}%,publisher_wechat.ilike.%${keyword}%`)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            
            this.displaySearchResults(data);

        } catch (error) {
            console.error('搜索失败:', error);
            this.showMessage('搜索失败: ' + error.message, 'error');
        }
    }

    // 显示搜索结果
    displaySearchResults(orders) {
        const container = document.getElementById('adminOrdersList');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p class="empty">未找到匹配的订单</p>';
            return;
        }

        let html = `
            <div class="search-results">
                <h3>搜索结果 (${orders.length}条)</h3>
                <div class="orders-table">
                    <div class="table-header">
                        <div>订单号</div>
                        <div>类型</div>
                        <div>状态</div>
                        <div>报酬</div>
                        <div>联系方式</div>
                    </div>
        `;
        
        orders.forEach(order => {
            const rewardYuan = (order.reward / 100).toFixed(2);
            const statusClass = this.getStatusClass(order.status);
            const statusText = this.getStatusText(order.status);
            const contact = order.publisher_wechat || order.publisher_phone || '未提供';
            
            html += `
                <div class="table-row">
                    <div class="order-id">${order.order_id}</div>
                    <div class="order-type">${order.type}</div>
                    <div class="order-status ${statusClass}">${statusText}</div>
                    <div class="order-reward">${rewardYuan}元</div>
                    <div class="order-contact">${contact}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    // 按状态筛选
    async filterByStatus(status) {
        try {
            let query = this.supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (status !== 'all') {
                query = query.eq('status', status);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            this.displayFilteredResults(data, status);

        } catch (error) {
            console.error('筛选失败:', error);
            this.showMessage('筛选失败: ' + error.message, 'error');
        }
    }

    // 显示筛选结果
    displayFilteredResults(orders, status) {
        const container = document.getElementById('adminOrdersList');
        
        const statusText = status === 'all' ? '全部' : this.getStatusText(status);
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `<p class="empty">${statusText}订单暂无数据</p>`;
            return;
        }

        let html = `
            <div class="filtered-results">
                <h3>${statusText}订单 (${orders.length}条)</h3>
                <div class="orders-table">
                    <div class="table-header">
                        <div>订单号</div>
                        <div>类型</div>
                        <div>详细描述</div>
                        <div>报酬</div>
                        <div>期望时间</div>
                    </div>
        `;
        
        orders.forEach(order => {
            const rewardYuan = (order.reward / 100).toFixed(2);
            const detail = order.detail.length > 30 ? 
                order.detail.substring(0, 30) + '...' : 
                order.detail;
            
            html += `
                <div class="table-row">
                    <div class="order-id">${order.order_id}</div>
                    <div class="order-type">${order.type}</div>
                    <div class="order-detail" title="${order.detail}">${detail}</div>
                    <div class="order-reward">${rewardYuan}元</div>
                    <div class="order-expect">${order.expect_time}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    // 查看订单
    viewOrder(orderId) {
        // 在新窗口打开订单详情
        window.open(`order-detail.html?id=${orderId}`, '_blank');
    }

    // 编辑订单
    editOrder(orderId) {
        // 这里可以实现编辑功能
        // 暂时显示消息
        this.showMessage(`编辑订单 ${orderId}（功能开发中）`, 'info');
    }

    // 辅助函数
    getStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'matched': 'status-matched',
            'completed': 'status-completed',
            'canceled': 'status-canceled'
        };
        return classes[status] || 'status-pending';
    }

    getStatusText(status) {
        const texts = {
            'pending': '待接单',
            'matched': '已接单',
            'completed': '已完成',
            'canceled': '已取消'
        };
        return texts[status] || status;
    }

    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `admin-message admin-message-${type}`;
        messageEl.innerHTML = `
            <span>${message}</span>
            <button class="close-btn" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // 添加到页面顶部
        const container = document.querySelector('.admin-container .container');
        container.insertBefore(messageEl, container.firstChild);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 3000);
    }
}

// 创建全局实例
window.adminDashboard = new AdminDashboard();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard.init();
});