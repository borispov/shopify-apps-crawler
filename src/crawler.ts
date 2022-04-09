import puppeteer, { ConsoleMessage, Puppeteer } from "puppeteer";
import categories from "./categoriesWithLinks.json";
import fs from "fs";
import stream from "stream";

const log = console.log;

// FUTURE TODO: Migrate Data TO DB. Save To DB UPON *EACH* successful APP-CRAWL
//

// UTILS
const catToUrl = (cat: string, sortBy: string = "installed") =>
    `${cat}${sortBy ? "?sort_by=installed" : null}`;
const getCategory = (cat: CatName): Object => categories[cat];
const saveToFile = async (filepath: string, data: any) =>
    await fs.promises.writeFile(filepath, data);

type CatName = keyof typeof categories;

// CONSTANTS
const baseURL = "https://apps.shopify.com/browse";
const reviewsAnchorSelector = ".ui-review-count-summary a";
const averageReviewSelector = ".ui-star-rating__rating";
const ratingListSelector = ".reviews-summary__rating-breakdown";
const nextPageSelector = ".search-pagination__next-page-text";
const ratingItemSelector = ".reviews-summary__review-count";
const uiAppCardSelector = ".ui-app-card";

const BREAK_TIME_IN_MS = 5000;

interface AppLink {
    href: string;
    title: string;
    position: number;
}

interface PreRequisiteData {
    cat: string;
    subCat: string;
}

let browser: puppeteer.Browser;

const linksCrawler: (url: string) => Promise<any> = async (url) => {
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: "networkidle2" });
        if ((await page.$(".ui-app-card")) === null) {
            return undefined; // It'll return undefined if we reach shopify's request limit.
        }

        // page.evaluate seems to be more convinient than page.$ for some reason.
        // for instance, everything runs in the browser context before it reaches back NODE environment again
        // e.g no back n forth
        return await page.evaluate(() => {
            const results = document.querySelectorAll(".ui-app-card");
            return [...results].map((el, index) => ({
                href: el.querySelector("a")?.href.split("?")[0],
                title: el.querySelector("h2")?.textContent,
                position: index,
            }));
        });
    } catch (error) {
        console.log(`an error occured executing func: linksCrawler.
        error: ${error}`);
        return;
    } finally {
        await page.close();
    }
};

const ratingCrawler: (
    Record: AppLink,
    catInfo: PreRequisiteData,
    isBreak?: Boolean
) => Promise<any> = async (appData, catInfo, isBreak) => {
    if (!appData?.href) {
        Promise.reject("appData must contain AppLink Record");
    }

    const page = await browser.newPage();

    if (isBreak) {
        console.log(`waiting for ${BREAK_TIME_IN_MS}`);
        await page.waitForTimeout(BREAK_TIME_IN_MS);
    }

    try {
        await page.goto(appData.href, { waitUntil: "networkidle2" });
        await page.waitForSelector(reviewsAnchorSelector);

        // pass selectors hierarchically:
        // reviewsAnchorSelector (review div a) -> avg R -> ratings' ul -> ratings' li items
        const reviewData = await page.evaluate(
            (sel1, sel2, sel3, sel4) => {
                let ratings = [5, 4, 3, 2, 1]; // 1st DOM element inside reviews is 5-STAR. That is why we reverse it.
                const allReviews = document.querySelector(sel1).textContent;
                const averageRating = document.querySelector(sel2).textContent;
                const reviews = [...document.querySelectorAll(sel3)].map(
                    (element, i) => ({
                        count: element.querySelector(sel4)?.textContent,
                        rating: ratings[i],
                    })
                );
                return {
                    total: allReviews,
                    average: averageRating,
                    ratings: reviews,
                };
            },
            reviewsAnchorSelector,
            averageReviewSelector,
            ratingListSelector,
            ratingItemSelector
        );

        console.log(`App: ${appData.title} | CRAWLED successfully |`);
        return {
            ...appData,
            ...reviewData,
            ...catInfo,
        };
    } catch (error) {
        console.log(`an error occured executing func: ratingsCrawler
        error Message: ${error}`);
        return;
    } finally {
        await page.close();
    }
};

const hasNextPage = async (page: puppeteer.Page) => {
    return (await page.$(nextPageSelector)) !== null ? true : false;
};

// Need To Tweak it to make it SAFE.
const getNextPage = async (page: puppeteer.Page) => {
    return await page.$eval(nextPageSelector, (el) => el?.getAttribute("href"));
};

