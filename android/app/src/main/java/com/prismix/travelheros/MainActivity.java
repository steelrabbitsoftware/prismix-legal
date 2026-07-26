package com.prismix.travelheros;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage (save do jogo)
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setBackgroundColor(0xFF14091F);

        // app.html usa o bundle único (dist/bundle.js) — módulos ES não carregam via file://
        webView.loadUrl("file:///android_asset/app.html");
        setContentView(webView);
        hideSystemUi();
    }

    private void hideSystemUi() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    public void onBackPressed() {
        // Esc/voltar: deixa o jogo tratar; sair só com o botão de novo
        if (webView != null) webView.evaluateJavascript(
                "window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape'}))", null);
        // duplo-voltar rápido encerra
        long now = System.currentTimeMillis();
        if (now - lastBack < 1500) super.onBackPressed();
        lastBack = now;
    }

    private long lastBack = 0;

    @Override
    protected void onPause() { super.onPause(); if (webView != null) webView.onPause(); }

    @Override
    protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }
}
