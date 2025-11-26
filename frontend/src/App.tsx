import { useState, useEffect, useRef, useCallback } from 'react';
import { FileUpload } from './components/FileUpload/FileUpload';
import { ProductTable } from './components/ProductTable/ProductTable';
import { WebhookConfig } from './components/WebhookConfig/WebhookConfig';
import { ToastProvider } from './components/Toast';
import { Package, Webhook, Upload, Database } from 'lucide-react';
import { uploadAPI, dbAPI } from './api/endpoints';
import type { UploadProgress } from '@/types';

type Tab = 'upload' | 'products' | 'webhooks';

interface TaskProgress {
  progress: UploadProgress | null;
  error: string | null;
  isConnected: boolean;
}

type TaskProgressMap = {
  [taskId: string]: TaskProgress;
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [activeTasks, setActiveTasks] = useState<TaskProgressMap>({});
  const [dbUsage, setDbUsage] = useState<string>('Loading...');

  // Use refs to track SSE connections and prevent unnecessary recreations
  const eventSourcesRef = useRef<{ [taskId: string]: EventSource }>({});
  const activeTasksRef = useRef<TaskProgressMap>({});

  // Keep refs in sync with state for SSE callbacks
  useEffect(() => {
    activeTasksRef.current = activeTasks;
  }, [activeTasks]);

  // Fetch DB usage once on mount
  useEffect(() => {
    dbAPI.getUsage()
      .then(data => {
        const sizeMB = (data.database_size_bytes / (1024 * 1024)).toFixed(2);
        setDbUsage(`${sizeMB} MB used`);
      })
      .catch(() => {
        setDbUsage('Unavailable');
      });
  }, []);

  // Setup SSE connection for a specific task
  const setupSSEConnection = useCallback((taskId: string) => {
    // Prevent duplicate connections
    if (eventSourcesRef.current[taskId]) {
      return;
    }

    const progressUrl = uploadAPI.getProgressURL(taskId);
    if (!progressUrl) return;

    try {
      const eventSource = new EventSource(progressUrl);
      eventSourcesRef.current[taskId] = eventSource;

      eventSource.onopen = () => {
        // Optional: log connection opened
        console.log(`[SSE] Connected to task ${taskId}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as UploadProgress;

          // Update state with new progress
          setActiveTasks(current => ({
            ...current,
            [taskId]: {
              ...current[taskId],
              progress: data,
              error: null,
              isConnected: true
            }
          }));

          // Auto-close SSE connection when task completes or fails
          if (data.status === 'completed' || data.status === 'failed') {
            console.log(`[SSE] Task ${taskId} completed with status: ${data.status}`);
            eventSource.close();
            delete eventSourcesRef.current[taskId];
          }
        } catch (err) {
          console.error(`[SSE] Error parsing data for task ${taskId}:`, err);
          setActiveTasks(current => ({
            ...current,
            [taskId]: {
              ...current[taskId],
              error: 'Failed to parse progress data'
            }
          }));
        }
      };

      eventSource.onerror = () => {
        console.error(`[SSE] Connection error for task ${taskId}`);
        setActiveTasks(current => ({
          ...current,
          [taskId]: {
            ...current[taskId],
            error: 'Connection lost',
            isConnected: false
          }
        }));
        eventSource.close();
        delete eventSourcesRef.current[taskId];
      };
    } catch (err) {
      console.error(`[SSE] Failed to create EventSource for task ${taskId}:`, err);
      setActiveTasks(current => ({
        ...current,
        [taskId]: {
          ...current[taskId],
          error: 'Failed to connect to progress stream'
        }
      }));
    }
  }, []);

  // When a new task starts, initialize it and setup SSE
  const handleTaskStart = useCallback((taskId: string) => {
    setActiveTasks(current => {
      // Avoid duplicates
      if (taskId in current) return current;

      // Initialize task
      const newTasks = {
        ...current,
        [taskId]: {
          progress: null,
          error: null,
          isConnected: false
        }
      };

      // Setup SSE connection for this task (happens async)
      setTimeout(() => setupSSEConnection(taskId), 0);

      return newTasks;
    });
  }, [setupSSEConnection]);

  // Remove a task from active tasks (called when user dismisses a completed task)
  const handleResetTask = useCallback((taskId: string) => {
    // Close SSE connection if still open
    const eventSource = eventSourcesRef.current[taskId];
    if (eventSource) {
      eventSource.close();
      delete eventSourcesRef.current[taskId];
    }

    // Remove from state
    setActiveTasks(current => {
      const copy = { ...current };
      delete copy[taskId];
      return copy;
    });
  }, []);

  // Cleanup all SSE connections on unmount
  useEffect(() => {
    return () => {
      Object.values(eventSourcesRef.current).forEach(es => {
        if (es) es.close();
      });
      eventSourcesRef.current = {};
    };
  }, []);

  const tabs = [
    { id: 'upload' as Tab, label: 'Upload CSV', icon: Upload },
    { id: 'products' as Tab, label: 'Products', icon: Package },
    { id: 'webhooks' as Tab, label: 'Webhooks', icon: Webhook },
  ];

  return (
    <>
      <ToastProvider />
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #EFF6FF, #E0E7FF)' }}>
        {/* Header */}
        <header style={{
          position: 'relative',
          background: 'white',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#2563EB',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <div style={{ flexGrow: 1 }}>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Product Importer
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: 0
              }}>
                Bulk CSV import & product management
              </p>
            </div>

            {/* Database Icon in top-right corner */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'default',
              }}
              title={dbUsage}
            >
              <Database style={{ width: '32px', height: '32px', color: '#2563EB' }} />
              <span
                style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#2563EB',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {dbUsage}
              </span>
            </div>

          </div>
        </header>

        {/* Tabs */}
        <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <nav style={{ display: 'flex', gap: '32px', paddingTop: '8px', paddingBottom: '8px' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '16px 4px',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                      color: activeTab === tab.id ? '#2563EB' : '#6B7280',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Icon style={{ width: '20px', height: '20px' }} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '24px'
          }}>
            {activeTab === 'upload' && (
              <FileUpload
                activeTasks={activeTasks}
                onTaskStart={handleTaskStart}
                onTaskReset={handleResetTask}
              />
            )}
            {activeTab === 'products' && <ProductTable />}
            {activeTab === 'webhooks' && <WebhookConfig />}
          </div>
        </main>

        {/* Footer */}
        <footer
          style={{
            background: "white",
            borderTop: "1px solid #E5E7EB",
            marginTop: "48px",
          }}
        >
          <div
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "24px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                color: "#4B5563",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Built with FastAPI, Celery, PostgreSQL & React + TypeScript
            </p>

            {/* Bigger & bolder GitHub icon */}
            <a
              href="https://github.com/your-repo-url"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textDecoration: "none",
                color: "#111827",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              <img
                src="/github.png"
                alt="GitHub"
                style={{
                  width: "32px",
                  height: "32px",
                  opacity: 0.95,
                }}
              />
              <span style={{ cursor: "pointer" }}>View on GitHub</span>
            </a>
          </div>
        </footer>

      </div>
    </>
  );
}

export default App;