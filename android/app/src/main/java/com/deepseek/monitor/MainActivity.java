package com.deepseek.monitor;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 允许 WebView 调试 (开发模式)
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
