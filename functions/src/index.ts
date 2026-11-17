
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { setGlobalOptions } from "firebase-functions";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
});

// Retention policy
const PENDING_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const PROCESSING_TIMEOUT_MS = 6 * 60 * 60 * 1000;
const FAILED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const COMPLETED_RETENTION_MS = 24 * 60 * 60 * 1000;

function getTimestamp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

export const cleanupWebPrintRequests = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    maxInstances: 1,
  },
  async () => {
    const now = Date.now();

    const pendingCutoff = now - PENDING_TIMEOUT_MS;
    const processingCutoff = now - PROCESSING_TIMEOUT_MS;
    const failedCutoff = now - FAILED_RETENTION_MS;
    const completedCutoff = now - COMPLETED_RETENTION_MS;

    const requestsRef = getDatabase().ref("web_print_requests");
    const snapshot = await requestsRef.get();

    if (!snapshot.exists()) {
      logger.info("No web print requests found. Cleanup skipped.");
      return;
    }

    let expiredPending = 0;
    let expiredProcessing = 0;
    let deletedFailed = 0;
    let deletedCompleted = 0;
    let errors = 0;

    const requestKeys: string[] = [];

    snapshot.forEach((child) => {
      if (child.key) {
        requestKeys.push(child.key);
      }
    });

    for (const key of requestKeys) {
      const requestRef = requestsRef.child(key);

      try {
        const requestSnapshot = await requestRef.get();

        if (!requestSnapshot.exists()) {
          continue;
        }

        const data = requestSnapshot.val() as Record<string, unknown>;
        const status = data.status;

        // Expire requests that Flutter never picked up.
        if (status === "pending") {
          const result = await requestRef.transaction((current) => {
            if (!current || current.status !== "pending") {
              return;
            }

            const createdAt = getTimestamp(current.createdAt);

            if (createdAt === null || createdAt >= pendingCutoff) {
              return;
            }

            return {
              ...current,
              status: "failed",
              error: "Print request expired. The Flutter app did not process it within 24 hours.",
              failedAt: now,
            };
          });

          if (result.committed && result.snapshot.val()?.status === "failed") {
            expiredPending++;
          }

          continue;
        }

        // Expire requests stuck in processing.
        if (status === "processing") {
          const result = await requestRef.transaction((current) => {
            if (!current || current.status !== "processing") {
              return;
            }

            const processingAt =
              getTimestamp(current.processingAt) ??
              getTimestamp(current.createdAt);

            if (
              processingAt === null ||
              processingAt >= processingCutoff
            ) {
              return;
            }

            return {
              ...current,
              status: "failed",
              error: "Print request timed out. Printing did not finish within 6 hours.",
              failedAt: now,
            };
          });

          if (result.committed && result.snapshot.val()?.status === "failed") {
            expiredProcessing++;
          }

          continue;
        }

        // Delete failed requests after 7 days.
        if (status === "failed") {
          const result = await requestRef.transaction((current) => {
            if (!current || current.status !== "failed") {
              return;
            }

            const failedAt =
              getTimestamp(current.failedAt) ??
              getTimestamp(current.createdAt);

            if (failedAt === null || failedAt >= failedCutoff) {
              return;
            }

            return null;
          });

          if (result.committed && !result.snapshot.exists()) {
            deletedFailed++;
          }

          continue;
        }

        // Delete leftover completed requests after 1 day.
        if (status === "completed") {
          const result = await requestRef.transaction((current) => {
            if (!current || current.status !== "completed") {
              return;
            }

            const completedAt =
              getTimestamp(current.completedAt) ??
              getTimestamp(current.createdAt);

            if (completedAt === null || completedAt >= completedCutoff) {
              return;
            }

            return null;
          });

          if (result.committed && !result.snapshot.exists()) {
            deletedCompleted++;
          }
        }
      } catch (error) {
        errors++;

        logger.error("Failed to clean up print request", {
          requestId: key,
          error,
        });
      }
    }

    logger.info("Web print request cleanup completed.", {
      totalRequests: requestKeys.length,
      expiredPending,
      expiredProcessing,
      deletedFailed,
      deletedCompleted,
      errors,
    });
  },
);