const crawlAll = async (
    catUrl: string,
    catInfo: PreRequisiteData,
    stream: any
) => {
    const appLinks = await linksCrawler(catUrl);
    const apps: any = [];
    const appLinksLen = appLinks.length;

    stream.write("n");
    console.log(appLinks);
    return appLinks;
    // stream.write(JSON.stringify(crawledApp));

    return;
    try {
        for await (const [i, app] of appLinks.entries()) {
            if (i && i % 3 == 0) {
                let crawledApp = await ratingCrawler(app, catInfo, true);
                apps.push(crawledApp);
                continue;
            }
            let crawledApp = await ratingCrawler(app, catInfo);
            console.log(`Scrapong App #${i} out of Total: ${appLinksLen}`);
            apps.push(crawledApp);
        }
    } catch (error) {
        console.log(`Error Inisde: crawlAll. \n Message: ${error}`);
    }

    return apps;
};

const mainFn = async () => {
    let categoryFromArgs = process.argv[2];
    browser = await puppeteer.launch({
        headless: true,
        handleSIGINT: false,
        args: ["--no-sandbox", "--disable-gpu"],
    });

    const catNames = Object.keys(categories);

    if (!catNames.includes(categoryFromArgs)) {
        throw new Error("Sorry. Provided Category Does Not Exist. Try Again");
    }

    await crawlByCategory(categoryFromArgs);

    // let bigData: any = [];
    // for (const [i, catName] of catNames.entries()) {
    //     // if (i === 1) { break } // don't go deeper than one category at first
    //     let subCats = getCategory(catName as CatName);
    //     let subLinks = new Map(Object.entries(subCats));
    //     let catApps: Array<object> = [];
    //     log(subLinks);
    //     continue;
    //     for (let [name, link] of subLinks) {
    //         let href = catToUrl(link);
    //         let prereqData = { subCat: name, cat: catName };
    //         let crawledCatApps = await crawlAll(href, prereqData, file);
    //         // stream.write(JSON.stringify(crawledApp));
    //         continue;
    //         if (!crawledCatApps) {
    //             continue;
    //         }
    //         console.log("attempt to write to file");
    //         file.write(JSON.stringify(crawledCatApps));
    //         // bigData.push(crawledCatApps);
    //         // bigData.concat(crawledCatApps);
    //     }
    // }
    // await fs.promises.writeFile("./bigdata.json", JSON.stringify(bigData.flat()))
    await browser.close();
};

mainFn();

// DIVIDE and CONQUER
// Crawl Each Category Independently

async function crawlSubs(href: string, prereqData: PreRequisiteData) {
    const appLinks = await linksCrawler(href);
    const appLinksLen = appLinks.length;
    const apps: any = [];

    try {
        for await (const [i, app] of appLinks.entries()) {
            if (i && i % 3 == 0) {
                let crawledApp = await ratingCrawler(app, prereqData, true);
                apps.push(crawledApp);
                continue;
            }
            let crawledApp = await ratingCrawler(app, prereqData);

            // prettier-ignore
            log( `Scrapong App #${i + 1} | Total: ${appLinksLen} | Category: ${ prereqData["cat"] } | Sub-Category: ${prereqData["subCat"]}`);
            apps.push(crawledApp);
        }
    } catch (error) {
        log(`Error Inisde: crawlAll. \n Message: ${error}`);
    }
    return apps;
}

const crawlByCategory = async (cat: string) => {
    const subCategories = getCategory(cat as CatName);
    const subLinks = new Map(Object.entries(subCategories));
    const catData: any = [];

    for (const [subCat, appLink] of subLinks) {
        const href = catToUrl(appLink);
        const prereqData: PreRequisiteData = { subCat: subCat, cat: cat };
        const results = await crawlSubs(href, prereqData);
        catData.push(results);
        // flatten the array because it'd look like [ [...], [...], [...] ]
        catData.flat();
    }

    const filepath = `./${cat}-${new Date().toISOString().split("T")[0]}.json`;
    try {
        const jsonifiedData = JSON.stringify(catData.flat());
        log(`Attempting To Save Data To File: ${filepath}`);
        await saveToFile(filepath, jsonifiedData);
    } catch (error) {
        log(`Failed To Save Data To: ${filepath}`);
    }
};

// crawlByCategory("marketing");
