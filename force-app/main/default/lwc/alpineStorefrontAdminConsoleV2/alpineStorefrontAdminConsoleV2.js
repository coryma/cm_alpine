import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAdminConfig from '@salesforce/apex/AlpineStorefrontConfigController.getAdminConfig';
import ensureAdminRecordId from '@salesforce/apex/AlpineStorefrontConfigController.ensureAdminRecordId';
import saveAdminConfigJson from '@salesforce/apex/AlpineStorefrontConfigController.saveAdminConfigJson';
import { DEFAULT_STOREFRONT_CONFIG } from 'c/alpineStorefrontConfigAdapter';

const DEFAULT_ADMIN_CONFIG = Object.freeze({
    ...DEFAULT_STOREFRONT_CONFIG,
    demoPricebookId: '',
    siteNetworkName: 'B2C - Alpine group',
    publicContentChannelName: 'B2C - Alpine group Channel',
    cmsLanguage: 'en_US',
    enableCmsMedia: true
});

const EMPTY_ADMIN_CONFIG = Object.freeze({
    recordId: null,
    storeName: '',
    storeTagline: '',
    logoImageUrl: '',
    searchPlaceholder: '',
    heroEyebrow: '',
    heroTitle: '',
    heroBody: '',
    heroPrimaryCtaLabel: '',
    heroSecondaryCtaLabel: '',
    flashSaleTitle: '',
    flashSaleIntro: '',
    technologyTitle: '',
    technologyIntro: '',
    recommendationsTitle: '',
    recommendationsPromoTitle: '',
    recommendationsPromoBody: '',
    recommendationsPromoCtaLabel: '',
    footerCopy: '',
    demoPricebookId: '',
    siteNetworkName: '',
    publicContentChannelName: '',
    cmsLanguage: '',
    enableCmsMedia: true
});

const PRODUCT_FIELD_GUIDES = Object.freeze([
    {
        apiName: 'Show_on_Alpine__c',
        label: '是否在前台顯示',
        description: '若站內已有任一商品勾選此欄位，前台只顯示勾選為 true 的商品。'
    },
    {
        apiName: 'Alpine_Category__c',
        label: '前台分類',
        description: '優先作為前台分類名稱，若未填則回退到 Product Family。'
    },
    {
        apiName: 'Alpine_Short_Description__c',
        label: '商品短描述',
        description: '用於首頁卡片、列表卡片與詳情頁上半部短文案。'
    },
    {
        apiName: 'Alpine_Badge__c',
        label: '商品標籤',
        description: '可用逗號、分號或換行輸入多個 badge，前台會自動切分。'
    },
    {
        apiName: 'Alpine_Sort_Order__c',
        label: '精選排序',
        description: '數字越小越前面，用於首頁與精選排序結果。'
    }
]);

export default class AlpineStorefrontAdminConsoleV2 extends LightningElement {
    config = { ...DEFAULT_ADMIN_CONFIG };
    recordId = null;
    errorMessage = '';
    isLoading = true;
    isSaving = false;

    connectedCallback() {
        this.initialize();
    }

    get disableActions() {
        return this.isLoading || this.isSaving || !this.recordId;
    }

    get productFieldGuides() {
        return PRODUCT_FIELD_GUIDES;
    }

    get hasLogoImageUrl() {
        return Boolean(this.config.logoImageUrl);
    }

    async initialize() {
        this.isLoading = true;
        this.errorMessage = '';

        try {
            this.recordId = await ensureAdminRecordId();
            await this.loadConfig();
        } catch (error) {
            this.errorMessage = reduceError(error);
        } finally {
            this.isLoading = false;
        }
    }

    async loadConfig() {
        const payload = await getAdminConfig();
        this.config = normalizeAdminConfig(payload);
        this.recordId = payload?.recordId || this.recordId;
    }

    handleFieldChange(event) {
        const fieldName = event.target.name;
        const fieldValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value ?? '';

        this.config = {
            ...this.config,
            [fieldName]: fieldValue
        };
    }

    async handleReload() {
        this.isLoading = true;
        this.errorMessage = '';

        try {
            await this.loadConfig();
        } catch (error) {
            this.errorMessage = reduceError(error);
        } finally {
            this.isLoading = false;
        }
    }

    handleReset() {
        this.loadConfig().catch((error) => {
            this.errorMessage = reduceError(error);
        });
    }

