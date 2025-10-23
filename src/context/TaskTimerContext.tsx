import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TaskPauseState {
  isPaused: boolean;
  pausedTime: number;
  pauseStartTime: number | null;
  userId?: string; // Track which user owns/is assigned this task
  assignedTo?: string; // Track who the task is assigned to
}

interface TaskTimerContextType {
  pauseStates: Record<string, TaskPauseState>;
  registerTask: (taskId: string, initialState?: TaskPauseState) => void;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => void;
  pauseAllTasks: () => void;
  resumeAllTasks: () => void;
  pauseUserTasks: (userId: string) => void;
  resumeUserTasks: (userId: string) => void;
  isAnyTaskRunning: () => boolean;
}

const TaskTimerContext = createContext<TaskTimerContextType | undefined>(undefined);

export function TaskTimerProvider({ children }: { children: ReactNode }) {
  const [pauseStates, setPauseStates] = useState<Record<string, TaskPauseState>>({});

  const registerTask = useCallback((taskId: string, initialState?: TaskPauseState) => {
    console.log('📝 Registering task:', taskId);
    setPauseStates(prev => {
      if (prev[taskId]) {
        return prev; // Already registered
      }
      return {
        ...prev,
        [taskId]: initialState || {
          isPaused: false,
          pausedTime: 0,
          pauseStartTime: null,
        }
      };
    });
  }, []);

  const pauseTask = useCallback((taskId: string) => {
    console.log('⏸️ Pausing task:', taskId);
    setPauseStates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        isPaused: true,
        pauseStartTime: Date.now(),
      }
    }));
  }, []);

  const resumeTask = useCallback((taskId: string) => {
    console.log('🟢 Resuming task:', taskId);
    setPauseStates(prev => {
      const currentState = prev[taskId];
      if (!currentState) return prev;

      let newPausedTime = currentState.pausedTime;
      if (currentState.pauseStartTime) {
        const pauseDuration = Date.now() - currentState.pauseStartTime;
        newPausedTime += pauseDuration;
      }

      return {
        ...prev,
        [taskId]: {
          isPaused: false,
          pausedTime: newPausedTime,
          pauseStartTime: null,
        }
      };
    });
  }, []);

  const pauseAllTasks = useCallback(() => {
    console.log('⏸️ Pausing all tasks due to inactivity');
    setPauseStates(prev => {
      const newStates = { ...prev };
      let pausedCount = 0;
      Object.keys(newStates).forEach(taskId => {
        if (!newStates[taskId].isPaused) {
          newStates[taskId] = {
            ...newStates[taskId],
            isPaused: true,
            pauseStartTime: Date.now(),
          };
          pausedCount++;
        }
      });
      console.log(`⏸️ Paused ${pausedCount} tasks`);
      return newStates;
    });
  }, []);

  const resumeAllTasks = useCallback(() => {
    console.log('🟢 Resuming all tasks');
    setPauseStates(prev => {
      const newStates = { ...prev };
      let resumedCount = 0;
      Object.keys(newStates).forEach(taskId => {
        const currentState = newStates[taskId];
        if (currentState.isPaused) {
          let newPausedTime = currentState.pausedTime;
          if (currentState.pauseStartTime) {
            const pauseDuration = Date.now() - currentState.pauseStartTime;
            newPausedTime += pauseDuration;
          }
          newStates[taskId] = {
            ...currentState,
            isPaused: false,
            pausedTime: newPausedTime,
            pauseStartTime: null,
          };
          resumedCount++;
        }
      });
      console.log(`🟢 Resumed ${resumedCount} tasks`);
      return newStates;
    });
  }, []);

  const pauseUserTasks = useCallback((userId: string) => {
    console.log('⏸️ Pausing tasks for user:', userId);
    setPauseStates(prev => {
      const newStates = { ...prev };
      let pausedCount = 0;
      Object.keys(newStates).forEach(taskId => {
        const task = newStates[taskId];
        // Pause if user created the task OR task is assigned to user
        if (!task.isPaused && (task.userId === userId || task.assignedTo === userId)) {
          newStates[taskId] = {
            ...task,
            isPaused: true,
            pauseStartTime: Date.now(),
          };
          pausedCount++;
        }
      });
      console.log(`⏸️ Paused ${pausedCount} tasks for user ${userId}`);
      return newStates;
    });
  }, []);

  const resumeUserTasks = useCallback((userId: string) => {
    console.log('🟢 Resuming tasks for user:', userId);
    setPauseStates(prev => {
      const newStates = { ...prev };
      let resumedCount = 0;
      Object.keys(newStates).forEach(taskId => {
        const task = newStates[taskId];
        // Resume if user created the task OR task is assigned to user
        if (task.isPaused && (task.userId === userId || task.assignedTo === userId)) {
          let newPausedTime = task.pausedTime;
          if (task.pauseStartTime) {
            const pauseDuration = Date.now() - task.pauseStartTime;
            newPausedTime += pauseDuration;
          }
          newStates[taskId] = {
            ...task,
            isPaused: false,
            pausedTime: newPausedTime,
            pauseStartTime: null,
          };
          resumedCount++;
        }
      });
      console.log(`🟢 Resumed ${resumedCount} tasks for user ${userId}`);
      return newStates;
    });
  }, []);

  const isAnyTaskRunning = useCallback(() => {
    return Object.values(pauseStates).some(state => !state.isPaused);
  }, [pauseStates]);

  return (
    <TaskTimerContext.Provider value={{
      pauseStates,
      registerTask,
      pauseTask,
      resumeTask,
      pauseAllTasks,
      resumeAllTasks,
      pauseUserTasks,
      resumeUserTasks,
      isAnyTaskRunning,
    }}>
      {children}
    </TaskTimerContext.Provider>
  );
}

export function useTaskTimer() {
  const context = useContext(TaskTimerContext);
  if (context === undefined) {
    throw new Error('useTaskTimer must be used within a TaskTimerProvider');
  }
  return context;
}
