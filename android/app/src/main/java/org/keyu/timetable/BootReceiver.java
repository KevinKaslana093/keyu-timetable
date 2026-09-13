package org.keyu.timetable;
import android.content.*;
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i){ReminderReceiver.schedule(c);}
}
