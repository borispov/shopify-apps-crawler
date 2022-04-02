"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const categories_1 = __importDefault(require("./categories"));
// CONSTANTS
const reviewsAnchorSelector = '.ui-review-count-summary a';
const averageReviewSelector = '.ui-star-rating__rating';
const ratingListSelector = '.reviews-summary__rating-breakdown';
const nextPageSelector = '.search-pagination__next-page-text';
const shopifyUrl = 'https://apps.shopify.com/browse/';
const crawlAppLinks = (page, depth = 1, pageNum = 1, cards = []) => __awaiter(void 0, void 0, void 0, function* () {
    // END: break recursion
    if (depth === 0) {
        return cards;
    }
    const currentUrl = page.url();
    // map over elements, extract href and titile, if for some reason:
    // some elements return undefined, filter them out to avoid passing them on
    const currentPageCards = yield page.$$eval('.ui-app-card', (els) => {
        console.log('asdddddddddddddddkk');
        return els.map(el => {
            var _a;
            const anchor = el.querySelector('a');
            const href = anchor === null || anchor === void 0 ? void 0 : anchor.href.split('?')[0];
            const title = (_a = anchor === null || anchor === void 0 ? void 0 : anchor.querySelector('h2')) === null || _a === void 0 ? void 0 : _a.textContent;
            console.log('we got href: ' + href);
            return href && title
                ? { title, href }
                : undefined;
        }).filter(e => e);
    });
    cards.concat(currentPageCards);
    console.log('those are my cards:');
    if (!hasNextPage(page)) {
        return cards;
    }
    //    const urlWithPageNum = await getNextPage(page);
    const urlWithPageNum = `${currentUrl.split('?')[0]}?page=${pageNum + 1}`;
    // navigate to the next page and pass it on to the next iteration of the function
    yield page.goto(urlWithPageNum);
    // recurse
    return crawlAppLinks(page, depth - 1, pageNum + 1, cards);
});
const crawlRatings = (page) => __awaiter(void 0, void 0, void 0, function* () {
    // grab overall ratings
    const allReviews = yield page.$eval(reviewsAnchorSelector, el => el.textContent);
    // grab average 
    const averageRating = yield page.$eval(averageReviewSelector, el => el.textContent);
    // Put ratings from 1..5 into an ojbect.
    const ratings = yield page.$$eval(ratingListSelector, elements => {
        let ratings = [5, 4, 3, 2, 1];
        return elements.map((element, index) => {
            var _a;
            const reviewCount = (_a = element.querySelector('.reviews-summary__review-count')) === null || _a === void 0 ? void 0 : _a.textContent;
            return {
                rating: ratings[index],
                count: reviewCount,
            };
        });
    });
    return {
        all: allReviews,
        average: averageRating,
        ratings: ratings,
    };
});
const hasNextPage = (page) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield page.$(nextPageSelector)) !== null
        ? true
        : false;
});
// Need To Tweak it to make it SAFE.
const getNextPage = (page) => __awaiter(void 0, void 0, void 0, function* () {
    return yield page.$eval(nextPageSelector, el => el === null || el === void 0 ? void 0 : el.getAttribute('href'));
});
const allCategoriesLinks = () => {
    let newCats = {};
    for (const [catName, cat] of Object.entries(categories_1.default)) {
        newCats[catName] = {};
        let keys = Object.keys(cat);
        for (const [k, v] of Object.entries(cat)) {
            // get the URLs of ALL Shopify App Categories
            let catKey = keys.find(el => el === k);
            const categoryUrl = shopifyUrl + v;
            newCats[catName][k] = shopifyUrl + v;
        }
    }
    console.log(newCats);
};
const mainFn = () => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield puppeteer_1.default.launch();
    const page = yield browser.newPage();
    const links = [`https://apps.shopify.com/omnisend/reviews`];
    const url = 'https://apps.shopify.com/browse' + categories_1.default.marketing;
    // await page.goto(links[0], { waitUntil: 'networkidle2'});
    // await page.goto(url, { waitUntil: 'networkidle2'});
    // await page.waitForSelector(reviewsAnchorSelector)
    let designAppLinks = [];
    // console.log(designAppLinks);
    // const appLinks = await crawlAppLinks(page, 5);
    // const ratings = await crawlRatings(page);
    yield browser.close();
});
// mainFn();
allCategoriesLinks();
