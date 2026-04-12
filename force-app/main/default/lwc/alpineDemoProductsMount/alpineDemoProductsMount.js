import { LightningElement } from 'lwc';
import basePath from '@salesforce/community/basePath';

export default class AlpineDemoProductsMount extends LightningElement {
    get detailPagePath() {
        const normalizedBasePath = basePath === '/' ? '' : basePath || '';
        return `${normalizedBasePath}/product`.replace(/\/{2,}/g, '/');
    }
}