    async handleSave() {
        this.isSaving = true;
        this.errorMessage = '';

        try {
            const nextConfig = this.collectConfigFromInputs();
            nextConfig.recordId = this.recordId;
            const payload = await saveAdminConfigJson({ payloadJson: JSON.stringify(nextConfig) });
            this.config = normalizeAdminConfig(payload);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: '已儲存',
                    message: '商城設定已更新。',
                    variant: 'success'
                })
            );
        } catch (error) {
            this.errorMessage = reduceError(error);
        } finally {
            this.isSaving = false;
        }
    }

    collectConfigFromInputs() {
        const nextConfig = { ...this.config };
        const inputFields = this.template.querySelectorAll('lightning-input, lightning-textarea');

        inputFields.forEach((field) => {
            if (!field?.name) {
                return;
            }

            nextConfig[field.name] = field.type === 'checkbox' ? field.checked : normalizeString(field.value);
        });

        this.config = nextConfig;
        return nextConfig;
    }
}

function normalizeAdminConfig(payload) {
    const hasStoredRecord = Boolean(payload?.recordId);
    const fallbackConfig = hasStoredRecord ? EMPTY_ADMIN_CONFIG : DEFAULT_ADMIN_CONFIG;

    return {
        ...fallbackConfig,
        recordId: payload?.recordId ?? null,
        storeName: stringOrFallback(payload, 'storeName', fallbackConfig.storeName),
        storeTagline: stringOrFallback(payload, 'storeTagline', fallbackConfig.storeTagline),
        logoImageUrl: stringOrFallback(payload, 'logoImageUrl', fallbackConfig.logoImageUrl),
        searchPlaceholder: stringOrFallback(payload, 'searchPlaceholder', fallbackConfig.searchPlaceholder),
        heroEyebrow: stringOrFallback(payload, 'heroEyebrow', fallbackConfig.heroEyebrow),
        heroTitle: stringOrFallback(payload, 'heroTitle', fallbackConfig.heroTitle),
        heroBody: stringOrFallback(payload, 'heroBody', fallbackConfig.heroBody),
        heroPrimaryCtaLabel: stringOrFallback(
            payload,
            'heroPrimaryCtaLabel',
            fallbackConfig.heroPrimaryCtaLabel
        ),
        heroSecondaryCtaLabel: stringOrFallback(
            payload,
            'heroSecondaryCtaLabel',
            fallbackConfig.heroSecondaryCtaLabel
        ),
        flashSaleTitle: stringOrFallback(payload, 'flashSaleTitle', fallbackConfig.flashSaleTitle),
        flashSaleIntro: stringOrFallback(payload, 'flashSaleIntro', fallbackConfig.flashSaleIntro),
        technologyTitle: stringOrFallback(payload, 'technologyTitle', fallbackConfig.technologyTitle),
        technologyIntro: stringOrFallback(payload, 'technologyIntro', fallbackConfig.technologyIntro),
        recommendationsTitle: stringOrFallback(
            payload,
            'recommendationsTitle',
            fallbackConfig.recommendationsTitle
        ),
        recommendationsPromoTitle: stringOrFallback(
            payload,
            'recommendationsPromoTitle',
            fallbackConfig.recommendationsPromoTitle
        ),
        recommendationsPromoBody: stringOrFallback(
            payload,
            'recommendationsPromoBody',
            fallbackConfig.recommendationsPromoBody
        ),
        recommendationsPromoCtaLabel: stringOrFallback(
            payload,
            'recommendationsPromoCtaLabel',
            fallbackConfig.recommendationsPromoCtaLabel
        ),
        footerCopy: stringOrFallback(payload, 'footerCopy', fallbackConfig.footerCopy),
        demoPricebookId: stringOrFallback(payload, 'demoPricebookId', fallbackConfig.demoPricebookId),
        siteNetworkName: stringOrFallback(payload, 'siteNetworkName', fallbackConfig.siteNetworkName),
        publicContentChannelName: stringOrFallback(
            payload,
            'publicContentChannelName',
            fallbackConfig.publicContentChannelName
        ),
        cmsLanguage: stringOrFallback(payload, 'cmsLanguage', fallbackConfig.cmsLanguage),
        enableCmsMedia: payload?.enableCmsMedia ?? fallbackConfig.enableCmsMedia
    };
}

function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function stringOrFallback(payload, fieldName, fallbackValue) {
    return payload && Object.prototype.hasOwnProperty.call(payload, fieldName)
        ? normalizeString(payload[fieldName])
        : fallbackValue;
}

function reduceError(error) {
    if (Array.isArray(error?.body)) {
        return error.body.map((item) => item.message).join(', ');
    }

    if (error?.body?.output?.fieldErrors) {
        return Object.values(error.body.output.fieldErrors)
            .flat()
            .map((item) => item.message)
            .join(', ');
    }

    if (error?.body?.output?.errors?.length) {
        return error.body.output.errors.map((item) => item.message).join(', ');
    }

    return error?.body?.message || error?.message || '商城設定暫時無法儲存。';
}
