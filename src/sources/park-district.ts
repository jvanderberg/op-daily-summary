import type { Source } from './types.js';

export const parkDistrictSources: Source[] = [
  {
    id: 'pdop-news',
    entity: 'park-district',
    name: 'Park District News',
    type: 'news',
    url: 'https://pdop.org/news/',
    selectors: {
      items: 'article.elementor-post',
      title: 'h3.elementor-post__title a',
      link: 'h3.elementor-post__title a',
      date: '.elementor-post-date',
      description: '.elementor-post__excerpt',
    },
  },
  // Note: PDOP board meetings and agendas pages are informational, not scrapable lists
];
