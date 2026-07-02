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
import android.util.Log;
import android.widget.RemoteViews;

/**
 * DeepSeek 余额桌面小组件
 */
public class BalanceWidget extends AppWidgetProvider {

    static final String PREFS_NAME = "deepseek_widget_data";
    static final String ACTION_REFRESH = "com.deepseek.monitor.WIDGET_REFRESH";
    static final String TAG = "BalanceWidget";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate: widgetIds count=" + (appWidgetIds != null ? appWidgetIds.length : 0));
        if (appWidgetIds == null) return;
        for (int widgetId : appWidgetIds) {
            try {
                updateAppWidget(context, appWidgetManager, widgetId);
            } catch (Exception e) {
                Log.e(TAG, "onUpdate error for widget " + widgetId, e);
            }
        }
    }

    @Override
    public void onEnabled(Context context) {
        Log.d(TAG, "onEnabled: widget added to home screen");
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null || intent.getAction() == null) return;
        Log.d(TAG, "onReceive: action=" + intent.getAction());
        if (ACTION_REFRESH.equals(intent.getAction())) {
            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(launchIntent);
            }
        }
    }

    static void updateWidget(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName widgetComponent = new ComponentName(context, BalanceWidget.class);
            int[] widgetIds = manager.getAppWidgetIds(widgetComponent);
            Log.d(TAG, "updateWidget: found " + widgetIds.length + " widgets");
            for (int widgetId : widgetIds) {
                updateAppWidget(context, manager, widgetId);
            }
        } catch (Exception e) {
            Log.e(TAG, "updateWidget error", e);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager manager, int widgetId) {
        Log.d(TAG, "updateAppWidget: widgetId=" + widgetId);
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

        if (hasData) {
            views.setTextViewText(R.id.widget_status, isConnected ? "● 在线" : "● 离线");
            views.setTextColor(R.id.widget_status, isConnected ? Color.parseColor("#00D9A3") : Color.parseColor("#FF6B35"));
            views.setTextViewText(R.id.widget_balance_value, "¥" + balance);
            views.setTextColor(R.id.widget_balance_value, Color.parseColor("#60A5FA"));
            views.setTextViewText(R.id.widget_today_cost, "今日 ¥" + todayUsed);
            views.setTextViewText(R.id.widget_month_cost, "本月 ¥" + totalUsed);
            views.setTextViewText(R.id.widget_flash_tokens, flashTokens + " tokens");
            views.setTextViewText(R.id.widget_pro_tokens, proTokens + " tokens");
        } else {
            views.setTextViewText(R.id.widget_status, "等待数据");
            views.setTextColor(R.id.widget_status, Color.parseColor("#94A3B8"));
            views.setTextViewText(R.id.widget_balance_value, "¥ --.--");
            views.setTextColor(R.id.widget_balance_value, Color.parseColor("#60A5FA"));
            views.setTextViewText(R.id.widget_today_cost, "今日 --");
            views.setTextViewText(R.id.widget_month_cost, "本月 --");
            views.setTextViewText(R.id.widget_flash_tokens, "等待同步");
            views.setTextViewText(R.id.widget_pro_tokens, "等待同步");
        }

        if (!lastUpdate.isEmpty()) {
            views.setTextViewText(R.id.widget_update_time, "更新于 " + lastUpdate);
        } else {
            views.setTextViewText(R.id.widget_update_time, "未同步");
        }

        // 点击整个 widget 打开 App
        try {
            Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (openAppIntent != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, flags);
                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "setOnClickPendingIntent root error", e);
        }

        // 刷新按钮
        try {
            Intent refreshIntent = new Intent(context, BalanceWidget.class);
            refreshIntent.setAction(ACTION_REFRESH);
            int refreshFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                refreshFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(context, 1, refreshIntent, refreshFlags);
            views.setOnClickPendingIntent(R.id.widget_refresh_btn, refreshPendingIntent);
        } catch (Exception e) {
            Log.e(TAG, "setOnClickPendingIntent refresh error", e);
        }

        manager.updateAppWidget(widgetId, views);
        Log.d(TAG, "updateAppWidget done: widgetId=" + widgetId);
    }
}