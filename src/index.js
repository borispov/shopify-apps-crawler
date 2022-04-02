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
const mainFn = () => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield puppeteer_1.default.launch();
    const page = yield browser.newPage();
    const links = [`https://apps.shopify.com/omnisend/reviews`];
    yield page.goto(links[0], { waitUntil: 'networkidle2' });
    const reviewsAnchorSelector = '.ui-review-count-summary a';
    const averageReviewSelector = '.ui-star-rating__rating';
    const ratingListSelector = '.reviews-summary__rating-breakdown';
    yield page.waitForSelector(reviewsAnchorSelector);
    const reviewsSpanElement = yield page.$eval(reviewsAnchorSelector, el => el.textContent);
    console.log(reviewsSpanElement);
    const averageRating = yield page.$eval(averageReviewSelector, el => el.textContent);
    console.log(averageRating);
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
    console.log(ratings);
    yield browser.close();
});
mainFn();
