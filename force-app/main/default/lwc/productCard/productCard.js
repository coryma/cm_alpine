import { LightningElement, api } from 'lwc';

export default class ProductCard extends LightningElement {
    @api product;
    @api detailLabel = '查看詳情';

    get imageUrl() {
        return this.product?.listingImage?.url || this.product?.images?.[0]?.url || '';
    }

    get imageAlt() {
        return this.product?.listingImage?.alt || this.product?.images?.[0]?.alt || this.product?.name || '商品圖片';
    }

    get detailUrl() {
        return this.product?.detailUrl || '#';
    }

    get hasDetailUrl() {
        return this.detailUrl !== '#';
    }

    get badges() {
        return Array.isArray(this.product?.badges) ? this.product.badges : [];
    }

    get primaryBadge() {
        return this.badges[0] || '';
    }

    get secondaryBadges() {
        return this.badges.slice(1, 3);
    }

    get hasSecondaryBadges() {
        return this.secondaryBadges.length > 0;
    }

    get hasBadges() {
        return this.badges.length > 0;
    }

    get featureHighlights() {
        return Array.isArray(this.product?.featureHighlights) ? this.product.featureHighlights.slice(0, 3) : [];
    }

    get hasFeatureHighlights() {
        return this.featureHighlights.length > 0;
    }

    get categoryLabel() {
        return this.product?.categoryLabel || this.product?.category || '其他';
    }

    get formattedPrice() {
        return this.product?.formattedPrice || '暫無售價';
    }

    handleOpen(event) {
        this.dispatchEvent(
            new CustomEvent('open', {
                detail: {
                    productId: this.product?.id,
                    productSlug: this.product?.slug,
                    sku: this.product?.sku,
                    detailUrl: this.detailUrl
                },
                bubbles: true,
                composed: true
            })
        );

        if (!this.hasDetailUrl) {
            event.preventDefault();
        }
    }
}
