// DeepSeek API 服务模块
// 对接 DeepSeek 官方 API，查询余额和用量数据

const API_BASE = "https://api.deepseek.com";

// 余额信息（来自官方 /user/balance 接口）
export interface BalanceResponse {
  is_available: boolean;
  balance_infos: Array<{
    currency: string;          // CNY / USD
    total_balance: string;     // 总余额（赠金+充值）
    granted_balance: string;   // 赠金余额
    topped_up_balance: string;  // 充值余额
  }>;
}

// 用量明细（来自官方 /api/v0/usage/amount 接口）
// data 按日期分组，每日 data 下按模型 ID (deepseek-chat/reasoner/v4-flash/v4-pro 等) 分组
export interface UsageAmountResponse {
  data?: {
    amount?: Array<{
      date?: string;
      data?: Record<string, Array<{
        prompt_tokens?: number;
        completion_tokens?: number;
        cache_hit_tokens?: number;
        cache_miss_tokens?: number;
      }>>;
    }>;
  };
}

// 费用明细（来自官方 /api/v0/usage/cost 接口）
export interface UsageCostResponse {
  data?: {
    cost?: Array<{
      date?: string;
      data?: Record<string, Array<{
        total_cost?: number;
      }>>;
    }>;
  };
}

// 查询账户余额
export async function fetchBalance(apiKey: string): Promise<BalanceResponse | null> {
  try {
    const resp = await fetch(`${API_BASE}/user/balance`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    console.error("查询余额失败:", err);
    return null;
  }
}

// 查询用量明细（按日期范围）
// 端点: GET /v1/usage?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// 返回结构未在官方文档明确公开，此处用宽松类型 any 接收，由 store 侧做容错适配
export async function fetchUsage(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<any | null> {
  try {
    const resp = await fetch(
      `${API_BASE}/v1/usage?start_date=${startDate}&end_date=${endDate}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    console.error("查询用量失败:", err);
    return null;
  }
}

// 查询指定月份的 token 用量
export async function fetchUsageAmount(
  apiKey: string,
  month: number,
  year: number
): Promise<UsageAmountResponse | null> {
  try {
    const resp = await fetch(
      `${API_BASE}/api/v0/usage/amount?month=${month}&year=${year}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    console.error("查询用量失败:", err);
    return null;
  }
}

// 查询指定月份的费用明细
export async function fetchUsageCost(
  apiKey: string,
  month: number,
  year: number
): Promise<UsageCostResponse | null> {
  try {
    const resp = await fetch(
      `${API_BASE}/api/v0/usage/cost?month=${month}&year=${year}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    console.error("查询费用失败:", err);
    return null;
  }
}

// 验证 API Key 是否有效
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/user/balance`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return resp.ok;
  } catch {
    return false;
  }
}
