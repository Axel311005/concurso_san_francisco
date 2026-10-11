"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SessionSyncMinimal,
  SessionSyncPayload,
  SyncRole,
} from "@/lib/types";

type SyncResponse = SessionSyncPayload | SessionSyncMinimal;

function isFullSync(data: SyncResponse): data is SessionSyncPayload {
  return data.changed !== false;
}

type Options = {
  code: string;
  role: SyncRole;
  teamId?: string;
  intervalMs?: number;
  enabled?: boolean;
};

export function useSessionSync({
  code,
  role,
  teamId,
  intervalMs = 2000,
  enabled = true,
}: Options) {
  const [state, setState] = useState<SessionSyncPayload | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const revisionRef = useRef(0);

  const fetchSync = useCallback(async () => {
    if (!enabled) return;
    try {
      const params = new URLSearchParams({
        role,
        since: String(revisionRef.current),
      });
      if (teamId) params.set("teamId", teamId);
      const res = await fetch(`/api/sessions/${code}/sync?${params}`);
      if (!res.ok) throw new Error("sync failed");
      const data = (await res.json()) as SyncResponse;
      revisionRef.current = data.revision;
      if (!isFullSync(data)) {
        setState((prev) =>
          prev
            ? {
                ...prev,
                revision: data.revision,
                status: data.status,
                timerEndsAt: data.timerEndsAt,
              }
            : null,
        );
      } else {
        setState(data);
      }
      setReconnecting(false);
    } catch {
      setReconnecting(true);
    }
  }, [code, role, teamId, enabled]);

  useEffect(() => {
    fetchSync();
    const id = setInterval(fetchSync, intervalMs);
    const onOnline = () => {
      revisionRef.current = 0;
      fetchSync();
    };
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchSync, intervalMs]);

  return { state, reconnecting, refresh: fetchSync };
}
