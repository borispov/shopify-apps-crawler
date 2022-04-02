import fs from 'fs/promises';
import categories from './categories';

const SHOPIFY_URL = 'https://apps.shopify.com/browse/'; 

(async () => {
    let newCats:any = {};
    for (const [catName, cat] of Object.entries(categories)) {
        newCats[catName] = {};
        let keys = Object.keys(cat);
        for (const [k, v] of Object.entries(cat)) {
            // get the URLs of ALL Shopify App Categories
            newCats[catName][k] = SHOPIFY_URL + v + '?sort_by=installed';
        }
    }
    await fs.writeFile('./categoriesWithLinks.json', JSON.stringify(newCats));
})();