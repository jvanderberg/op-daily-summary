import type { Source } from './types.js';

export const district200Sources: Source[] = [
  {
    id: 'd200-news',
    entity: 'district-200',
    name: 'OPRF High School News',
    type: 'news',
    url: 'https://www.oprfhs.org/about/news',
    selectors: {
      items: 'article.fsStyleAutoclear',
      title: '.fsTitle a.fsPostLink',
      link: '.fsTitle a.fsPostLink',
      date: '.fsDate, .fsDateTime',
      description: '.fsSummary',
    },
    requiresBrowser: true,
  },
  // Note: D200 board meetings/agendas pages have no scrapable content
];
