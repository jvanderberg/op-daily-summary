import type { Source } from './types.js';

export const townshipSources: Source[] = [
  {
    id: 'township-news',
    entity: 'oak-park-township',
    name: 'Township News & Events',
    type: 'news',
    url: 'https://oakparktownship.org/news-events/',
    selectors: {
      items: '.fl-post-column',
      title: '.fl-post-grid-title a',
      link: '.fl-post-grid-title a',
      date: '.fl-post-grid-date',
      description: '.fl-post-grid-text',
    },
  },
  {
    id: 'township-board-meetings',
    entity: 'oak-park-township',
    name: 'Township Board Meetings',
    type: 'meetings',
    url: 'https://oakparktownship.org/board-agendas-finances/',
    selectors: {
      items: '.tribe-events-calendar-list__event, article.post, .wp-block-file',
      title: '.tribe-events-calendar-list__event-title a, .entry-title a, a',
      link: '.tribe-events-calendar-list__event-title a, .entry-title a, a',
      date: '.tribe-events-calendar-list__event-datetime, .posted-on time',
    },
  },
];
