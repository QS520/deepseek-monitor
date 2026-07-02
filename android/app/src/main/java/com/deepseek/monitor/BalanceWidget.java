package com.deepseek.monitor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * DeepSeek 余额桌面小组件
 * 从 SharedPreferences 读取数据并显示在桌面上
 * 支持点击打开 App、点击刷新按钮触发数据同步
 */
public class BalanceWidget extends AppWidgetProvider {

    static final String PREFS_NAME = "deepseek_widget_data";
    static final String ACTION_REFRESH = "com.deepseek.monitor.WIDGET_REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // 第一个 widget 被添加时触发
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        // 处理刷新按钮点击
        if (ACTION_REFRESH.equals(intent.getAction())) {
            // 打开 App 触发数据刷新
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                context.startActivity(launchIntent);
            }
        }
    }

    /**
     * 静态方法：直接更新所有已放置的 widget
     * 供 WidgetSyncPlugin 调用
     */
    static void updateWidget(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, BalanceWidget.class);
        int[] widgetIds = manager.getAppWidgetIds(widgetComponent);
        for (int widgetId : widgetIds) {
            updateAppWidget(context, manager, widgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String balance = prefs.getString("balance", "--");
        String totalUsed = prefs.getString("totalUsed", "0");
        String todayUsed = prefs.getString("todayUsed", "0");
        String flashTokens = prefs.getString("flashTokens", "0");
        String proTokens = prefs.getString("proTokens", "0");
        String connected = prefs.getString("connected", "false");
        String lastUpdate = prefs.getString("lastUpdate", "");

        boolean hasData = !"--".equals(balance) && !"0".equals(balance);
        boolean isConnected = "true".equals(connected);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_balance);

        // 设置连接状态指示器
        int statusColor = isConnected ? Color.parseColor("#00D9A3") : Color.parseColor("#FF6B35");
        views.setTextColor(R.id.widget_status, statusColor);
        if (hasData) {
            views.setTextViewText(R.id.widget_status, isConnected ? "● LIVE" : "● OFFLINE");
        } else {
            views.setTextViewText(R.id.widget_status, "● 等待数据");
        }

        // 余额 - 有数据显示余额，无数据显示占位
        if (hasData) {
            views.setTextViewText(R.id.widget_balance_value, "¥" + balance);
            views.setTextColor(R.id.widget_balance_value, isConnected ? Color.parseColor("#4D6BFE") : Color.parseColor("#FF6B35"));
        } else {
            views.setTextViewText(R.id.widget_balance_value, "¥ --.--");
            views.setTextColor(R.id.widget_balance_value, Color.parseColor("#475569"));
        }

        // 今日费用
        if (hasData) {
            views.setTextViewText(R.id.widget_today_cost, "今日 ¥" + todayUsed);
        } else {
            views.setTextViewText(R.id.widget_today_cost, "今日 --");
        }
        views.setTextColor(R.id.widget_today_cost, Color.parseColor("#A855F7"));

        // 本月费用
        if (hasData) {
            views.setTextViewText(R.id.widget_month_cost, "本月 ¥" + totalUsed);
        } else {
            views.setTextViewText(R.id.widget_month_cost, "本月 --");
        }
        views.setTextColor(R.id.widget_month_cost, Color.parseColor("#A855F7"));

        // Token 用量
        if (hasData) {
            views.setTextViewText(R.id.widget_flash_tokens, "Flash " + flashTokens + " tokens");
            views.setTextViewText(R.id.widget_pro_tokens, "Pro " + proTokens + " tokens");
        } else {
            views.setTextViewText(R.id.widget_flash_tokens, "等待同步...");
            views.setTextViewText(R.id.widget_pro_tokens, "打开 App 获取数据");
        }

        // 更新时间
        if (!lastUpdate.isEmpty()) {
            views.setTextViewText(R.id.widget_update_time, "更新 " + lastUpdate);
        } else {
            views.setTextViewText(R.id.widget_update_time, "未同步");
        }

        // 点击整个 widget 打开 App
        Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (openAppIntent != null) {
            PendingIntent pendingIntent;
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            pendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, flags);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        }

        // 刷新按钮（点击触发 App 打开并刷新）
        Intent refreshIntent = new Intent(context, BalanceWidget.class);
        refreshIntent.setAction(ACTION_REFRESH);
        int refreshFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            refreshFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(context, 1, refreshIntent, refreshFlags);
        views.setOnClickPendingIntent(R.id.widget_refresh_btn, refreshPendingIntent);

        manager.updateAppWidget(widgetId, views);
    }
}