package expo.modules.notificationcapture

import android.os.Bundle

/**
 * One captured notification, flattened to the fields a parser needs.
 */
data class CapturedAlert(
  val packageName: String,
  val appLabel: String,
  val title: String,
  val text: String,
  val subText: String,
  val postedAt: Long,
) {
  fun toBundle(): Bundle = Bundle().apply {
    putString("packageName", packageName)
    putString("appLabel", appLabel)
    putString("title", title)
    putString("text", text)
    putString("subText", subText)
    // Double, not Long. The bridge marshals JS numbers as doubles, and a Long
    // epoch would be silently mangled on the way across.
    putDouble("postedAt", postedAt.toDouble())
  }
}

/**
 * The handover point between the listener service and JavaScript.
 *
 * ── Why a buffer and not just an event ───────────────────────────────────
 * The service and the JS runtime have completely different lifetimes. Android
 * binds the listener whenever the OS feels like it and keeps it alive with the
 * app backgrounded or closed; the JS runtime exists only while the app is
 * actually running. Bank alerts arrive precisely when nobody is looking at the
 * app — that is the entire point of the product — so a design that only emits
 * live events would drop essentially every real alert and work perfectly in
 * every test where the app happens to be open.
 *
 * So every alert lands in a bounded buffer first. JS drains it on launch and on
 * resume, and additionally receives live events while it is attached.
 *
 * ── Deliberately in memory, deliberately lossy ───────────────────────────
 * The buffer does not survive process death, and it is capped. Both are correct
 * FOR THIS SPIKE, whose only job is proving alerts can be seen and what their
 * text looks like. Durable capture is a database concern, and writing to
 * WatermelonDB from a background service is a separate piece of work with its
 * own failure modes — it should not be smuggled in under a spike.
 *
 * This is a known limitation, not an oversight: alerts arriving while the app
 * is fully dead are lost today.
 */
object NotificationCaptureStore {
  /** Roughly a day of alerts for a busy account; enough to inspect, small
   *  enough that a runaway notifier cannot exhaust memory. */
  private const val CAPACITY = 200

  private val buffer = ArrayDeque<CapturedAlert>()
  private var listener: ((CapturedAlert) -> Unit)? = null

  fun record(alert: CapturedAlert) {
    // The listener is read under the lock but invoked OUTSIDE it. Calling into
    // the module — which hops to the JS thread — while holding this monitor is
    // how a deadlock gets built.
    val current = synchronized(this) {
      buffer.addLast(alert)
      while (buffer.size > CAPACITY) {
        buffer.removeFirst()
      }
      listener
    }
    current?.invoke(alert)
  }

  /** Returns everything held and empties the buffer. */
  fun drain(): List<CapturedAlert> = synchronized(this) {
    val held = buffer.toList()
    buffer.clear()
    held
  }

  fun setListener(next: ((CapturedAlert) -> Unit)?) = synchronized(this) {
    listener = next
  }
}
