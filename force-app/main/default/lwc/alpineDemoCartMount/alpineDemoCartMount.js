import { LightningElement } from 'lwc';
import basePath from '@salesforce/community/basePath';

export default class AlpineDemoCartMount extends LightningElement {
    get requestPageUrl() {
        return this.hrefFor('request');
    }

    hrefFor(path) {
        const normalizedBasePath = basePath === '/' ? '' : basePath || '';

        if (!path) {
            return normalizedBasePath || '/';
        }

        const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
        return `${normalizedBasePath}/${normalizedPath}`.replace(/\/{2,}/g, '/');
    }
}
