package com.deepseek.monitor;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * 每日记录后台 Worker
 * 在 23:55 左右由 WorkManager 触发，自动拉取当日数据并存储
 * 即使 App 不在前台也能运行
 */
public class DailyRecordWorker extends Worker {

    private static final String TAG = "DailyRecordWorker";
    private static final String PREFS_NAME = "daily_records";
    private static final String CONFIG_PREFS = "ds_config"; // 存储 apiKey 和 usageToken

    // 平台 API 端点
    private static final String AMOUNT_URL = "https://platform.deepseek.com/api/v_usage/amount";
    private static final String COST_URL = "https://platform.deepseek.com/api/v_usage/cost";

    // 官方定价（元/百万 tokens）
    private static class Pricing {
        double promptCacheHit;
        double promptCacheMiss;
        double completion;
    }

    private static Pricing getPricing(String modelId) {
        Pricing p = new Pricing();
        if ("deepseek-v4-flash".equals(modelId)) {
            p.promptCacheHit = 0.02;
            p.promptCacheMiss = 1;
            p.completion = 2;
        } else if ("deepseek-v4-pro".equals(modelId)) {
            p.promptCacheHit = 0.025;
            p.promptCacheMiss = 3;
            p.completion = 6;
        }
        return p;
    }

    public DailyRecordWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Worker 启动，开始拉取当日数据");
        try {
            Context ctx = getApplicationContext();

            // 读取 config
            SharedPreferences configPrefs = ctx.getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE);
            String usageToken = configPrefs.getString("usageToken", "");
            if (usageToken.isEmpty()) {
                Log.w(TAG, "usageToken 为空，跳过");
                return Result.success();
            }

            // 当日日期
            Calendar cal = Calendar.getInstance();
            int year = cal.get(Calendar.YEAR);
            int month = cal.get(Calendar.MONTH) + 1;
            String todayStr = String.format(Locale.US, "%04d-%02d-%02d",
                    year, month, cal.get(Calendar.DAY_OF_MONTH));

            // 拉取 amount 接口
            JSONObject amountResp = fetchPlatform(usageToken, month, year, AMOUNT_URL);
            if (amountResp == null) {
                Log.e(TAG, "拉取 amount 失败");
                return Result.retry();
            }

            // 解析当日数据
            JSONObject bizData = amountResp.optJSONObject("data").optJSONObject("biz_data");
            JSONArray daysArr = bizData != null ? bizData.optJSONArray("days") : null;
            if (daysArr == null) {
                Log.w(TAG, "days 为空");
                return Result.success();
            }

            // 找到今日数据
            JSONObject todayData = null;
            for (int i = 0; i < daysArr.length(); i++) {
                JSONObject day = daysArr.optJSONObject(i);
                if (todayStr.equals(day.optString("date"))) {
                    todayData = day;
                    break;
                }
            }
            if (todayData == null) {
                Log.w(TAG, "未找到今日数据，存 0");
                saveTodayRecord(ctx, todayStr, "deepseek-v4-flash", 0, 0);
                saveTodayRecord(ctx, todayStr, "deepseek-v4-pro", 0, 0);
                return Result.success();
            }

            JSONArray dataArr = todayData.optJSONArray("data");
            if (dataArr == null) {
                saveTodayRecord(ctx, todayStr, "deepseek-v4-flash", 0, 0);
                saveTodayRecord(ctx, todayStr, "deepseek-v4-pro", 0, 0);
                return Result.success();
            }

            // 遍历模型
            boolean hasFlash = false, hasPro = false;
            for (int i = 0; i < dataArr.length(); i++) {
                JSONObject modelData = dataArr.optJSONObject(i);
                String model = modelData.optString("model");
                JSONObject usage = modelData.optJSONObject("usage");

                if ("deepseek-v4-flash".equals(model)) {
                    hasFlash = true;
                    double[] costTokens = calcTokensAndCost(usage, model);
                    saveTodayRecord(ctx, todayStr, model, (long) costTokens[0], costTokens[1]);
                } else if ("deepseek-v4-pro".equals(model)) {
                    hasPro = true;
                    double[] costTokens = calcTokensAndCost(usage, model);
                    saveTodayRecord(ctx, todayStr, model, (long) costTokens[0], costTokens[1]);
                }
            }

            // 没有数据的模型存 0
            if (!hasFlash) saveTodayRecord(ctx, todayStr, "deepseek-v4-flash", 0, 0);
            if (!hasPro) saveTodayRecord(ctx, todayStr, "deepseek-v4-pro", 0, 0);

            Log.d(TAG, "Worker 完成，当日数据已存储");
            return Result.success();

        } catch (Exception e) {
            Log.e(TAG, "Worker 异常", e);
            return Result.retry();
        }
    }

    /**
     * 解析 usage 对象，计算 token 总数和费用
     * 返回 [totalTokens, cost]
     */
    private double[] calcTokensAndCost(JSONObject usage, String modelId) {
        try {
            // usage 格式: { "0": [hitTokens, ...], "1": [missTokens, ...], "2": [responseTokens, ...] }
            // 实际平台 API 返回的 usage 是按 token 类型分组的
            // 这里简化处理：尝试从 usage 中提取 cache_hit, cache_miss, response
            long cacheHit = 0, cacheMiss = 0, response = 0;

            // 尝试多种可能的字段名
            cacheHit = usage.optLong("cache_hit_tokens", usage.optLong("prompt_cache_hit", 0));
            cacheMiss = usage.optLong("cache_miss_tokens", usage.optLong("prompt_cache_miss", 0));
            response = usage.optLong("completion_tokens", usage.optLong("response_tokens", 0));

            long totalTokens = cacheHit + cacheMiss + response;

            Pricing p = getPricing(modelId);
            double cost = (cacheHit / 1_000_000.0) * p.promptCacheHit
                    + (cacheMiss / 1_000_000.0) * p.promptCacheMiss
                    + (response / 1_000_000.0) * p.completion;

            // 四舍五入到 4 位小数
            cost = Math.round(cost * 10000) / 10000.0;

            return new double[]{totalTokens, cost};
        } catch (Exception e) {
            Log.e(TAG, "计算费用异常", e);
            return new double[]{0, 0};
        }
    }

    /**
     * 保存当日记录到 SharedPreferences
     * 格式：key = "record_{date}_{model}", value = "{tokens}|{cost}|{updatedAt}"
     */
    private void saveTodayRecord(Context ctx, String date, String model, long tokens, double cost) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String key = "record_" + date + "_" + model;
        String updatedAt = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
        String value = tokens + "|" + cost + "|" + updatedAt;
        prefs.edit().putString(key, value).apply();
        Log.d(TAG, "保存: " + key + " = " + value);
    }

    /**
     * 调用平台 API
     */
    private JSONObject fetchPlatform(String token, int month, int year, String baseUrl) {
        try {
            OkHttpClient client = new OkHttpClient();
            String url = baseUrl + "?year=" + year + "&month=" + month;
            Request request = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer " + token)
                    .addHeader("Content-Type", "application/json")
                    .build();
            Response response = client.newCall(request).execute();
            String body = response.body() != null ? response.body().string() : "{}";
            Log.d(TAG, "API 响应: " + body.substring(0, Math.min(body.length(), 200)));
            return new JSONObject(body);
        } catch (Exception e) {
            Log.e(TAG, "fetchPlatform 异常", e);
            return null;
        }
    }
}
