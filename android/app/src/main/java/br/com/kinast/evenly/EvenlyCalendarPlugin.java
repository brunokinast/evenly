package br.com.kinast.evenly;

import android.Manifest;
import android.accounts.Account;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.database.ContentObserver;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.CalendarContract.Calendars;
import android.provider.CalendarContract.Events;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;

/**
 * Gemini intake (specs/features/assistant.md): Gemini writes expenses as events in a Google calendar named
 * "Evenly"; this reads them from the phone's calendar store, asks for a sync first (AST-3) and deletes the
 * handled ones (AST-9, AST-10). JS side: src/app/calendarInbox.ts.
 */
@CapacitorPlugin(
    name = "EvenlyCalendar",
    permissions = @Permission(
        alias = "calendar",
        strings = { Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR }
    )
)
public class EvenlyCalendarPlugin extends Plugin {

    private static final String CALENDAR_NAME = "Evenly";
    private ContentObserver observer;

    private boolean allowed() {
        return getPermissionState("calendar") == PermissionState.GRANTED;
    }

    private String access() {
        PermissionState state = getPermissionState("calendar");
        if (state == PermissionState.GRANTED) return "granted";
        if (state == PermissionState.DENIED) return "denied";
        return "prompt";
    }

    /** The "Evenly" calendars on the phone (normally one, from the Google account), with their accounts. */
    private List<Long> calendars(List<Account> accounts) {
        List<Long> ids = new ArrayList<>();
        String[] columns = { Calendars._ID, Calendars.ACCOUNT_NAME, Calendars.ACCOUNT_TYPE };
        try (
            Cursor c = getContext()
                .getContentResolver()
                .query(
                    Calendars.CONTENT_URI,
                    columns,
                    Calendars.CALENDAR_DISPLAY_NAME + " = ? COLLATE NOCASE AND " + Calendars.DELETED + " = 0",
                    new String[] { CALENDAR_NAME },
                    null
                )
        ) {
            while (c != null && c.moveToNext()) {
                ids.add(c.getLong(0));
                if (accounts != null) accounts.add(new Account(c.getString(1), c.getString(2)));
            }
        }
        return ids;
    }

    private JSObject status() {
        JSObject out = new JSObject();
        out.put("access", access());
        out.put("found", allowed() && !calendars(null).isEmpty());
        return out;
    }

    @PluginMethod
    public void check(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (allowed()) call.resolve(status());
        else requestPermissionForAlias("calendar", call, "accessResult");
    }

    @PermissionCallback
    private void accessResult(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void read(PluginCall call) {
        if (!allowed()) {
            call.reject("Calendar access not allowed");
            return;
        }
        watch();
        List<Account> accounts = new ArrayList<>();
        List<Long> ids = calendars(accounts);
        // AST-3: Gemini's event reaches the phone with the next sync; ask for one on each visit (not on every
        // change: a sync changes the calendar, which would ask again).
        for (Account account : call.getBoolean("sync", false) ? accounts : new ArrayList<Account>()) {
            Bundle extras = new Bundle();
            extras.putBoolean(ContentResolver.SYNC_EXTRAS_MANUAL, true);
            extras.putBoolean(ContentResolver.SYNC_EXTRAS_EXPEDITED, true);
            try {
                ContentResolver.requestSync(account, "com.android.calendar", extras);
            } catch (RuntimeException ignored) {
                // A local calendar has nothing to sync.
            }
        }
        JSArray events = new JSArray();
        if (!ids.isEmpty()) {
            StringBuilder in = new StringBuilder();
            for (Long id : ids) in.append(in.length() == 0 ? "" : ",").append(id);
            String[] columns = { Events._ID, Events.TITLE, Events.DTSTART, Events.ALL_DAY };
            try (
                Cursor c = getContext()
                    .getContentResolver()
                    .query(
                        Events.CONTENT_URI,
                        columns,
                        Events.CALENDAR_ID + " IN (" + in + ") AND " + Events.DELETED + " = 0",
                        null,
                        Events.DTSTART + " ASC"
                    )
            ) {
                while (c != null && c.moveToNext()) {
                    JSObject e = new JSObject();
                    e.put("id", String.valueOf(c.getLong(0)));
                    e.put("title", c.getString(1) == null ? "" : c.getString(1));
                    e.put("start", c.getLong(2));
                    e.put("allDay", c.getInt(3) == 1);
                    events.put(e);
                }
            }
        }
        JSObject out = new JSObject();
        out.put("found", !ids.isEmpty());
        out.put("events", events);
        call.resolve(out);
    }

    @PluginMethod
    public void remove(PluginCall call) {
        if (!allowed()) {
            call.reject("Calendar access not allowed");
            return;
        }
        JSONArray ids = call.getArray("ids", new JSArray());
        ContentResolver resolver = getContext().getContentResolver();
        for (int i = 0; i < ids.length(); i++) {
            long id = Long.parseLong(ids.optString(i, "-1"));
            // Not as the sync adapter: the provider marks it deleted and the next sync removes it from Google.
            resolver.delete(ContentUris.withAppendedId(Events.CONTENT_URI, id), null, null);
        }
        call.resolve();
    }

    /** Tells JS when the calendar changes (e.g. a sync brought Gemini's new event). Needs the permission. */
    private void watch() {
        if (observer != null) return;
        observer = new ContentObserver(new Handler(Looper.getMainLooper())) {
            @Override
            public void onChange(boolean selfChange, Uri uri) {
                notifyListeners("change", new JSObject());
            }
        };
        getContext().getContentResolver().registerContentObserver(Events.CONTENT_URI, true, observer);
    }

    @Override
    protected void handleOnDestroy() {
        if (observer != null) getContext().getContentResolver().unregisterContentObserver(observer);
        observer = null;
    }
}
