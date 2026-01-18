import type { Source } from './types.js';

export const district97Sources: Source[] = [
  {
    id: 'd97-news',
    entity: 'district-97',
    name: 'District 97 News',
    type: 'news',
    url: 'https://www.op97.org/news',
    selectors: {
      items: '.cs-li-default',
      title: 'h3.cs-li-default-title a',
      link: 'h3.cs-li-default-title a',
      date: '.cs-li-default-meta time, .cs-li-default-date',
      description: '.cs-li-default-summary',
    },
    requiresBrowser: true,
  },
  // Note: D97 board meetings/agendas are hosted on external Diligent platform, not scrapable
];
