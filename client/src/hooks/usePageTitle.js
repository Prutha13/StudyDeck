import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) {
      document.title = `${title} | StudyDeck`;
    } else {
      document.title = 'StudyDeck — AI Study Workspace';
    }
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
