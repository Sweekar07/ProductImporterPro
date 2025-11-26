import { useState, useEffect, useCallback } from 'react';
import type { UploadProgress } from '@/types';

export const useSSE = (url: string | null) => {
  const [data, setData] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!url) return;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        // console.log('SSE Connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data) as UploadProgress;
          // console.log('SSE Data:', parsedData);
          setData(parsedData);

          // Close connection if completed or failed
          if (parsedData.status === 'completed' || parsedData.status === 'failed') {
            // console.log('SSE Closing - Status:', parsedData.status);
            eventSource?.close();
            setIsConnected(false);
          }
        } catch (err) {
          // console.error('Error parsing SSE data:', err);
          setError('Failed to parse progress data');
        }
      };

      eventSource.onerror = () => {
        // console.error('SSE Error:', err);
        setError('Connection error');
        setIsConnected(false);
        eventSource?.close();
      };
    } catch (err) {
      // console.error('Error creating EventSource:', err);
      setError('Failed to connect');
    }

    return () => {
      if (eventSource) {
        // console.log('SSE Cleanup - Closing connection');
        eventSource.close();
        setIsConnected(false);
      }
    };
  }, [url]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsConnected(false);
  }, []);

  return { data, error, isConnected, reset };
};
