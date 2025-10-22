import { useState } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmationState {
  isOpen: boolean;
  options: ConfirmationOptions | null;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    options: null,
    onConfirm: null,
    onCancel: null
  });

  const confirm = (options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        onConfirm: () => {
          setState({ isOpen: false, options: null, onConfirm: null, onCancel: null });
          resolve(true);
        },
        onCancel: () => {
          setState({ isOpen: false, options: null, onConfirm: null, onCancel: null });
          resolve(false);
        }
      });
    });
  };

  const close = () => {
    if (state.onCancel) {
      state.onCancel();
    }
  };

  return {
    confirm,
    close,
    isOpen: state.isOpen,
    options: state.options,
    onConfirm: state.onConfirm,
    onCancel: state.onCancel
  };
}
