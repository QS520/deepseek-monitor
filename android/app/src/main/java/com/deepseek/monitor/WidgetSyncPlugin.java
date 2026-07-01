package com.deepseek.monitor;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor 插件：将数据同步到 Android 桌面小组件
 * JS 端调用 saveData 后，原生端写入 SharedPreferences 并触发 widget 更新
 */
@CapacitorPlugin(name = "WidgetSync")
public class WidgetSyncPlugin extends Plugin {

    private static final String PREFS_NAME = "deepseek_widget_data";

    @PluginMethod
    public void saveData(PluginCall call) {
        String apiKey = call.getString("apiKey", "");
        String balance = call.getString("balance", "0");
        String totalUsed = call.getString("totalUsed", "0");
        String todayUsed = call.getString("todayUsed", "0");
        String flashTokens = call.getString("flashTokens", "0");
        String proTokens = call.getString("proTokens", "0");
        String connected = call.getString("connected", "false");
        String lastUpdate = call.getString("lastUpdate", "");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("apiKey", apiKey);
        editor.putString("balance", balance);
        editor.putString("totalUsed", totalUsed);
        editor.putString("todayUsed", todayUsed);
        editor.putString("flashTokens", flashTokens);
        editor.putString("proTokens", proTokens);
        editor.putString("connected", connected);
        editor.putString("lastUpdate", lastUpdate);
        editor.apply();

        // 触发 widget 更新
        BalanceWidget.updateWidget(getContext());

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
