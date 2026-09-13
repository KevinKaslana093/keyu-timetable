package org.keyu.timetable;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.*;
import android.view.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> picker;
    private byte[] exportBytes;
    static final String ORIGIN="https://keyu.local/";
    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(0xfff5f6fa);
        getWindow().setNavigationBarColor(0xfff5f6fa);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        web=new WebView(this);
        setContentView(web);
        web.setOnApplyWindowInsetsListener((v,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(i.left,i.top,i.right,i.bottom);}
            return insets;
        });
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new Bridge(),"KeyuNative");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req){
                Uri u=req.getUrl();
                if(!"https".equals(u.getScheme())||!"keyu.local".equals(u.getHost()))return new WebResourceResponse("text/plain","utf-8",403,"Blocked",null,new ByteArrayInputStream(new byte[0]));
                String path=u.getPath();if(path==null||path.equals("/"))path="/index.html";
                if(path.contains(".."))return new WebResourceResponse("text/plain","utf-8",null);
                try{String mime=path.endsWith(".js")||path.endsWith(".mjs")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".svg")?"image/svg+xml":path.endsWith(".png")?"image/png":path.endsWith(".json")?"application/json":path.endsWith(".html")?"text/html":"application/octet-stream";
                    Map<String,String> headers=new HashMap<>();headers.put("Access-Control-Allow-Origin",ORIGIN.substring(0,ORIGIN.length()-1));
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(path.substring(1)));
                }catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
                if(r.getUrl().toString().startsWith(ORIGIN))return false;
                if("https".equals(r.getUrl().getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,r.getUrl()));}catch(Exception e){toast("没有可用的浏览器");}
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams params){
                if(picker!=null)picker.onReceiveValue(null);picker=cb;
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");
                try{startActivityForResult(i,10);}catch(Exception e){picker.onReceiveValue(null);picker=null;toast("请安装或启用系统文件管理器");}return true;
            }
            @Override public boolean onJsConfirm(WebView w,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("确定",(d,x)->result.confirm()).setNegativeButton("取消",(d,x)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
        });
        web.loadUrl(ORIGIN+"index.html");
    }
    void toast(String message){runOnUiThread(()->Toast.makeText(this,message,Toast.LENGTH_LONG).show());}
    class Bridge {
        @JavascriptInterface public String getState(){return getSharedPreferences("keyu",0).getString("state","");}
        @JavascriptInterface public void saveState(String data){if(data.length()>8_000_000)throw new IllegalArgumentException("课表数据过大");if(!getSharedPreferences("keyu",0).edit().putString("state",data).commit())throw new IllegalStateException("无法写入课表");}
        @JavascriptInterface public void syncEvents(String data){getSharedPreferences("keyu",0).edit().putString("events",data).apply();ReminderReceiver.schedule(MainActivity.this);}
        @JavascriptInterface public String getReminderStatus(){
            boolean enabled=getSharedPreferences("keyu",0).getBoolean("reminders",false);
            NotificationManager nm=getSystemService(NotificationManager.class);AlarmManager am=getSystemService(AlarmManager.class);
            return !enabled?"上课提醒尚未开启":!nm.areNotificationsEnabled()?"通知权限未开启，无法显示上课提醒":Build.VERSION.SDK_INT>=31&&!am.canScheduleExactAlarms()?"通知已开启；精确闹钟权限未开启，提醒可能延迟":"本地提醒已开启。请在系统省电设置中允许课屿后台运行。";
        }
        @JavascriptInterface public void enableReminders(){runOnUiThread(()->{
            getSharedPreferences("keyu",0).edit().putBoolean("reminders",true).apply();
            if(Build.VERSION.SDK_INT>=33&&checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},12);return;}
            requestExact();
        });}
        @JavascriptInterface public void openSettings(){runOnUiThread(()->startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName())));}
        @JavascriptInterface public void disableReminders(){getSharedPreferences("keyu",0).edit().putBoolean("reminders",false).apply();ReminderReceiver.schedule(MainActivity.this);runOnUiThread(()->web.evaluateJavascript("window.keyuNativeStatus?.()",null));}
        @JavascriptInterface public void saveFile(String name,String mime,String contents){runOnUiThread(()->{exportBytes=contents.getBytes(StandardCharsets.UTF_8);Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType(mime.split(";")[0]);i.putExtra(Intent.EXTRA_TITLE,name);try{startActivityForResult(i,11);}catch(Exception e){toast("无法打开文件保存窗口");exportBytes=null;}});}
    }
    private void requestExact(){
        AlarmManager am=getSystemService(AlarmManager.class);
        if(Build.VERSION.SDK_INT>=31&&!am.canScheduleExactAlarms())new AlertDialog.Builder(this).setTitle("准时收到上课提醒").setMessage("允许“闹钟和提醒”后，可在锁屏时安排精确提醒。未允许时可能延迟。").setPositiveButton("去设置",(d,x)->{try{startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));}catch(Exception e){toast("请在系统应用权限中设置");}}).setNegativeButton("稍后",(d,x)->ReminderReceiver.schedule(this)).show();
        ReminderReceiver.schedule(this);web.evaluateJavascript("window.keyuNativeStatus?.()",null);
    }
    @Override public void onRequestPermissionsResult(int code,String[] perms,int[] results){super.onRequestPermissionsResult(code,perms,results);if(code==12){if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)requestExact();else toast("通知权限未允许，可改用日历导出");}}
    @Override protected void onResume(){super.onResume();ReminderReceiver.schedule(this);if(web!=null)web.evaluateJavascript("window.keyuNativeStatus?.()",null);}
    @Override protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);
        if(req==10&&picker!=null){picker.onReceiveValue(res==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);picker=null;}
        if(req==11&&exportBytes!=null){if(res==RESULT_OK&&data!=null)try(OutputStream o=getContentResolver().openOutputStream(data.getData())){if(o==null)throw new IOException();o.write(exportBytes);toast("文件已保存");}catch(Exception e){toast("保存失败，请重试");}exportBytes=null;}
    }
    @Override public void onBackPressed(){web.evaluateJavascript("document.getElementById('modal').hidden",value->{if("false".equals(value))web.evaluateJavascript("document.querySelector('[data-action=close]').click()",null);else finish();});}
    @Override protected void onDestroy(){if(picker!=null)picker.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("KeyuNative");web.destroy();}super.onDestroy();}
}
