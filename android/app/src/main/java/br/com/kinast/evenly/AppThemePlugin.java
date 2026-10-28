package br.com.kinast.evenly;

import android.app.UiModeManager;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * APP-2 on Android: hands the in-app theme to the system, which keeps it and draws the next launch
 * screen in it (Android 12+). "system" follows the phone again.
 */
@CapacitorPlugin(name = "AppTheme")
public class AppThemePlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            String theme = call.getString("theme", "system");
            int mode = "dark".equals(theme)
                ? UiModeManager.MODE_NIGHT_YES
                : "light".equals(theme) ? UiModeManager.MODE_NIGHT_NO : UiModeManager.MODE_NIGHT_AUTO;
            UiModeManager ui = (UiModeManager) getContext().getSystemService(Context.UI_MODE_SERVICE);
            ui.setApplicationNightMode(mode);
        }
        call.resolve();
    }
}
