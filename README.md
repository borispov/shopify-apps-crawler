# This is a data table project with Shopify Apps information.
*The purpose is to be able to sort the apps by ratings and gain insights*


## Most Important Data

- App's Name
- Link
- App's Position When Sorted By Most Installed
- Total Reviews
- Average Rating
- Rating Per Star (n 3* reviews, etc...)
- Launch date? -- * Requires accessing additional source (sasi). Not currently interested to do so. 
- Installs(There's no way to tell...)


## Thoughts
After dealing with numerous issues regarding web-scraping in general, and using puppeteer and cheerio in particular. I've attempted to use cheerio instead of Puppeteer to improve performance but cheerio isn't suited for SPA applications.

Using puppeteer's page.evaluate basically reduces any need to use cheerio. I compress everything I need to grab within a single page inside page.evaluate function and it works out pretty fine.

## What's Next?
There are a couple of things to figure out:
- UI: How to present the data to the user.
- Backend: How to save the data:
- - Should I use a database?
- - Should I keep saving it to a json file?
- - How often should I be web-scraping?

## Ideas
- Pull reviews and store inside app's object. Enable the user to access reviews' easily in order to examine app's review content.
- Use express on the backend with some HTML templating engine.