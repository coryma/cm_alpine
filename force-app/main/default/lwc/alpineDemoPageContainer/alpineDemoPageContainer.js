import { LightningElement, api } from 'lwc';

export default class AlpineDemoPageContainer extends LightningElement {
    @api eyebrow;
    @api title;
    @api intro;

    get hasHeader() {
        return Boolean(this.eyebrow || this.title || this.intro);
    }
}
