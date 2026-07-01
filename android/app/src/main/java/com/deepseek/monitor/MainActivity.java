package com.deepseek.monitor;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 注册自定义插件
        registerPlugin(WidgetSyncPlugin.class);
        super.onCreate(savedInstanceState);
        // 允许 WebView 调试 (开发模式)
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
