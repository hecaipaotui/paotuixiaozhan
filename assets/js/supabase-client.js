// supabase-client.js
// 初始化Supabase客户端

const SUPABASE_URL = 'https://zmtgvjulvnzwcnfjmaxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdGd2anVsdm56d2NuZmptYXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjEzOTUsImV4cCI6MjA4NDUzNzM5NX0.vUoSSSYnn81T6SthfcKz0UT7cq5cHHEDX1NPDnnPDkU';

// 创建Supabase客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabasePaoTui {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
    }

    // 生成订单号
    generateOrderId() {
        const now = new Date();
        const dateStr = now.getFullYear() + 
                       String(now.getMonth() + 1).padStart(2, '0') + 
                       String(now.getDate()).padStart(2, '0');
        const randomStr = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        return `PT${dateStr}${randomStr}`;
    }

    // 创建订单
    async createOrder(orderData) {
        try {
            // 生成订单ID
            const orderId = this.generateOrderId();
            
            // 准备数据
            const order = {
                order_id: orderId,
                type: orderData.type,
                detail: orderData.detail,
                reward: Math.round(orderData.reward * 100), // 转为分
                expect_time: orderData.expectTime,
                status: 'pending',
                publisher_name: orderData.publisherName || '匿名用户',
                publisher_wechat: orderData.wechat || '',
                publisher_phone: orderData.phone || '',
                from_address: orderData.fromAddress || '',
                to_address: orderData.toAddress || '',
                requirements: orderData.requirements || '',
                images: orderData.images || [],
                view_count: 0,
                created_at: new Date().toISOString()
            };

            // 插入到Supabase
            const { data, error } = await this.supabase
                .from('orders')
                .insert([order])
                .select();

            if (error) throw error;

            return {
                success: true,
                orderId: orderId,
                data: data[0]
            };

        } catch (error) {
            console.error('创建订单失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 获取订单列表
    async getOrders(filters = {}, page = 1, pageSize = 12) {
        try {
            let query = this.supabase
                .from('orders')
                .select('*', { count: 'exact' });

            // 应用筛选条件
            if (filters.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            } else {
                query = query.neq('status', 'completed');
            }

            if (filters.type && filters.type !== 'all') {
                query = query.eq('type', filters.type);
            }

            if (filters.keyword) {
                query = query.or(`detail.ilike.%${filters.keyword}%,order_id.ilike.%${filters.keyword}%`);
            }

            // 排序和分页
            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;

            // 格式化数据（将分转为元）
            const formattedData = data.map(order => ({
                ...order,
                reward: (order.reward / 100).toFixed(2)
            }));

            return {
                success: true,
                data: formattedData,
                total: count,
                page,
                pageSize
            };

        } catch (error) {
            console.error('获取订单失败:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                total: 0
            };
        }
    }

    // 获取单个订单
    async getOrderById(orderId) {
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .select('*')
                .eq('order_id', orderId)
                .single();

            if (error) throw error;

            // 增加查看次数
            await this.supabase
                .from('orders')
                .update({ view_count: (data.view_count || 0) + 1 })
                .eq('order_id', orderId);

            // 格式化数据
            const formattedData = {
                ...data,
                reward: (data.reward / 100).toFixed(2)
            };

            return {
                success: true,
                data: formattedData
            };

        } catch (error) {
            console.error('获取订单详情失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 更新订单状态（接单/完成）
    async updateOrder(orderId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('orders')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', orderId)
                .select();

            if (error) throw error;

            return {
                success: true,
                data: data[0]
            };

        } catch (error) {
            console.error('更新订单失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 搜索订单
    async searchOrders(keyword, page = 1, pageSize = 12) {
        try {
            const { data, error, count } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact' })
                .or(`detail.ilike.%${keyword}%,order_id.ilike.%${keyword}%,type.ilike.%${keyword}%`)
                .neq('status', 'completed')
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;

            const formattedData = data.map(order => ({
                ...order,
                reward: (order.reward / 100).toFixed(2)
            }));

            return {
                success: true,
                data: formattedData,
                total: count,
                page,
                pageSize
            };

        } catch (error) {
            console.error('搜索订单失败:', error);
            return {
                success: false,
                error: error.message,
                data: [],
                total: 0
            };
        }
    }

    // 获取统计信息
    async getStats() {
        try {
            // 获取总订单数
            const { count: totalCount } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true });

            // 获取待接单数量
            const { count: pendingCount } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            // 获取已完成数量
            const { count: completedCount } = await this.supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed');

            // 获取总报酬
            const { data: rewardData } = await this.supabase
                .from('orders')
                .select('reward')
                .eq('status', 'completed');

            const totalReward = rewardData?.reduce((sum, order) => sum + order.reward, 0) || 0;

            return {
                success: true,
                data: {
                    totalOrders: totalCount || 0,
                    pendingOrders: pendingCount || 0,
                    completedOrders: completedCount || 0,
                    totalReward: (totalReward / 100).toFixed(2)
                }
            };

        } catch (error) {
            console.error('获取统计信息失败:', error);
            return {
                success: false,
                error: error.message,
                data: {
                    totalOrders: 0,
                    pendingOrders: 0,
                    completedOrders: 0,
                    totalReward: '0.00'
                }
            };
        }
    }

    // 实时订阅订单变化
    subscribeToOrders(callback) {
        const subscription = this.supabase
            .channel('orders-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'orders' }, 
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();

        return subscription;
    }
}

// 创建全局实例
window.paotuiDB = new SupabasePaoTui();