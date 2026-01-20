import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type AlertOptions = {
  title?: string;
  message: string;
  closeText?: string;
};

type DialogState =
  | { kind: 'none' }
  | {
      kind: 'alert';
      title: string;
      message: string;
      closeText: string;
    }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
      destructive: boolean;
    };

type Resolver =
  | { kind: 'alert'; resolve: () => void }
  | { kind: 'confirm'; resolve: (value: boolean) => void };

export function useModalDialog() {
  const [state, setState] = useState<DialogState>({ kind: 'none' });
  const resolverRef = useRef<Resolver | null>(null);

  const close = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setState({ kind: 'none' });

    if (!resolver) return;
    if (resolver.kind === 'confirm') {
      resolver.resolve(confirmed);
      return;
    }
    resolver.resolve();
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      if (resolverRef.current) close(false);
      resolverRef.current = { kind: 'confirm', resolve };
      setState({
        kind: 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        destructive: options.destructive ?? false,
      });
    });
  }, [close]);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      if (resolverRef.current) close(false);
      resolverRef.current = { kind: 'alert', resolve };
      setState({
        kind: 'alert',
        title: options.title ?? 'Notice',
        message: options.message,
        closeText: options.closeText ?? 'OK',
      });
    });
  }, [close]);

  const ModalDialog = useMemo(() => {
    function ModalDialogComponent() {
      const open = state.kind !== 'none';

      return (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) close(false);
          }}
        >
          <DialogContent
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <DialogHeader>
              <DialogTitle>{state.kind === 'none' ? '' : state.title}</DialogTitle>
              {state.kind !== 'none' ? (
                <DialogDescription className="whitespace-pre-wrap">{state.message}</DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogFooter>
              {state.kind === 'confirm' ? (
                <>
                  <Button variant="outline" onClick={() => close(false)}>
                    {state.cancelText}
                  </Button>
                  <Button
                    variant={state.destructive ? 'destructive' : 'default'}
                    onClick={() => close(true)}
                  >
                    {state.confirmText}
                  </Button>
                </>
              ) : state.kind === 'alert' ? (
                <Button onClick={() => close(false)}>{state.closeText}</Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    ModalDialogComponent.displayName = 'ModalDialog';
    return ModalDialogComponent;
  }, [close, state]);

  return { confirm, alert, ModalDialog };
}
