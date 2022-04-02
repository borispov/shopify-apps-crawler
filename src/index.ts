import puppeteer from 'puppeteer';

const mainFn = async () => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const links:string[] = [`https://apps.shopify.com/omnisend/reviews`]

    await page.goto(links[0], { waitUntil: 'networkidle2'});

    const reviewsAnchorSelector = '.ui-review-count-summary a';
    const averageReviewSelector = '.ui-star-rating__rating';

    const ratingListSelector = '.reviews-summary__rating-breakdown';

    await page.waitForSelector(reviewsAnchorSelector)

    const reviewsSpanElement = await page.$eval(
        reviewsAnchorSelector, 
        el => el.textContent);

    console.log(reviewsSpanElement);

    const averageRating = await page.$eval(
        averageReviewSelector,
        el => el.textContent);

    console.log(averageRating);


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
    console.log(ratings)

    await browser.close();
}

mainFn();