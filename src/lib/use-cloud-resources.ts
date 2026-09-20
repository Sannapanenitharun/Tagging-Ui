"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionStatus, listAwsResources, listGcpResources } from "./api-client";
import type { CloudResource, SessionStatus } from "./types";

/** Loads the first page of resources from every connected cloud, in parallel. */
export function useCloudResources() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    const errs: string[] = [];
    try {
      const s = await getSessionStatus();
      setStatus(s);
      const [aws, gcp] = await Promise.all([
        s.aws
          ? listAwsResources().catch((e: Error) => {
              errs.push(`AWS: ${e.message}`);
              return null;
            })
          : null,
        s.gcp
          ? listGcpResources().catch((e: Error) => {
              errs.push(`GCP: ${e.message}`);
              return null;
            })
          : null,
      ]);
      setResources([...(aws?.resources ?? []), ...(gcp?.resources ?? [])]);
    } catch (e) {
      errs.push((e as Error).message);
    } finally {
      setErrors(errs);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { status, resources, loading, errors, reload };
}
