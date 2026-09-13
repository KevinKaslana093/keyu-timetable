package org.keyu.timetable;
import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;

public class ReminderReceiver extends BroadcastReceiver {
    static PendingIntent pending(Context c){return PendingIntent.getBroadcast(c,1,new Intent(c,ReminderReceiver.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static JSONObject next(Context c,long now){
        try{JSONArray list=new JSONArray(c.getSharedPreferences("keyu",0).getString("events","[]"));JSONObject first=null;long last=c.getSharedPreferences("keyu",0).getLong("lastAlarm",0);
            for(int i=0;i<list.length();i++){JSONObject e=list.getJSONObject(i);long at=e.getLong("at");if(at>last&&e.getLong("end")>now&&(first==null||at<first.getLong("at")))first=e;}return first;
        }catch(Exception e){return null;}
    }
    public static void schedule(Context c){
        AlarmManager am=c.getSystemService(AlarmManager.class);am.cancel(pending(c));
        if(!c.getSharedPreferences("keyu",0).getBoolean("reminders",false))return;
        JSONObject e=next(c,System.currentTimeMillis());if(e==null)return;
        long at=Math.max(e.optLong("at"),System.currentTimeMillis()+1000);
        try{if(Build.VERSION.SDK_INT<31||am.canScheduleExactAlarms())am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c));else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c));}catch(SecurityException ex){am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c));}
    }
    @Override public void onReceive(Context c,Intent intent){
        if(!c.getSharedPreferences("keyu",0).getBoolean("reminders",false))return;
        JSONObject e=next(c,System.currentTimeMillis());
        if(e!=null&&e.optLong("at")<=System.currentTimeMillis()+2000){
            NotificationManager nm=c.getSystemService(NotificationManager.class);nm.createNotificationChannel(new NotificationChannel("classes","上课提醒",NotificationManager.IMPORTANCE_HIGH));
            PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            String title=e.optString("title"),body=e.optString("body");
            try{JSONArray all=new JSONArray(c.getSharedPreferences("keyu",0).getString("events","[]"));StringBuilder titles=new StringBuilder(),details=new StringBuilder();for(int i=0;i<all.length();i++){JSONObject item=all.getJSONObject(i);if(item.optLong("at")==e.optLong("at")){if(titles.length()>0){titles.append(" / ");details.append("\n");}titles.append(item.optString("title"));details.append(item.optString("title")).append(" · ").append(item.optString("body"));}}title=titles.toString();body=details.toString();}catch(Exception ignored){}
            try{nm.notify(1,new Notification.Builder(c,"classes").setSmallIcon(R.drawable.ic_keyu).setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body)).setContentIntent(open).setAutoCancel(true).build());}catch(SecurityException ignored){}
            c.getSharedPreferences("keyu",0).edit().putLong("lastAlarm",e.optLong("at")).apply();
        }
        schedule(c);
    }
}
