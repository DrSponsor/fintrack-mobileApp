package expo.modules.notificationcapture

import android.app.Notification
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Receives every notification posted on the device once the user has enabled
 * the listener in system settings.
 *
 * Nothing is filtered here. Which packages count as banks is a policy decision
 * that belongs in JavaScript, where it can change without a native rebuild —
 * and during the spike we specifically want to see everything, because that is
 * what lets any notification at all prove the plumbing works.
 */
class NotificationCaptureService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val extras = sbn.notification?.extras ?: return

    fun extra(key: String): String = extras.getCharSequence(key)?.toString().orEmpty()

    // EXTRA_BIG_TEXT before EXTRA_TEXT, and this ordering matters more than it
    // looks. A collapsed notification puts a TRUNCATED body in EXTRA_TEXT and
    // the full one in EXTRA_BIG_TEXT. Bank alerts are long — account, amount,
    // balance, reference — so reading EXTRA_TEXT first would hand the parser a
    // string cut off mid-figure, and it would fail on exactly the longest and
    // most information-rich alerts.
    val body = extra(Notification.EXTRA_BIG_TEXT).ifEmpty { extra(Notification.EXTRA_TEXT) }

    NotificationCaptureStore.record(
      CapturedAlert(
        packageName = sbn.packageName.orEmpty(),
        appLabel = resolveAppLabel(sbn.packageName.orEmpty()),
        title = extra(Notification.EXTRA_TITLE),
        text = body,
        subText = extra(Notification.EXTRA_SUB_TEXT),
        postedAt = sbn.postTime,
      )
    )
  }

  /** Human-readable app name, so the debug list reads "Opay" rather than
   *  "team.opay.pay". Falls back to the package id if the app has since been
   *  uninstalled. */
  private fun resolveAppLabel(packageName: String): String = try {
    packageManager.getApplicationLabel(
      packageManager.getApplicationInfo(packageName, 0)
    ).toString()
  } catch (_: PackageManager.NameNotFoundException) {
    packageName
  }
}
