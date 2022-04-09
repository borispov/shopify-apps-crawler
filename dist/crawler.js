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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const categoriesWithLinks_json_1 = __importDefault(require("./categoriesWithLinks.json"));
const fs_1 = __importDefault(require("fs"));
const log = console.log;
// FUTURE TODO: Migrate Data TO DB. Save To DB UPON *EACH* successful APP-CRAWL
//
// UTILS
const catToUrl = (cat, sortBy = "installed") => `${cat}${sortBy ? "?sort_by=installed" : null}`;
const getCategory = (cat) => categoriesWithLinks_json_1.default[cat];
const saveToFile = (filepath, data) => __awaiter(void 0, void 0, void 0, function* () { return yield fs_1.default.promises.writeFile(filepath, data); });
// CONSTANTS
const baseURL = "https://apps.shopify.com/browse";
const reviewsAnchorSelector = ".ui-review-count-summary a";
const averageReviewSelector = ".ui-star-rating__rating";
const ratingListSelector = ".reviews-summary__rating-breakdown";
const nextPageSelector = ".search-pagination__next-page-text";
const ratingItemSelector = ".reviews-summary__review-count";
const uiAppCardSelector = ".ui-app-card";
const BREAK_TIME_IN_MS = 5000;
let browser;
const linksCrawler = (url) => __awaiter(void 0, void 0, void 0, function* () {
    const page = yield browser.newPage();
    try {
        yield page.goto(url, { waitUntil: "networkidle2" });
        if ((yield page.$(".ui-app-card")) === null) {
            return undefined; // It'll return undefined if we reach shopify's request limit.
        }
        // page.evaluate seems to be more convinient than page.$ for some reason.
        // for instance, everything runs in the browser context before it reaches back NODE environment again
        // e.g no back n forth
        return yield page.evaluate(() => {
            const results = document.querySelectorAll(".ui-app-card");
            return [...results].map((el, index) => {
                var _a, _b;
                return ({
                    href: (_a = el.querySelector("a")) === null || _a === void 0 ? void 0 : _a.href.split("?")[0],
                    title: (_b = el.querySelector("h2")) === null || _b === void 0 ? void 0 : _b.textContent,
                    position: index,
                });
            });
        });
    }
    catch (error) {
        console.log(`an error occured executing func: linksCrawler.
        error: ${error}`);
        return;
    }
    finally {
        yield page.close();
    }
});
const ratingCrawler = (appData, catInfo, isBreak) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(appData === null || appData === void 0 ? void 0 : appData.href)) {
        Promise.reject("appData must contain AppLink Record");
    }
    const page = yield browser.newPage();
    if (isBreak) {
        console.log(`waiting for ${BREAK_TIME_IN_MS}`);
        yield page.waitForTimeout(BREAK_TIME_IN_MS);
    }
    try {
        yield page.goto(appData.href, { waitUntil: "networkidle2" });
        yield page.waitForSelector(reviewsAnchorSelector);
        // pass selectors hierarchically:
        // reviewsAnchorSelector (review div a) -> avg R -> ratings' ul -> ratings' li items
        const reviewData = yield page.evaluate((sel1, sel2, sel3, sel4) => {
            let ratings = [5, 4, 3, 2, 1]; // 1st DOM element inside reviews is 5-STAR. That is why we reverse it.
            const allReviews = document.querySelector(sel1).textContent;
            const averageRating = document.querySelector(sel2).textContent;
            const reviews = [...document.querySelectorAll(sel3)].map((element, i) => {
                var _a;
                return ({
                    count: (_a = element.querySelector(sel4)) === null || _a === void 0 ? void 0 : _a.textContent,
                    rating: ratings[i],
                });
            });
            return {
                total: allReviews,
                average: averageRating,
                ratings: reviews,
            };
        }, reviewsAnchorSelector, averageReviewSelector, ratingListSelector, ratingItemSelector);
        console.log(`App: ${appData.title} | CRAWLED successfully |`);
        return Object.assign(Object.assign(Object.assign({}, appData), reviewData), catInfo);
    }
    catch (error) {
        console.log(`an error occured executing func: ratingsCrawler
        error Message: ${error}`);
        return;
    }
    finally {
        yield page.close();
    }
});
const hasNextPage = (page) => __awaiter(void 0, void 0, void 0, function* () {
    return (yield page.$(nextPageSelector)) !== null ? true : false;
});
// Need To Tweak it to make it SAFE.
const getNextPage = (page) => __awaiter(void 0, void 0, void 0, function* () {
    return yield page.$eval(nextPageSelector, (el) => el === null || el === void 0 ? void 0 : el.getAttribute("href"));
});
const crawlAll = (catUrl, catInfo, stream) => __awaiter(void 0, void 0, void 0, function* () {
    var e_1, _a;
    const appLinks = yield linksCrawler(catUrl);
    const apps = [];
    const appLinksLen = appLinks.length;
    stream.write("n");
    console.log(appLinks);
    return appLinks;
    // stream.write(JSON.stringify(crawledApp));
    return;
    try {
        try {
            for (var _b = __asyncValues(appLinks.entries()), _c; _c = yield _b.next(), !_c.done;) {
                const [i, app] = _c.value;
                if (i && i % 3 == 0) {
                    let crawledApp = yield ratingCrawler(app, catInfo, true);
                    apps.push(crawledApp);
                    continue;
                }
                let crawledApp = yield ratingCrawler(app, catInfo);
                console.log(`Scrapong App #${i} out of Total: ${appLinksLen}`);
                apps.push(crawledApp);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    catch (error) {
        console.log(`Error Inisde: crawlAll. \n Message: ${error}`);
    }
    return apps;
});
const mainFn = () => __awaiter(void 0, void 0, void 0, function* () {
    let categoryFromArgs = process.argv[2];
    browser = yield puppeteer_1.default.launch({
        headless: true,
        handleSIGINT: false,
        args: ["--no-sandbox", "--disable-gpu"],
    });
    const catNames = Object.keys(categoriesWithLinks_json_1.default);
    if (!catNames.includes(categoryFromArgs)) {
        throw new Error("Sorry. Provided Category Does Not Exist. Try Again");
    }
    yield crawlByCategory(categoryFromArgs);
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
    yield browser.close();
});
mainFn();
// DIVIDE and CONQUER
// Crawl Each Category Independently
function crawlSubs(href, prereqData) {
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function* () {
        const appLinks = yield linksCrawler(href);
        const appLinksLen = appLinks.length;
        const apps = [];
        try {
            try {
                for (var _b = __asyncValues(appLinks.entries()), _c; _c = yield _b.next(), !_c.done;) {
                    const [i, app] = _c.value;
                    if (i && i % 3 == 0) {
                        let crawledApp = yield ratingCrawler(app, prereqData, true);
                        apps.push(crawledApp);
                        continue;
                    }
                    let crawledApp = yield ratingCrawler(app, prereqData);
                    // prettier-ignore
                    log(`Scrapong App #${i + 1} | Total: ${appLinksLen} | Category: ${prereqData["cat"]} | Sub-Category: ${prereqData["subCat"]}`);
                    apps.push(crawledApp);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        catch (error) {
            log(`Error Inisde: crawlAll. \n Message: ${error}`);
        }
        return apps;
    });
}
const crawlByCategory = (cat) => __awaiter(void 0, void 0, void 0, function* () {
    const subCategories = getCategory(cat);
    const subLinks = new Map(Object.entries(subCategories));
    const catData = [];
    for (const [subCat, appLink] of subLinks) {
        const href = catToUrl(appLink);
        const prereqData = { subCat: subCat, cat: cat };
        const results = yield crawlSubs(href, prereqData);
        catData.push(results);
        // flatten the array because it'd look like [ [...], [...], [...] ]
        catData.flat();
    }
    const filepath = `./${cat}-${new Date().toISOString().split("T")[0]}.json`;
    try {
        const jsonifiedData = JSON.stringify(catData.flat());
        log(`Attempting To Save Data To File: ${filepath}`);
        yield saveToFile(filepath, jsonifiedData);
    }
    catch (error) {
        log(`Failed To Save Data To: ${filepath}`);
    }
});
// crawlByCategory("marketing");
