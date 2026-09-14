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
    private final java.util.Set<String> promotedOrigins=java.util.Collections.synchronizedSet(new java.util.HashSet<>());
    private final java.util.Set<String> openedFrames=new java.util.HashSet<>();
    static String origin(Uri u){return u.getScheme()+"://"+u.getHost()+(u.getPort()==-1?"":":"+u.getPort());}
    static boolean schoolFrame(Uri u){
        String host=u.getHost();
        return host!=null&&host.endsWith(".scut.edu.cn")&&!SSO.equals(host)&&u.getUserInfo()==null&&
            ("https".equals(u.getScheme())&&(u.getPort()==-1||u.getPort()==443)||SCHOOL.equals(host)&&"http".equals(u.getScheme())&&(u.getPort()==-1||u.getPort()==80));
    }
    private boolean allowed(Uri u) {
        return ((SCHOOL.equals(u.getHost())&&("http".equals(u.getScheme())||"https".equals(u.getScheme())) || SSO.equals(u.getHost())&&"https".equals(u.getScheme())) && (u.getPort()==-1||u.getPort()==80&&"http".equals(u.getScheme())||u.getPort()==443&&"https".equals(u.getScheme())) && u.getUserInfo()==null) || schoolFrame(u)&&promotedOrigins.contains(origin(u));
    }
    private boolean readable(Uri u){return allowed(u)&&!SSO.equals(u.getHost());}
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
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){if(allowed(r.getUrl())||!r.isForMainFrame()&&schoolFrame(r.getUrl()))return false;status.setText("该跳转不在已适配的学校入口内，请返回后使用 PDF 导入。");return true;}
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){Uri u=r.getUrl();String host=u.getHost();boolean resource=host!=null&&host.endsWith(".scut.edu.cn")&&"https".equals(u.getScheme());if(allowed(u)||resource&&!r.isForMainFrame())return null;return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",null,new ByteArrayInputStream(new byte[0]));}
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){navigation++;read.setEnabled(false);Uri u=Uri.parse(url);if(!allowed(u)){v.stopLoading();status.setText("已停止未适配的页面跳转。");return;}status.setText(("https".equals(u.getScheme())?"HTTPS 学校登录 / 页面：":"HTTP 学校教务页面：")+u.getHost()+"\n登录后打开个人课表，选择学期并切换表格，再点击读取。");}
            @Override public void onPageFinished(WebView v,String url){read.setEnabled(!importing&&readable(Uri.parse(url)));}
            @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,SslError error){handler.cancel();status.setText("学校页面证书验证失败，连接已停止。请稍后重试或使用 PDF 导入。");}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame())status.setText("学校页面暂时无法连接。请检查校园网 / 学校 VPN 后刷新，或返回使用 PDF 导入。");}
        });
        try(InputStream in=getAssets().open("school-reader.js")){reader=new String(SchoolImportActivity.readBytes(in),StandardCharsets.UTF_8);}catch(Exception e){status.setText("读取组件缺失，请更新安装包。");return;}
        browser.loadUrl(LOGIN);
    }
    static byte[] readBytes(InputStream in) throws IOException {ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){out.write(buffer,0,n);if(out.size()>2000000)throw new IOException("数据过大");}return out.toByteArray();}
    private void capture(){
        Uri u=Uri.parse(browser.getUrl()==null?"":browser.getUrl());if(!readable(u)||importing)return;
        importing=true;read.setEnabled(false);final int version=navigation;
        String script=reader+"\n;(function(){try{return JSON.stringify(KeyuSchoolReader.readSchoolPage(window));}catch(e){return JSON.stringify({error:String(e.message),diagnostic:'reader-runtime-1.1.2'});}})()";
        browser.evaluateJavascript(script,value->{
            importing=false;read.setEnabled(true);
            if(version!=navigation){status.setText("页面已变化，请等待加载完成后重新读取。");return;}
            try{
                Object decoded=new JSONTokener(value).nextValue();if(!(decoded instanceof String))throw new Exception("读取失败，请使用 PDF 导入。");String json=(String)decoded;
                if(json.length()>500000)throw new Exception("页面内容过多，请只打开一个学期的课表。");
                JSONObject result=new JSONObject(json);if(result.has("error")){showReadFailure(result,version);return;}
                if(!"keyu-school-v1".equals(result.optString("format"))||result.getJSONArray("entries").length()==0)throw new Exception("没有找到课程。");
                try(FileOutputStream out=openFileOutput(RESULT_FILE,MODE_PRIVATE)){out.write(json.getBytes(StandardCharsets.UTF_8));}
                setResult(RESULT_OK);finish();
            }catch(Exception e){status.setText(e.getMessage()==null?"读取失败，请改用 PDF 导入。":e.getMessage());}
        });
    }
    private void showReadFailure(JSONObject result,int version){
        String message=result.optString("error"),diagnostic=result.optString("diagnostic","reader-1.1.2");
        java.util.ArrayList<String> candidates=new java.util.ArrayList<>();JSONArray frames=result.optJSONArray("framePages");
        if(frames!=null&&openedFrames.size()<3)for(int i=0;i<frames.length();i++){String url=frames.optString(i);if(url.length()<=8192&&schoolFrame(Uri.parse(url))&&!openedFrames.contains(url)&&!candidates.contains(url))candidates.add(url);}
        if(!candidates.isEmpty())message="页面中有独立的学校内页，当前读取器无法跨页面读取。可以保留登录状态打开内页，确认学期和课程后再次读取。";
        status.setText(message);
        android.app.AlertDialog.Builder dialog=new android.app.AlertDialog.Builder(this).setTitle("课表读取未完成").setMessage(message+"\n\n诊断仅包含页面结构数量和内页来源，不含账号、密码或课程内容。")
            .setNeutralButton("复制诊断",(d,which)->{android.content.ClipboardManager clipboard=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);clipboard.setPrimaryClip(android.content.ClipData.newPlainText("课屿读取诊断",diagnostic));Toast.makeText(this,"诊断已复制，可粘贴反馈",Toast.LENGTH_LONG).show();}).setNegativeButton("继续查看",null);
        if(!candidates.isEmpty())dialog.setPositiveButton("打开课表内页",(d,which)->{
            if(candidates.size()==1){openFrame(candidates.get(0),version);return;}
            String[] labels=new String[candidates.size()];for(int i=0;i<labels.length;i++)labels[i]="学校内页 "+(i+1)+" · "+Uri.parse(candidates.get(i)).getHost();
            new android.app.AlertDialog.Builder(this).setTitle("选择学校内页（按显示面积排序）").setItems(labels,(choice,index)->openFrame(candidates.get(index),version)).setNegativeButton("取消",null).show();
        });
        dialog.show();
    }
    private void openFrame(String url,int version){
        if(version!=navigation||!schoolFrame(Uri.parse(url))||openedFrames.size()>=3)return;
        openedFrames.add(url);promotedOrigins.add(origin(Uri.parse(url)));browser.loadUrl(url);
    }
    @Override public void onBackPressed(){if(browser!=null&&browser.canGoBack())browser.goBack();else finish();}
    @Override protected void onDestroy(){if(browser!=null){browser.stopLoading();browser.clearCache(true);browser.clearHistory();browser.destroy();}CookieManager.getInstance().removeAllCookies(null);WebStorage.getInstance().deleteOrigin("https://"+SSO);WebStorage.getInstance().deleteOrigin("http://"+SCHOOL);WebStorage.getInstance().deleteOrigin("https://"+SCHOOL);for(String site:promotedOrigins)WebStorage.getInstance().deleteOrigin(site);super.onDestroy();}
}
