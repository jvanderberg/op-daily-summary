import type { Source } from './types.js';

export const librarySources: Source[] = [
  {
    id: 'oppl-news',
    entity: 'oak-park-library',
    name: 'Library News & Events',
    type: 'news',
    url: 'https://oppl.org/news/',
    selectors: {
      items: '.pt-cv-ifield',
      title: '.pt-cv-title a',
      link: '.pt-cv-title a',
      date: '.entry-date time',
      description: '.pt-cv-content',
    },
    requiresBrowser: true,
  },
  // Note: Library board-of-trustees page is informational, not a list of meeting agendas
];
