import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

