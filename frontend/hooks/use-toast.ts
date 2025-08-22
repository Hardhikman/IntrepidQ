"use client";

import * as React from "react";
import { toast as sonnerToast, type ToastT } from "sonner";

// Config
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

// Core toast type for local state
type ToasterToast = {
  id: string; // ✅ always a string
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | string;
  open?: boolean;
} & Partial<Omit<ToastT, "id">>; // ✅ Remove id from Sonner props type

// Reducer types
type State = { toasts: ToasterToast[] };

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

type Action =
  | { type: typeof actionTypes.ADD_TOAST; toast: ToasterToast }
  | { type: typeof actionTypes.UPDATE_TOAST; toast: Partial<ToasterToast> & { id: string } }
  | { type: typeof actionTypes.DISMISS_TOAST; toastId?: string }
  | { type: typeof actionTypes.REMOVE_TOAST; toastId?: string };

// ID generator (string only)
let count = 0;
function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString(); // ✅ string conversion
}

// Timeout management
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};

// Reducer logic
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast, id: String(action.toast.id) } : t
        ),
      };
    case actionTypes.DISMISS_TOAST:
      if (action.toastId) addToRemoveQueue(action.toastId);
      else state.toasts.forEach((toast) => addToRemoveQueue(toast.id));
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || action.toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    case actionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: action.toastId
          ? state.toasts.filter((t) => t.id !== action.toastId)
          : [],
      };
    default:
      return state;
  }
};

// Internal store for reducer
const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

// Toast input type (id omitted so only we set it)
type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive" | string;
} & Partial<Omit<ToastT, "id">>;

// Toast trigger
function toast({ title, description, action, ...props }: ToastInput) {
  const id = genId(); // ✅ always string
  const message = [title, description].filter(Boolean).join(" — ") || "";

  // Show via Sonner
  sonnerToast(message, props);

  // Save to local state
  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id, // ✅ ensures string, placed after props so it wins
      title,
      description,
      action,
      open: true,
    },
  });

  return {
    id,
    dismiss: () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id }),
    update: (newProps: Partial<ToasterToast>) =>
      dispatch({
        type: actionTypes.UPDATE_TOAST,
        toast: { id, ...newProps },
  }),
  };
}

// Hook to access toast state/actions
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
