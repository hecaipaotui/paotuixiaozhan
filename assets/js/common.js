// common.js
// 公共工具函数

class PaoTuiCommon {
    constructor() {
        this.config = {
            version: '1.0.0',
            siteName: '河财跑腿小站',
            contactWechat: 'hecaipaotui',
            contactPhone: '请添加客服微信咨询'
        };
    }

    // 初始化
    init() {
        this.bindEvents();
        this.checkLoginStatus();
        this.loadConfig();
    }

    // 绑定事件
    bindEvents() {
        // 导航栏登录按钮
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginModal();
            });
        }

        // 关闭模态框
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || 
                e.target.classList.contains('close-modal')) {
                this.hideModal(e.target.closest('.modal'));
            }
        });

        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (modal.style.display === 'flex') {
                        this.hideModal(modal);
                    }
                });
            }
        });
    }

    // 检查登录状态
    checkLoginStatus() {
        // 从localStorage获取用户信息
        const userInfo = localStorage.getItem('paotui_user');
        if (userInfo) {
            try {
                const user = JSON.parse(userInfo);
                this.updateLoginUI(user);
                return user;
            } catch (e) {
                console.warn('用户信息解析失败:', e);
            }
        }
        return null;
    }

    // 更新登录UI
    updateLoginUI(user) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            if (user) {
                loginBtn.innerHTML = `
                    <i class="fas fa-user"></i> ${user.name || '用户'}
                `;
                loginBtn.onclick = () => this.showUserMenu();
            } else {
                loginBtn.innerHTML = `
                    <i class="fas fa-sign-in-alt"></i> 登录
                `;
                loginBtn.onclick = () => this.showLoginModal();
            }
        }
    }

    // 显示登录模态框
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            this.createLoginModal();
        }
    }

    // 创建登录模态框
    createLoginModal() {
        const modalHTML = `
            <div class="modal" id="loginModal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2><i class="fas fa-sign-in-alt"></i> 登录</h2>
                    <div class="login-options">
                        <div class="login-option wechat-login" onclick="paotuiCommon.loginWithWechat()">
                            <i class="fab fa-weixin"></i>
                            <span>微信登录</span>
                        </div>
                        <div class="login-option phone-login" onclick="paotuiCommon.showPhoneLogin()">
                            <i class="fas fa-phone"></i>
                            <span>手机号登录</span>
                        </div>
                        <div class="login-option guest-login" onclick="paotuiCommon.loginAsGuest()">
                            <i class="fas fa-user-clock"></i>
                            <span>游客模式</span>
                        </div>
                    </div>
                    <div id="phoneLoginForm" style="display: none; margin-top: 20px;">
                        <input type="tel" id="phoneNumber" placeholder="请输入手机号" class="form-input">
                        <input type="text" id="phoneCode" placeholder="请输入验证码" class="form-input" style="margin-top: 10px;">
                        <button class="btn btn-secondary" onclick="paotuiCommon.sendPhoneCode()" style="margin-top: 10px;">
                            发送验证码
                        </button>
                        <button class="btn btn-primary" onclick="paotuiCommon.loginWithPhone()" style="margin-top: 10px;">
                            登录
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 隐藏模态框
    hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 微信登录（模拟）
    loginWithWechat() {
        const userInfo = {
            id: 'wechat_' + Date.now(),
            name: '微信用户',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=微信用户',
            loginType: 'wechat',
            loginTime: new Date().toISOString()
        };
        
        this.saveUserInfo(userInfo);
        this.updateLoginUI(userInfo);
        this.hideModal(document.getElementById('loginModal'));
        this.showMessage('微信登录成功！', 'success');
    }

    // 游客登录
    loginAsGuest() {
        const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
        const userInfo = {
            id: guestId,
            name: '游客用户',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=游客',
            loginType: 'guest',
            loginTime: new Date().toISOString()
        };
        
        this.saveUserInfo(userInfo);
        this.updateLoginUI(userInfo);
        this.hideModal(document.getElementById('loginModal'));
        this.showMessage('游客模式登录成功！', 'success');
    }

    // 显示手机登录表单
    showPhoneLogin() {
        const form = document.getElementById('phoneLoginForm');
        if (form) {
            form.style.display = 'block';
        }
    }

    // 发送验证码
    sendPhoneCode() {
        const phone = document.getElementById('phoneNumber').value;
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            this.showMessage('请输入正确的手机号', 'error');
            return;
        }
        
        // 这里应该调用后端API发送验证码
        this.showMessage('验证码已发送到您的手机', 'success');
    }

    // 手机号登录
    loginWithPhone() {
        const phone = document.getElementById('phoneNumber').value;
        const code = document.getElementById('phoneCode').value;
        
        if (!phone || !code) {
            this.showMessage('请输入手机号和验证码', 'error');
            return;
        }
        
        // 这里应该验证验证码
        const userInfo = {
            id: 'phone_' + phone,
            name: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
            phone: phone,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone,
            loginType: 'phone',
            loginTime: new Date().toISOString()
        };
        
        this.saveUserInfo(userInfo);
        this.updateLoginUI(userInfo);
        this.hideModal(document.getElementById('loginModal'));
        this.showMessage('手机号登录成功！', 'success');
    }

    // 保存用户信息
    saveUserInfo(userInfo) {
        localStorage.setItem('paotui_user', JSON.stringify(userInfo));
        window.paotuiDB.currentUser = userInfo;
    }

    // 显示用户菜单
    showUserMenu() {
        const user = this.checkLoginStatus();
        if (!user) return;
        
        const menuHTML = `
            <div class="user-menu-modal modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <div class="user-info">
                        <img src="${user.avatar}" alt="头像" class="user-avatar">
                        <h3>${user.name}</h3>
                        <p>${user.loginType === 'phone' ? user.phone : '微信用户'}</p>
                    </div>
                    <div class="user-actions">
                        <a href="my-orders.html" class="user-action">
                            <i class="fas fa-list"></i> 我的订单
                        </a>
                        <a href="#" class="user-action" onclick="paotuiCommon.editProfile()">
                            <i class="fas fa-edit"></i> 编辑资料
                        </a>
                        <a href="#" class="user-action" onclick="paotuiCommon.logout()">
                            <i class="fas fa-sign-out-alt"></i> 退出登录
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的菜单
        const existingMenu = document.querySelector('.user-menu-modal');
        if (existingMenu) existingMenu.remove();
        
        document.body.insertAdjacentHTML('beforeend', menuHTML);
        document.querySelector('.user-menu-modal').style.display = 'flex';
    }

    // 编辑资料
    editProfile() {
        this.showMessage('编辑资料功能开发中', 'info');
    }

    // 退出登录
    logout() {
        localStorage.removeItem('paotui_user');
        window.paotuiDB.currentUser = null;
        this.updateLoginUI(null);
        this.hideModal(document.querySelector('.user-menu-modal'));
        this.showMessage('已退出登录', 'success');
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const types = {
            success: { bg: '#52c41a', icon: '✓' },
            error: { bg: '#ff4d4f', icon: '✗' },
            warning: { bg: '#faad14', icon: '⚠' },
            info: { bg: '#1890ff', icon: 'ℹ' }
        };
        
        const { bg, icon } = types[type] || types.info;
        
        // 移除已存在的消息
        const existingMsg = document.querySelector('.app-message');
        if (existingMsg) existingMsg.remove();
        
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = 'app-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bg};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;
        
        messageEl.innerHTML = `
            <span class="message-icon">${icon}</span>
            <span class="message-text">${message}</span>
        `;
        
        document.body.appendChild(messageEl);
        
        // 3秒后移除
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    // 加载配置
    loadConfig() {
        // 可以从本地存储或API加载配置
        return this.config;
    }

    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // 如果是今天
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 一周内
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days}天前`;
        }
        
        // 显示完整日期
        return date.toLocaleDateString('zh-CN');
    }

    // 复制到剪贴板
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showMessage('已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            this.showMessage('复制失败，请手动复制', 'error');
        });
    }

    // 分享订单
    shareOrder(orderId) {
        const url = `${window.location.origin}/order-detail.html?id=${orderId}`;
        const text = `我在河财跑腿小站发布了一个需求，订单号：${orderId}，快来帮我看看吧！`;
        
        if (navigator.share) {
            navigator.share({
                title: '河财跑腿小站订单',
                text: text,
                url: url
            }).catch(err => {
                console.log('分享失败:', err);
                this.copyToClipboard(text + '\n' + url);
            });
        } else {
            this.copyToClipboard(text + '\n' + url);
        }
    }

    // 防抖函数
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

    // 节流函数
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
        };
    }
}

// 创建全局实例
window.paotuiCommon = new PaoTuiCommon();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.paotuiCommon.init();
});

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);