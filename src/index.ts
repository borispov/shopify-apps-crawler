import puppeteer, { Puppeteer } from 'puppeteer';
import categories from './categoriesWithLinks.json'

// CONSTANTS
const reviewsAnchorSelector = '.ui-review-count-summary a';
const averageReviewSelector = '.ui-star-rating__rating';
const ratingListSelector    = '.reviews-summary__rating-breakdown';
const nextPageSelector = '.search-pagination__next-page-text';


const crawlAppLinks = async (
    page: puppeteer.Page, 
    depth: number = 1, 
    pageNum: number = 1, 
    cards: object[] =[]
):Promise<any> => {
   // END: break recursion
   if (depth === 0) { return cards}

   const currentUrl = page.url();
   // map over elements, extract href and titile, if for some reason:
   // some elements return undefined, filter them out to avoid passing them on
   await page.waitForSelector('.ui-app-card')
//    await page.waitForTimeout(300);
   if (await page.$('.ui-app-card') === null) { return cards }

   const currentPageCards = await page.$$eval('.ui-app-card', (els) => {
       return els.map(el => {
         const anchor = el.querySelector('a');
         const href = anchor?.href.split('?')[0];
         const title = anchor?.querySelector('h2')?.textContent;
         
         return href && title 
            ? {
                title, 
                href, 
            }
            : undefined
       }).filter(e=> e)
   })

   await page.waitForTimeout(50);
   const newCards = cards.concat(currentPageCards);

   if (!hasNextPage(page)) { return cards }
   const urlWithPageNum = `${currentUrl.split('?')[0]}?page=${pageNum+1}&sort_by=installed`;
   await page.goto(urlWithPageNum);
   // recurse
   return crawlAppLinks(page, 0, pageNum + 1, newCards);
}

const crawlRatings = async (page: puppeteer.Page) => {
    // grab overall ratings
    const allReviews = await page.$eval(
        reviewsAnchorSelector, 
        el => el.textContent);

    // grab average 
    const averageRating = await page.$eval(
        averageReviewSelector,
        el => el.textContent);

    // Put ratings from 1..5 into an ojbect.
    const ratings = await page.$$eval(ratingListSelector, elements => {
        let ratings = [5, 4, 3, 2, 1];
        return elements.map((element, index) => {
            const reviewCount = element.querySelector('.reviews-summary__review-count')?.textContent
            return {
                rating: ratings[index],
                count: reviewCount,
            }
        })
    })

    return {
        all: allReviews,
        average: averageRating,
        ratings: ratings,
    }

};

const hasNextPage = async (page:puppeteer.Page) => {
    return await page.$(nextPageSelector) !== null
        ? true
        : false
}

// Need To Tweak it to make it SAFE.
const getNextPage = async (page:puppeteer.Page) => {
    return await page.$eval(nextPageSelector, el => el?.getAttribute('href'));
}

const aggregateAppLinksByCategories = async (page:puppeteer.Page) => {
    let catLinks:any = {};
    let newcatts = {
        storeManagement: {
            operations: "https://apps.shopify.com/browse/store-management-operations",
        }
    };
    
    for (const [catName, catSubCategories] of Object.entries(newcatts)) {
        catLinks[catName] = {};
        for (const [subCategory, catLink] of Object.entries(catSubCategories)) {
            console.log(`visiting : ${catLink} `)
            await page.goto(catLink);
            let appLinks = await crawlAppLinks(page, 1);
            appLinks = appLinks.forEach(async(appLink:{href:string, title:string}) => {
                await page.goto(appLink.href, { waitUntil: 'networkidle2'});
                let ratings = await crawlRatings(page);
                return {
                    ...appLink,
                    ...ratings
                }
            })
            catLinks[catName][subCategory] = {
                links: appLinks,
                // length: appLinks.length
            }
        }
    }
    return catLinks;
}

const mainFn = async () => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // await page.goto(url, { waitUntil: 'networkidle2'});
    // let u = 'https://apps.shopify.com/browse/store-design-page-enhancements';
    // await page.goto(u);
    // const appLinks = await crawlAppLinks(page, 1);
    // console.log(appLinks);

    // MUST FIND DIFFERENT METHOD
    // Nested Objects ARE REALLY A HELL TO MANAGE!!


    //MAYBE PULL RATINGS FROM WITHIN THE APP LINK FUNCTION ???
    let all = await aggregateAppLinksByCategories(page);
    
    for (const v of Object.values(all?.storeManagement?.operations)) {
        console.log(v)
    }

    // const appLinks = await crawlAppLinks(page, 5);

    // const ratings = await crawlRatings(page);

    await browser.close();
}

mainFn();