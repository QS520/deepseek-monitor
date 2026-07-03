package com.deepseek.monitor;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Build;
import android.util.Log;
import android.util.TypedValue;
import android.widget.RemoteViews;

/**
 * DeepSeek 余额桌面小组件
 */
public class BalanceWidget extends AppWidgetProvider {

    static final String PREFS_NAME = "deepseek_widget_data";
    static final String ACTION_REFRESH = "com.deepseek.monitor.WIDGET_REFRESH";
    static final String TAG = "BalanceWidget";

    private static final int COLOR_FLASH = Color.parseColor("#4D6BFE");
    private static final int COLOR_PRO = Color.parseColor("#A855F7");
    private static final int COLOR_BG = Color.parseColor("#1E293B");
    private static final int COLOR_TEXT_PRIMARY = Color.parseColor("#F1F5F9");
    private static final int COLOR_TEXT_SECONDARY = Color.parseColor("#64748B");

    private static String formatCost(String cost) {
        try {
            double val = Double.parseDouble(cost);
            return String.format("%.2f", val);
        } catch (Exception e) {
            return "0.00";
        }
    }

    private static float parseFloat(String s) {
        try {
            return Float.parseFloat(s);
        } catch (Exception e) {
            return 0f;
        }
    }

    private static int dpToPx(Context context, int dp) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp,
                context.getResources().getDisplayMetrics());
    }

    /**
     * 绘制环形图 Bitmap
     * 中间显示今日总费用，环形显示 Flash/Pro 占比
     */
    private static Bitmap drawDonutChart(Context context, float flashCost, float proCost) {
        int size = dpToPx(context, 110);
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        float total = flashCost + proCost;
        float strokeWidth = dpToPx(context, 10);
        float radius = (size - strokeWidth) / 2f - dpToPx(context, 2);
        float cx = size / 2f;
        float cy = size / 2f;

        // 底部灰色圆环
        Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgPaint.setStyle(Paint.Style.STROKE);
        bgPaint.setStrokeWidth(strokeWidth);
        bgPaint.setColor(COLOR_BG);
        bgPaint.setStrokeCap(Paint.Cap.ROUND);
        canvas.drawCircle(cx, cy, radius, bgPaint);

        RectF oval = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);

        if (total > 0) {
            // 画 Flash 段（从顶部 -90° 开始，顺时针）
            float flashSweep = (flashCost / total) * 360f;
            Paint flashPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            flashPaint.setStyle(Paint.Style.STROKE);
            flashPaint.setStrokeWidth(strokeWidth);
            flashPaint.setColor(COLOR_FLASH);
            flashPaint.setStrokeCap(Paint.Cap.ROUND);
            canvas.drawArc(oval, -90f, flashSweep, false, flashPaint);

            // 画 Pro 段（接在 Flash 后面）
            float proSweep = (proCost / total) * 360f;
            Paint proPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            proPaint.setStyle(Paint.Style.STROKE);
            proPaint.setStrokeWidth(strokeWidth);
            proPaint.setColor(COLOR_PRO);
            proPaint.setStrokeCap(Paint.Cap.ROUND);
            canvas.drawArc(oval, -90f + flashSweep, proSweep, false, proPaint);
        }

        // 中间文字：今日总费用
        String totalStr = String.format("%.2f", total);
        Paint valuePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        valuePaint.setColor(COLOR_TEXT_PRIMARY);
        valuePaint.setTextSize(dpToPx(context, 16));
        valuePaint.setFakeBoldText(true);
        valuePaint.setTextAlign(Paint.Align.CENTER);

        // 计算垂直居中
        Paint.FontMetrics fm = valuePaint.getFontMetrics();
        float textY = cy - (fm.ascent + fm.descent) / 2f - dpToPx(context, 4);
        canvas.drawText("¥" + totalStr, cx, textY, valuePaint);

        // 底部小字：今日费用
        Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        labelPaint.setColor(COLOR_TEXT_SECONDARY);
        labelPaint.setTextSize(dpToPx(context, 9));
        labelPaint.setTextAlign(Paint.Align.CENTER);
        canvas.drawText("今日费用", cx, cy + dpToPx(context, 14), labelPaint);

        return bitmap;
    }

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
        String flashTodayTokens = prefs.getString("flashTodayTokens", "0");
        String flashTodayCost = prefs.getString("flashTodayCost", "0");
        String proTodayTokens = prefs.getString("proTodayTokens", "0");
        String proTodayCost = prefs.getString("proTodayCost", "0");
        String connected = prefs.getString("connected", "false");
        String lastUpdate = prefs.getString("lastUpdate", "");

        boolean hasData = !"--".equals(balance) && !"0".equals(balance);
        boolean isConnected = "true".equals(connected);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_balance);

        // 状态
        if (hasData) {
            views.setTextViewText(R.id.widget_status, isConnected ? "● 在线" : "● 离线");
            views.setTextColor(R.id.widget_status, isConnected ? Color.parseColor("#00D9A3") : Color.parseColor("#FF6B35"));
        } else {
            views.setTextViewText(R.id.widget_status, "等待数据");
            views.setTextColor(R.id.widget_status, Color.parseColor("#64748B"));
        }

        // 解析费用
        float flashCost = parseFloat(flashTodayCost);
        float proCost = parseFloat(proTodayCost);

        // 绘制环形图
        Bitmap donutBitmap = drawDonutChart(context, flashCost, proCost);
        views.setImageViewBitmap(R.id.widget_donut_chart, donutBitmap);

        // Flash 行
        if (hasData) {
            views.setTextViewText(R.id.widget_flash_cost, "¥" + formatCost(flashTodayCost));
            views.setTextViewText(R.id.widget_flash_tokens, flashTodayTokens + " tokens");
        } else {
            views.setTextViewText(R.id.widget_flash_cost, "--");
            views.setTextViewText(R.id.widget_flash_tokens, "等待同步");
        }

        // Pro 行
        if (hasData) {
            views.setTextViewText(R.id.widget_pro_cost, "¥" + formatCost(proTodayCost));
            views.setTextViewText(R.id.widget_pro_tokens, proTodayTokens + " tokens");
        } else {
            views.setTextViewText(R.id.widget_pro_cost, "--");
            views.setTextViewText(R.id.widget_pro_tokens, "等待同步");
        }

        // 更新时间
        if (!lastUpdate.isEmpty()) {
            views.setTextViewText(R.id.widget_update_time, "更新 " + lastUpdate);
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

        // 点击环形图也打开 App
        try {
            Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (openAppIntent != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 2, openAppIntent, flags);
                views.setOnClickPendingIntent(R.id.widget_donut_chart, pendingIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "setOnClickPendingIntent chart error", e);
        }

        manager.updateAppWidget(widgetId, views);
        Log.d(TAG, "updateAppWidget done: widgetId=" + widgetId);
    }
}
