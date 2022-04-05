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
// CONSTANTS
const reviewsAnchorSelector = '.ui-review-count-summary a';
const averageReviewSelector = '.ui-star-rating__rating';
const ratingListSelector = '.reviews-summary__rating-breakdown';
const nextPageSelector = '.search-pagination__next-page-text';
const crawlAppLinks = (page, depth = 1, pageNum = 1, cards = []) => __awaiter(void 0, void 0, void 0, function* () {
    // END: break recursion
    if (depth === 0) {
        return cards;
    }
    const currentUrl = page.url();
    // map over elements, extract href and titile, if for some reason:
    // some elements return undefined, filter them out to avoid passing them on
    yield page.waitForSelector('.ui-app-card');
    //    await page.waitForTimeout(300);
    if ((yield page.$('.ui-app-card')) === null) {
        return cards;
    }
    const currentPageCards = yield page.$$eval('.ui-app-card', (els) => {
        return els.map(el => {
            var _a;
            const anchor = el.querySelector('a');
            const href = anchor === null || anchor === void 0 ? void 0 : anchor.href.split('?')[0];
            const title = (_a = anchor === null || anchor === void 0 ? void 0 : anchor.querySelector('h2')) === null || _a === void 0 ? void 0 : _a.textContent;
            return href && title
                ? {
                    title,
                    href,
                }
                : undefined;
        }).filter(e => e);
    });
    yield page.waitForTimeout(50);
    const newCards = cards.concat(currentPageCards);
    if (!hasNextPage(page)) {
        return cards;
    }
    const urlWithPageNum = `${currentUrl.split('?')[0]}?page=${pageNum + 1}&sort_by=installed`;
    yield page.goto(urlWithPageNum);
    // recurse
    return crawlAppLinks(page, 0, pageNum + 1, newCards);
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
const aggregateAppLinksByCategories = (page) => __awaiter(void 0, void 0, void 0, function* () {
    let catLinks = {};
    let newcatts = {
        storeManagement: {
            operations: "https://apps.shopify.com/browse/store-management-operations",
        }
    };
    for (const [catName, catSubCategories] of Object.entries(newcatts)) {
        catLinks[catName] = {};
        for (const [subCategory, catLink] of Object.entries(catSubCategories)) {
            console.log(`visiting : ${catLink} `);
            yield page.goto(catLink);
            let appLinks = yield crawlAppLinks(page, 1);
            appLinks = appLinks.forEach((appLink) => __awaiter(void 0, void 0, void 0, function* () {
                yield page.goto(appLink.href, { waitUntil: 'networkidle2' });
                let ratings = yield crawlRatings(page);
                return Object.assign(Object.assign({}, appLink), ratings);
            }));
            catLinks[catName][subCategory] = {
                links: appLinks,
                // length: appLinks.length
            };
        }
    }
    return catLinks;
});
const mainFn = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const browser = yield puppeteer_1.default.launch();
    const page = yield browser.newPage();
    // await page.goto(url, { waitUntil: 'networkidle2'});
    // let u = 'https://apps.shopify.com/browse/store-design-page-enhancements';
    // await page.goto(u);
    // const appLinks = await crawlAppLinks(page, 1);
    // console.log(appLinks);
    // MUST FIND DIFFERENT METHOD
    // Nested Objects ARE REALLY A HELL TO MANAGE!!
    //MAYBE PULL RATINGS FROM WITHIN THE APP LINK FUNCTION ???
    let all = yield aggregateAppLinksByCategories(page);
    for (const v of Object.values((_a = all === null || all === void 0 ? void 0 : all.storeManagement) === null || _a === void 0 ? void 0 : _a.operations)) {
        console.log(v);
    }
    // const appLinks = await crawlAppLinks(page, 5);
    // const ratings = await crawlRatings(page);
    yield browser.close();
});
mainFn();
