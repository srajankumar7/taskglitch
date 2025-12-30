import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { Task } from '@/types';
import { calculateROI } from '@/utils/logic';

type TasksContextValue = {
  tasks: Task[];
  derivedSorted: Task[];
  loading: boolean;
  error: string | null;

  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  undoDelete: () => void;
  clearLastDeleted: () => void;

  lastDeleted: Task | null;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

const STORAGE_KEY = 'taskglitch_tasks';

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);

  const hasLoadedRef = useRef(false);

  /* --------------------------------
     Load tasks (BUG 1 safe)
  --------------------------------- */
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setTasks(stored ? JSON.parse(stored) : []);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  /* --------------------------------
     Persist tasks
  --------------------------------- */
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, loading]);

  /* --------------------------------
     CRUD operations
  --------------------------------- */
  const addTask = useCallback((payload: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...payload,
      id: crypto.randomUUID(),
      roi: calculateROI(payload.revenue, payload.timeTaken)
    };

    setTasks(prev => [newTask, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? {
              ...task,
              ...patch,
              roi:
                patch.revenue !== undefined || patch.timeTaken !== undefined
                  ? calculateROI(
                      patch.revenue ?? task.revenue,
                      patch.timeTaken ?? task.timeTaken
                    )
                  : task.roi
            }
          : task
      )
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id) || null;
      if (target) setLastDeleted(target);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  /* --------------------------------
     Undo / Clear delete (BUG 2 fix)
  --------------------------------- */
  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setTasks(prev => [lastDeleted, ...prev]);
    setLastDeleted(null);
  }, [lastDeleted]);

  const clearLastDeleted = useCallback(() => {
    setLastDeleted(null);
  }, []);

  /* --------------------------------
     Stable sorting (BUG 3 safe)
  --------------------------------- */
  const derivedSorted = useMemo(() => {
    const priorityRank: Record<string, number> = {
      High: 3,
      Medium: 2,
      Low: 1
    };

    return [...tasks].sort((a, b) => {
      const roiDiff = (b.roi ?? 0) - (a.roi ?? 0);
      if (roiDiff !== 0) return roiDiff;

      const prioDiff =
        (priorityRank[b.priority] || 0) -
        (priorityRank[a.priority] || 0);
      if (prioDiff !== 0) return prioDiff;

      return a.title.localeCompare(b.title);
    });
  }, [tasks]);

  const value: TasksContextValue = {
    tasks,
    derivedSorted,
    loading,
    error,

    addTask,
    updateTask,
    deleteTask,

    undoDelete,
    clearLastDeleted,

    lastDeleted
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasksContext() {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error('useTasksContext must be used inside TasksProvider');
  }
  return ctx;
}
