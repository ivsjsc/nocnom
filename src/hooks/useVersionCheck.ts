import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  buildTime: number;
}

export function useVersionCheck(checkIntervalMs = 60000) {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [initialBuildTime, setInitialBuildTime] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (!res.ok) return;

        const data: VersionInfo = await res.json();
        if (!isMounted) return;

        if (initialBuildTime === null) {
          setInitialBuildTime(data.buildTime);
        } else if (data.buildTime && data.buildTime > initialBuildTime) {
          setHasNewVersion(true);
        }
      } catch (err) {
        console.debug('Lỗi khi kiểm tra phiên bản:', err);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, checkIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [initialBuildTime, checkIntervalMs]);

  const reloadApp = () => {
    window.location.reload();
  };

  return { hasNewVersion, reloadApp };
}
