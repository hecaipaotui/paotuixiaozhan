// 发布页面逻辑
// 重要！请将以下两个值替换成你自己的Supabase项目信息
const SUPABASE_URL = 'https://zmtgvjulvnzwcnfjmaxo.supabase.co'; // 替换为你的URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdGd2anVsdm56d2NuZmptYXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjEzOTUsImV4cCI6MjA4NDUzNzM5NX0.vUoSSSYnn81T6SthfcKz0UT7cq5cHHEDX1NPDnnPDkU'; // 替换为你的 anon public 密钥

// 初始化Supabase客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    console.log('发布页面加载完成');
    initPublishPage();
});

function initPublishPage() {
    // 1. 初始化时间选择按钮
    initTimeOptions();
    
    // 2. 绑定表单提交事件
    const form = document.getElementById('publishForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // 3. 简单联系方式的记忆功能（示例）
    loadLastContact();
}

// 初始化时间选择按钮
function initTimeOptions() {
    const options = document.querySelectorAll('.time-option');
    const customTimeInput = document.getElementById('customTime');
    const expectTimeInput = document.getElementById('expectTime');
    
    options.forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选项的active类
            options.forEach(opt => opt.classList.remove('active'));
            // 给当前点击的选项添加active类
            this.classList.add('active');
            
            const timeValue = this.getAttribute('data-time');
            
            if (timeValue === '自定义') {
                // 显示自定义输入框
                customTimeInput.style.display = 'block';
                customTimeInput.focus();
                expectTimeInput.value = '';
            } else {
                // 隐藏自定义输入框，设置期望时间
                customTimeInput.style.display = 'none';
                expectTimeInput.value = timeValue;
            }
        });
    });
    
    // 监听自定义输入框的变化
    if (customTimeInput) {
        customTimeInput.addEventListener('input', function() {
            expectTimeInput.value = this.value;
        });
    }
}

// 处理表单提交
async function handleFormSubmit(event) {
    event.preventDefault(); // 阻止表单默认提交行为
    console.log('开始处理表单提交...');
    
    // 收集表单数据
    const formData = collectFormData();
    
    // 验证表单数据
    if (!validateFormData(formData)) {
        return;
    }
    
    // 显示加载状态（可以在这里添加一个加载动画）
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发布中...';
    submitBtn.disabled = true;
    
    try {
        // 调用函数将数据保存到Supabase
        const result = await saveOrderToSupabase(formData);
        
        if (result.success) {
            // 保存成功
            alert(`发布成功！\n\n您的订单号是：${result.orderId}\n\n请记下此订单号，接单者会通过您留的联系方式与您沟通。`);
            
            // 保存联系方式到本地（方便下次使用）
            saveLastContact(formData.wechat, formData.phone);
            
            // 重置表单
            event.target.reset();
            // 重置时间选项
            document.querySelectorAll('.time-option').forEach(opt => opt.classList.remove('active'));
            document.querySelector('.time-option[data-time="尽快"]').classList.add('active');
            document.getElementById('customTime').style.display = 'none';
            document.getElementById('expectTime').value = '尽快';
            
            // 可选：跳转到首页
            // window.location.href = 'index.html';
        } else {
            // 保存失败
            alert('发布失败：' + result.error);
        }
    } catch (error) {
        console.error('发布过程中出错：', error);
        alert('发布失败，请检查网络后重试。');
    } finally {
        // 恢复按钮状态
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// 收集表单数据
function collectFormData() {
    // 生成订单号：PT + 年月日 + 随机数
    const now = new Date();
    const orderId = 'PT' + 
        now.getFullYear() + 
        String(now.getMonth() + 1).padStart(2, '0') + 
        String(now.getDate()).padStart(2, '0') + 
        String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    return {
        orderId: orderId,
        type: document.getElementById('orderType').value,
        detail: document.getElementById('orderDetail').value.trim(),
        reward: parseInt(document.getElementById('orderReward').value) || 0,
        expectTime: document.getElementById('expectTime').value,
        wechat: document.getElementById('contactWechat').value.trim(),
        phone: document.getElementById('contactPhone').value.trim(),
        requirements: document.getElementById('otherRequirements').value.trim(),
        // 其他可以添加的字段...
        publishTime: now.toISOString()
    };
}

// 验证表单数据
function validateFormData(data) {
    if (!data.type) {
        alert('请选择需求类型');
        return false;
    }
    
    if (!data.detail || data.detail.length < 5) {
        alert('请详细描述您的需求（至少5个字）');
        return false;
    }
    
    if (!data.reward || data.reward < 1) {
        alert('请输入合理的报酬金额（至少1元）');
        return false;
    }
    
    if (!data.expectTime) {
        alert('请选择或输入期望完成时间');
        return false;
    }
    
    if (!data.wechat && !data.phone) {
        alert('请至少填写一种联系方式（微信或手机号）');
        return false;
    }
    
    return true;
}

// 保存订单到Supabase
async function saveOrderToSupabase(orderData) {
    try {
        // 直接使用全局的supabase客户端
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // 准备数据
        const orderRecord = {
            order_id: orderData.orderId,
            type: orderData.type,
            detail: orderData.detail,
            reward: orderData.reward * 100, // 转为分
            expect_time: orderData.expectTime,
            status: 'pending',
            publisher_wechat: orderData.wechat || null,
            publisher_phone: orderData.phone || null,
            requirements: orderData.requirements || null
        };
        
        console.log('准备插入数据:', orderRecord);
        
        // 插入数据
        const { data, error } = await supabase
            .from('orders')
            .insert([orderRecord])
            .select();
        
        if (error) {
            console.error('Supabase插入错误:', error);
            return {
                success: false,
                error: error.message
            };
        }
        
        console.log('插入成功:', data);
        
        return {
            success: true,
            orderId: orderData.orderId,
            data: data
        };
        
    } catch (error) {
        console.error('保存订单异常:', error);
        return {
            success: false,
            error: error.toString()
        };
    }
}

// 保存联系方式到本地存储（方便下次使用）
function saveLastContact(wechat, phone) {
    try {
        const contactInfo = { wechat, phone };
        localStorage.setItem('paotui_last_contact', JSON.stringify(contactInfo));
    } catch (e) {
        console.warn('无法保存联系方式到本地：', e);
    }
}

// 从本地存储加载上次的联系方式
function loadLastContact() {
    try {
        const saved = localStorage.getItem('paotui_last_contact');
        if (saved) {
            const contactInfo = JSON.parse(saved);
            if (contactInfo.wechat) {
                document.getElementById('contactWechat').value = contactInfo.wechat;
            }
            if (contactInfo.phone) {
                document.getElementById('contactPhone').value = contactInfo.phone;
            }
        }
    } catch (e) {
        console.warn('无法加载上次的联系方式：', e);
    }
}

// 提供一个全局函数，方便在HTML中直接调用测试
window.testSupabaseConnection = async function() {
    const { data, error } = await supabase
        .from('orders')
        .select('count')
        .limit(1);
    
    if (error) {
        alert('Supabase连接测试失败：' + error.message);
    } else {
        alert('Supabase连接成功！');
    }
};