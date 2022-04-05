import puppeteer, { ConsoleMessage, Puppeteer } from 'puppeteer';
import categories from './categoriesWithLinks.json'

// UTILS
const catToUrl = (cat:string, sortBy:string = 'installed') => `${baseURL}/${cat}${sortBy?'?sort_by=installed':null}`
const getCategory = (cat:CatName):Object => {
    return categories[cat];
}

type CatName = keyof typeof categories;

// CONSTANTS
const baseURL = 'https://apps.shopify.com/browse'
const reviewsAnchorSelector = '.ui-review-count-summary a';
const averageReviewSelector = '.ui-star-rating__rating';
const ratingListSelector = '.reviews-summary__rating-breakdown';
const nextPageSelector = '.search-pagination__next-page-text';
const ratingItemSelector = '.reviews-summary__review-count'
const uiAppCardSelector = '.ui-app-card';

const BREAK_TIME_IN_MS = 5000;

interface AppLink {
    href: string,
    title: string,
    position: number
}

let browser:puppeteer.Browser;

const linksCrawler: (url: string) => Promise<any> = async (url) => {
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        if (await page.$('.ui-app-card') === null) { 
            return undefined // It'll return undefined if we reach shopify's request limit.
        }

        // page.evaluate seems to be more convinient than page.$ for some reason.
        // for instance, everything runs in the browser context before it reaches back NODE environment again
        // e.g no back n forth
        return await page.evaluate(() => {
            const results = document.querySelectorAll('.ui-app-card');
            return [...results].map((el, index) => ({
                href: el.querySelector('a')?.href.split('?')[0],
                title: el.querySelector('h2')?.textContent,
                position: index
            }))
        })
    } catch (error) {
        console.log(`an error occured executing func: linksCrawler.
        error: ${error}`)
        return
    } finally {
        await page.close();
    }
}

const ratingCrawler: (Record:AppLink, catInfo:object, isBreak?:Boolean) => Promise<any> = async (appData, catInfo, isBreak) => {
    if (!appData?.href) {
        Promise.reject('appData must contain AppLink Record')
    }
    
    const page = await browser.newPage();

    if (isBreak) {
        console.log(`waiting for ${BREAK_TIME_IN_MS}`)
        await page.waitForTimeout(BREAK_TIME_IN_MS)
    }

    try {
        await page.goto(appData.href, { waitUntil: 'networkidle2' });
        await page.waitForSelector(reviewsAnchorSelector);

        // pass selectors hierarchically:
        // reviewsAnchorSelector (review div a) -> avg R -> ratings' ul -> ratings' li items
        const reviewData = await page.evaluate((sel1, sel2, sel3, sel4) => {
            let ratings = [5, 4, 3, 2, 1]; // 1st DOM element inside reviews is 5-STAR. That is why we reverse it.
            const allReviews = document.querySelector(sel1).textContent;
            const averageRating = document.querySelector(sel2).textContent;
            const reviews = [...document.querySelectorAll(sel3)]
                .map((element, i) => ({
                    count: element.querySelector(sel4)?.textContent,
                    rating: ratings[i]
                }))
            return {
                total: allReviews,
                average: averageRating,
                ratings: reviews,
            }

        }, reviewsAnchorSelector, averageReviewSelector, ratingListSelector, ratingItemSelector )

        console.log({
            ...appData,
            ...reviewData
        })
        return {
            ...appData,
            ...reviewData,
            ...catInfo
        }
    } catch (error) {
        console.log(`an error occured executing func: linksCrawler.
        error: ${error}`)
        return
    } finally {
        await page.close();
    }
}

const hasNextPage = async (page: puppeteer.Page) => {
    return await page.$(nextPageSelector) !== null
        ? true
        : false
}

// Need To Tweak it to make it SAFE.
const getNextPage = async (page: puppeteer.Page) => {
    return await page.$eval(nextPageSelector, el => el?.getAttribute('href'));
}


const crawlAll = async (catUrl:string, catInfo:object) => {
    const appLinks = await linksCrawler(catUrl);
    const apps:any = []
    for await(const [i, app] of appLinks.entries()) {
        if (i && i % 10 == 0) {
            let crawledApp = await ratingCrawler(app, catInfo, true);
            apps.push(crawledApp)
            continue;
        }
        let crawledApp = await ratingCrawler(app, catInfo);
        apps.push(crawledApp)
    }

    return apps;
}


const mainFn = async () => {

    browser = await puppeteer.launch({
        headless: true,
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-gpu']
    });

    const catNames = Object.keys(categories);

    let bigData:any;

    for (const [i, catName] of catNames.entries()) {
        if (i === 1) { break } // don't go deeper than one category at first
        let subCats = getCategory(catName as CatName);
        let subLinks = Object.entries(subCats)
        let catApps:Array<object> = [];
        subLinks.map(([name, link]) => {
            let href = catToUrl(link);
            let prereqData = {
                subCat: name,
                cat: catName
            }
            let crawledCatApps = crawlAll(href, prereqData)
            catApps.concat(crawledCatApps)
        })
        bigData.concat(catApps);
    }
    console.log(bigData)
    // let categoryUrl = 'https://apps.shopify.com/browse/store-design-page-enhancements?sort_by=installed';
    // await crawlAll(categoryUrl);
    // const promised = appLinks.slice(0,7).map(ratingCrawler)
    // Promise.all(promised)
    // browser.close();
}

mainFn();