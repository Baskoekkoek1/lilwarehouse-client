import { ref, onUnmounted } from "vue";

export function useWakeLock() {
  const wakeLock = ref<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    // Check if the API is supported and if we don't already have a lock
    if ("wakeLock" in navigator && !wakeLock.value) {
      try {
        wakeLock.value = await navigator.wakeLock.request("screen");
        console.log("🔒 Wake Lock active. System will stay awake.");

        wakeLock.value.onrelease = () => {
          console.log("🔓 Wake Lock was released.");
        };
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(`❌ Wake Lock failed: ${err.name}, ${err.message}`);
        }
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock.value) {
      await wakeLock.value.release();
      wakeLock.value = null;
    }
  };

  // Re-acquire lock if tab was minimized and then maximized/returned to
  const handleVisibilityChange = async () => {
    if (wakeLock.value !== null && document.visibilityState === "visible") {
      await requestWakeLock();
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  // Cleanup to prevent memory leaks or unexpected locks
  onUnmounted(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    releaseWakeLock();
  });

  return { requestWakeLock, releaseWakeLock };
}
