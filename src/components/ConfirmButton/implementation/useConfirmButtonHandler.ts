import { useEffect, useRef, useState } from 'react';

/** First click arms the button for 3.5 s; a second click within that time confirms. */
export function useConfirmButtonHandler(onConfirm: () => void) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = () => {
    clearTimeout(timer.current);
    if (armed) {
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3500);
  };
  return { armed, onClick };
}
