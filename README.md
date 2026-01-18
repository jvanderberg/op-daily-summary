# Oak Park Daily Summary

Automated daily summaries of local government news from Oak Park, IL.

**[View the Daily Summaries →](https://jvanderberg.github.io/op-daily-summary/)**

## Sources

This scraper monitors news and updates from:

- **Village of Oak Park** - Village news and announcements
- **Oak Park Township** - Township news and board meetings
- **School District 97** - Elementary school district news
- **OPRF High School (District 200)** - High school news
- **Park District of Oak Park** - Park district news
- **Oak Park Public Library** - Library news and events

## How It Works

1. Scrapes configured sources using CSS selectors
2. Extracts new items (tracks seen items via content hashing)
3. Summarizes each item using Claude Sonnet
4. Generates daily and entity-level summaries
5. Builds a static site and deploys to GitHub Pages

## Usage

```bash
# Install dependencies
npm install

# Run the full pipeline (scrape, summarize, generate site)
npm run daily

# Just regenerate the website from existing summaries
npm run generate-site

# Test a specific source
npm run test-source -- village-news
```

## Configuration

Create a `.env` file with your API key:

```
ANTHROPIC_API_KEY=your-key-here
```

## License

MIT
