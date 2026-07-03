package com.deepseek.monitor;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * 每日记录 Capacitor 插件
 * - 前端把 apiKey/usageToken 同步到原生 SharedPreferences（供 Worker 读取）
 * - 前端读取原生存储的每日记录（Worker 在 23:59 存的数据）
 * - 触发立即执行 Worker（用于测试）
 */
@CapacitorPlugin(name = "DailyRecord")
public class DailyRecordPlugin extends Plugin {

    private static final String TAG = "DailyRecordPlugin";
    private static final String CONFIG_PREFS = "ds_config";
    private static final String RECORDS_PREFS = "daily_records";

    /**
     * 同步配置（apiKey 和 usageToken）到原生层
     * 前端调用：DailyRecord.syncConfig({ apiKey, usageToken })
     */
    @PluginMethod
    public void syncConfig(PluginCall call) {
        String apiKey = call.getString("apiKey", "");
        String usageToken = call.getString("usageToken", "");

        SharedPreferences prefs = getContext().getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .putString("apiKey", apiKey)
                .putString("usageToken", usageToken)
                .apply();

        Log.d(TAG, "配置已同步到原生层，usageToken 长度=" + usageToken.length());
        call.resolve();
    }

    /**
     * 读取原生层存储的每日记录（Worker 在 23:59 存的数据）
     * 前端调用：DailyRecord.getRecords({ days: 30 })
     * 返回：{ records: [{ date, model, tokens, cost, updatedAt }, ...] }
     */
    @PluginMethod
    public void getRecords(PluginCall call) {
        int days = call.getInt("days", 30);
        String modelFilter = call.getString("model", "");

        SharedPreferences prefs = getContext().getSharedPreferences(RECORDS_PREFS, Context.MODE_PRIVATE);
        JSArray records = new JSArray();

        // 生成最近 N 天的日期
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

        for (int i = days - 1; i >= 0; i--) {
            Calendar dayCal = (Calendar) cal.clone();
            dayCal.add(Calendar.DAY_OF_MONTH, -i);
            String dateStr = sdf.format(dayCal.getTime());

            // 查找该天所有模型
            String[] models = {"deepseek-v4-flash", "deepseek-v4-pro"};
            for (String model : models) {
                if (!modelFilter.isEmpty() && !modelFilter.equals(model)) continue;

                String key = "record_" + dateStr + "_" + model;
                String value = prefs.getString(key, null);
                JSObject record = new JSObject();
                record.put("date", dateStr);
                record.put("model", model);
                if (value != null) {
                    // 格式：tokens|cost|updatedAt
                    String[] parts = value.split("\\|");
                    if (parts.length >= 2) {
                        try {
                            record.put("tokens", Long.parseLong(parts[0]));
                            record.put("cost", Double.parseDouble(parts[1]));
                            record.put("updatedAt", parts.length >= 3 ? parts[2] : "");
                        } catch (NumberFormatException e) {
                            record.put("tokens", 0);
                            record.put("cost", 0);
                            record.put("updatedAt", "");
                        }
                    } else {
                        record.put("tokens", 0);
                        record.put("cost", 0);
                        record.put("updatedAt", "");
                    }
                } else {
                    record.put("tokens", 0);
                    record.put("cost", 0);
                    record.put("updatedAt", "");
                }
                records.put(record);
            }
        }

        JSObject result = new JSObject();
        result.put("records", records);
        call.resolve(result);
    }

    /**
     * 前端写入当日记录到原生层（这样前端 5 分钟存储的数据也能被 Worker 覆盖统一）
     * 前端调用：DailyRecord.saveRecord({ date, model, tokens, cost })
     */
    @PluginMethod
    public void saveRecord(PluginCall call) {
        String date = call.getString("date", "");
        String model = call.getString("model", "");
        Long tokens = call.getLong("tokens", 0L);
        Double cost = call.getDouble("cost", 0.0);

        if (date.isEmpty() || model.isEmpty()) {
            call.reject("date and model are required");
            return;
        }

        SharedPreferences prefs = getContext().getSharedPreferences(RECORDS_PREFS, Context.MODE_PRIVATE);
        String key = "record_" + date + "_" + model;
        String updatedAt = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
        String value = tokens + "|" + cost + "|" + updatedAt;
        prefs.edit().putString(key, value).apply();

        call.resolve();
    }

    /**
     * 立即触发 Worker 执行（用于测试或手动同步）
     * 前端调用：DailyRecord.triggerWorker()
     */
    @PluginMethod
    public void triggerWorker(PluginCall call) {
        try {
            androidx.work.WorkManager workManager = androidx.work.WorkManager.getInstance(getContext());
            androidx.work.OneTimeWorkRequest workRequest = new androidx.work.OneTimeWorkRequest.Builder(DailyRecordWorker.class)
                    .build();
            workManager.enqueueUniqueWork(
                    "daily_record_manual",
                    androidx.work.ExistingWorkPolicy.REPLACE,
                    workRequest
            );
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "触发 Worker 失败", e);
            call.reject("触发失败: " + e.getMessage());
        }
    }

    /**
     * 注册每日 23:55 的定时任务
     * 前端启动时调用一次
     * 前端调用：DailyRecord.scheduleDailyTask()
     */
    @PluginMethod
    public void scheduleDailyTask(PluginCall call) {
        try {
            androidx.work.WorkManager workManager = androidx.work.WorkManager.getInstance(getContext());

            // 计算到下次 23:55 的延迟（分钟）
            Calendar cal = Calendar.getInstance();
            int hour = cal.get(Calendar.HOUR_OF_DAY);
            int minute = cal.get(Calendar.MINUTE);

            // 如果当前已过 23:55，则到明天 23:55
            int targetHour = 23;
            int targetMinute = 55;
            long delayMinutes;
            if (hour > targetHour || (hour == targetHour && minute >= targetMinute)) {
                // 到明天 23:55
                delayMinutes = (24 - hour + targetHour) * 60 + (targetMinute - minute);
            } else {
                delayMinutes = (targetHour - hour) * 60 + (targetMinute - minute);
            }

            // 创建周期任务（每 24 小时一次）
            androidx.work.PeriodicWorkRequest workRequest = new androidx.work.PeriodicWorkRequest.Builder(
                    DailyRecordWorker.class,
                    24, java.util.concurrent.TimeUnit.HOURS
            )
                    .setInitialDelay(delayMinutes, java.util.concurrent.TimeUnit.MINUTES)
                    .build();

            workManager.enqueueUniquePeriodicWork(
                    "daily_record_2355",
                    androidx.work.ExistingPeriodicWorkPolicy.KEEP,
                    workRequest
            );

            Log.d(TAG, "已注册每日定时任务，延迟 " + delayMinutes + " 分钟后首次执行");
            JSObject result = new JSObject();
            result.put("delayMinutes", delayMinutes);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "注册定时任务失败", e);
            call.reject("注册失败: " + e.getMessage());
        }
    }
}
