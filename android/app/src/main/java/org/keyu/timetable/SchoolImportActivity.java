package org.keyu.timetable;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.net.Uri;
import android.net.http.SslError;
import android.content.Intent;
import android.graphics.Color;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Separate school browser: deliberately has no JavascriptInterface. */
public class SchoolImportActivity extends Activity {
    static final String SCHOOL="xsjw2018.jw.scut.edu.cn";
    static final String SSO="sso.scut.edu.cn";
    static final String LOGIN="https://sso.scut.edu.cn/cas/login?service=http%3A%2F%2Fxsjw2018.jw.scut.edu.cn%2Fsso%2Fdriotlogin";
    static final String RESULT_FILE="school-import.json";
    private WebView browser;
    private TextView status;
    private Button read;
    private String reader;
    private boolean importing=false;
    private int navigation=0;
    static boolean allowed(Uri u) {
        return (SCHOOL.equals(u.getHost())&&("http".equals(u.getScheme())||"https".equals(u.getScheme())) || SSO.equals(u.getHost())&&"https".equals(u.getScheme())) && (u.getPort()==-1||u.getPort()==80&&"http".equals(u.getScheme())||u.getPort()==443&&"https".equals(u.getScheme())) && u.getUserInfo()==null;
    }
    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(0xfff5f6fa);
        LinearLayout bar=new LinearLayout(this);
        Button back=new Button(this);back.setText("返回课屿");back.setOnClickListener(v->finish());bar.addView(back);
        Button refresh=new Button(this);refresh.setText("刷新");refresh.setOnClickListener(v->browser.reload());bar.addView(refresh);
        read=new Button(this);read.setText("读取当前课表");read.setEnabled(false);read.setOnClickListener(v->capture());bar.addView(read,new LinearLayout.LayoutParams(0,-2,1));root.addView(bar);
        status=new TextView(this);status.setTextColor(Color.DKGRAY);status.setPadding(16,8,16,12);status.setText("在学校页面登录 → 个人课表查询 → 选择学期并查询 → 表格 → 读取当前课表。关闭后清除本次登录会话。");root.addView(status);
        browser=new WebView(this);root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);return new WindowInsets.Builder(insets).setInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime(),android.graphics.Insets.NONE).build();}return insets;});root.requestApplyInsets();
        WebSettings s=browser.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setCacheMode(WebSettings.LOAD_NO_CACHE);s.setSupportZoom(true);s.setBuiltInZoomControls(true);s.setDisplayZoomControls(false);s.setUseWideViewPort(true);s.setLoadWithOverviewMode(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser,false);
        browser.setWebChromeClient(new WebChromeClient());
        browser.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){if(allowed(r.getUrl()))return false;status.setText("该跳转不在已适配的学校入口内，请返回后使用 PDF 导入。");return true;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){Uri u=r.getUrl();String host=u.getHost();boolean resource=host!=null&&host.endsWith(".scut.edu.cn")&&"https".equals(u.getScheme());if(allowed(u)||resource&&!r.isForMainFrame())return null;return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",null,new ByteArrayInputStream(new byte[0]));}
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){navigation++;read.setEnabled(false);Uri u=Uri.parse(url);if(!allowed(u)){v.stopLoading();status.setText("已停止未适配的页面跳转。");return;}status.setText(("https".equals(u.getScheme())?"HTTPS 学校登录 / 页面：":"HTTP 学校教务页面：")+u.getHost()+"\n登录后打开个人课表，选择学期并切换表格，再点击读取。");}
            @Override public void onPageFinished(WebView v,String url){read.setEnabled(!importing&&allowed(Uri.parse(url))&&SCHOOL.equals(Uri.parse(url).getHost()));}
            @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,SslError error){handler.cancel();status.setText("学校页面证书验证失败，连接已停止。请稍后重试或使用 PDF 导入。");}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())status.setText("学校页面暂时无法连接。请检查校园网 / 学校 VPN 后刷新，或返回使用 PDF 导入。");}
        });
        try(InputStream in=getAssets().open("school-reader.js")){reader=new String(SchoolImportActivity.readBytes(in),StandardCharsets.UTF_8);}catch(Exception e){status.setText("读取组件缺失，请更新安装包。");return;}
        browser.loadUrl(LOGIN);
    }
    static byte[] readBytes(InputStream in) throws IOException {ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){out.write(buffer,0,n);if(out.size()>2000000)throw new IOException("数据过大");}return out.toByteArray();}
    private void capture(){
        Uri u=Uri.parse(browser.getUrl()==null?"":browser.getUrl());if(!allowed(u)||!SCHOOL.equals(u.getHost())||importing)return;
        importing=true;read.setEnabled(false);final int version=navigation;
        String script=reader+"\n;(function(){try { var docs=[document]; for(var i=0;i<frames.length;i++){try{if(frames[i].location.host===location.host)docs.push(frames[i].document);}catch(e){}} var result=null;for(var j=0;j<docs.length;j++){try{result=KeyuSchoolReader.extractSchoolDocument(docs[j]);break;}catch(e){}}if(!result)throw Error('请打开个人课表查询，选择学期、点击查询并切换表格后再读取。');return JSON.stringify(result);}catch(e){return JSON.stringify({error:String(e.message)});}})()";
        browser.evaluateJavascript(script,value->{
            importing=false;read.setEnabled(true);
            if(version!=navigation){status.setText("页面已变化，请等待加载完成后重新读取。");return;}
            try{
                Object decoded=new JSONTokener(value).nextValue();if(!(decoded instanceof String))throw new Exception("读取失败，请使用 PDF 导入。");String json=(String)decoded;
                if(json.length()>500000)throw new Exception("页面内容过多，请只打开一个学期的课表。");
                JSONObject result=new JSONObject(json);if(result.has("error"))throw new Exception(result.getString("error"));
                if(!"keyu-school-v1".equals(result.optString("format"))||result.getJSONArray("entries").length()==0)throw new Exception("没有找到课程。");
                try(FileOutputStream out=openFileOutput(RESULT_FILE,MODE_PRIVATE)){out.write(json.getBytes(StandardCharsets.UTF_8));}
                setResult(RESULT_OK);finish();
            }catch(Exception e){status.setText(e.getMessage()==null?"读取失败，请改用 PDF 导入。":e.getMessage());}
        });
    }
    @Override public void onBackPressed(){if(browser!=null&&browser.canGoBack())browser.goBack();else finish();}
    @Override protected void onDestroy(){if(browser!=null){browser.stopLoading();browser.clearCache(true);browser.clearHistory();browser.destroy();}CookieManager.getInstance().removeAllCookies(null);WebStorage.getInstance().deleteOrigin("https://"+SSO);WebStorage.getInstance().deleteOrigin("http://"+SCHOOL);WebStorage.getInstance().deleteOrigin("https://"+SCHOOL);super.onDestroy();}
}
