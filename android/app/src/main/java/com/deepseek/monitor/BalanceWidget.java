package com.deepseek.monitor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.RelativeSizeSpan;
import android.widget.RemoteViews;

/**
 * DeepSeek 余额桌面小组件
 * 从 SharedPreferences 读取数据并显示在桌面上
 * 支持点击打开 App
 */
public class BalanceWidget extends AppWidgetProvider {

    static final String PREFS_NAME = "deepseek_widget_data";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // 第一个 widget 被添加时触发
        updateWidget(context);
    }

    /**
     * 静态方法：更新所有已放置的 widget
     * 供 WidgetSyncPlugin 调用
     */
    static void updateWidget(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, BalanceWidget.class);
        int[] widgetIds = manager.getAppWidgetIds(widgetComponent);
        if (widgetIds.length > 0) {
            Intent intent = new Intent(context, BalanceWidget.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
            context.sendBroadcast(intent);
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

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_balance);

        // 设置余额
        views.setTextViewText(R.id.widget_balance_value, "¥" + balance);

        // 设置今日花费
        views.setTextViewText(R.id.widget_today_cost, "今日 ¥" + todayUsed);

        // 设置本月花费
        views.setTextViewText(R.id.widget_month_cost, "本月 ¥" + totalUsed);

        // 设置 token 用量
        views.setTextViewText(R.id.widget_flash_tokens, "Flash " + flashTokens);
        views.setTextViewText(R.id.widget_pro_tokens, "Pro " + proTokens);

        // 设置连接状态
        boolean isConnected = "true".equals(connected);
        int statusColor = isConnected ? Color.parseColor("#00D9A3") : Color.parseColor("#64748B");
        views.setTextColor(R.id.widget_status, statusColor);
        views.setTextViewText(R.id.widget_status, isConnected ? "● LIVE" : "● OFF");

        // 设置更新时间
        views.setTextViewText(R.id.widget_update_time, lastUpdate.isEmpty() ? "未更新" : lastUpdate);

        // 点击打开 App
        Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (openAppIntent != null) {
            PendingIntent pendingIntent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                pendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, PendingIntent.FLAG_IMMUTABLE);
            } else {
                pendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT);
            }
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
        }

        manager.updateAppWidget(widgetId, views);
    }
}
