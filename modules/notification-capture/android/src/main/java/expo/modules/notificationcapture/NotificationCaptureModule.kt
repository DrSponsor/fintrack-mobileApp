package expo.modules.notificationcapture

import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val EVENT_ALERT = "onAlert"

/** Colon-separated list of flattened ComponentNames the user has approved. */
private const val ENABLED_LISTENERS = "enabled_notification_listeners"

class NotificationCaptureModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is unavailable" }

  override fun definition() = ModuleDefinition {
    Name("NotificationCapture")

    Events(EVENT_ALERT)

    // Only hold the listener while JS actually has a subscriber, so a
    // backgrounded app is not paying to marshal events nobody receives. The
    // buffer keeps collecting regardless — see NotificationCaptureStore.
    OnStartObserving {
      NotificationCaptureStore.setListener { alert ->
        sendEvent(EVENT_ALERT, alert.toBundle())
      }
    }

    OnStopObserving {
      NotificationCaptureStore.setListener(null)
    }

    /**
     * Whether the user has granted notification-listener access.
     *
     * Read from Settings.Secure rather than inferred from the service running:
     * declaring the service in the manifest does nothing on its own, and the
     * user can revoke access at any time from system settings without the app
     * being told. This is the only reliable source of truth.
     */
    Function("hasAccess") {
      val approved = Settings.Secure
        .getString(context.contentResolver, ENABLED_LISTENERS)
        .orEmpty()
      // Entries are "package/class". Matching on the package prefix, not
      // `contains`, so a different app whose package merely CONTAINS ours
      // cannot make this read as granted.
      approved.split(':').any { it.startsWith("${context.packageName}/") }
    }

    /**
     * Opens the system screen where access is granted. There is no programmatic
     * grant and no permission dialog — this consent is deliberately a place the
     * user has to walk to, so it cannot be socially engineered in one tap.
     */
    Function("requestAccess") {
      context.startActivity(
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    /** Returns everything captured since the last call, and empties the buffer. */
    Function("drain") {
      NotificationCaptureStore.drain().map { it.toBundle() }
    }
  }
}
