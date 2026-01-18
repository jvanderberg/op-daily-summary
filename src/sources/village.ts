import type { Source } from './types.js';

export const villageSources: Source[] = [
  {
    id: 'village-news',
    entity: 'village-of-oak-park',
    name: 'Village News',
    type: 'news',
    url: 'https://www.oak-park.us/News-articles',
    selectors: {
      items: '.news-list-container article',
      title: 'h2.list-item-title',
      link: 'a',
      description: '.oc-news-item-description',
    },
  },
  {
    id: 'village-board-meetings',
    entity: 'village-of-oak-park',
    name: 'Village Board Meetings',
    type: 'meetings',
    url: 'https://oak-park.legistar.com/Calendar.aspx',
    selectors: {
      items: 'tr.rgRow, tr.rgAltRow',
      title: 'td:first-child a',
      link: 'td:first-child a',
      date: 'td.rgSorted',
    },
    requiresBrowser: true,
  },
];
