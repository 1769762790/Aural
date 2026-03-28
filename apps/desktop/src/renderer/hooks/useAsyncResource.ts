import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const resourceCache = new Map<string, unknown>();

export const useAsyncResource = <T>(
  factory: () => Promise<T>,
  dependencies: ReadonlyArray<unknown>,
  cacheKey?: string
): AsyncState<T> => {
  const cachedData = cacheKey ? (resourceCache.get(cacheKey) as T | null | undefined) : undefined;
  const [data, setData] = useState<T | null>(cachedData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(cachedData === undefined);
  const dataRef = useRef<T | null>(cachedData ?? null);
  const factoryRef = useRef(factory);

  useEffect(() => {
    factoryRef.current = factory;
  }, [factory]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!cacheKey) {
      return;
    }

    const nextCachedData = resourceCache.get(cacheKey) as T | null | undefined;
    setData(nextCachedData ?? null);
    setError(null);
    setIsLoading(nextCachedData === undefined);
  }, [cacheKey]);

  const refresh = useCallback(async () => {
    setIsLoading((current) => current || !dataRef.current);
    setError(null);

    try {
      const nextData = await factoryRef.current();
      if (cacheKey) {
        resourceCache.set(cacheKey, nextData);
      }
      dataRef.current = nextData;
      setData(nextData);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, ...dependencies]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, error, isLoading, refresh };
};
