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
const promises_1 = __importDefault(require("fs/promises"));
const categories_1 = __importDefault(require("./categories"));
const SHOPIFY_URL = 'https://apps.shopify.com/browse/';
(() => __awaiter(void 0, void 0, void 0, function* () {
    let newCats = {};
    for (const [catName, cat] of Object.entries(categories_1.default)) {
        newCats[catName] = {};
        let keys = Object.keys(cat);
        for (const [k, v] of Object.entries(cat)) {
            // get the URLs of ALL Shopify App Categories
            newCats[catName][k] = SHOPIFY_URL + v + '?sort_by=installed';
        }
    }
    yield promises_1.default.writeFile('./categoriesWithLinks.json', JSON.stringify(newCats));
}))();
