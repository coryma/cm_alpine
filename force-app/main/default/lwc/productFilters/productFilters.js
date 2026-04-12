import { LightningElement, api } from 'lwc';
import { ALL_CATEGORY_VALUE, DEFAULT_PRODUCT_SORT } from 'c/productCatalogAdapter';

const SEARCH_DEBOUNCE_MS = 250;

export default class ProductFilters extends LightningElement {
    @api categories = [];
    @api sortOptions = [];
    @api searchPlaceholder = '搜尋商品';

    _searchValue = '';
    _activeCategory = ALL_CATEGORY_VALUE;
    _sortValue = DEFAULT_PRODUCT_SORT;
    debounceHandle;

    @api
    get searchValue() {
        return this._searchValue;
    }

    set searchValue(value) {
        this._searchValue = value || '';
    }

    @api
    get activeCategory() {
        return this._activeCategory;
    }

    set activeCategory(value) {
        this._activeCategory = value || ALL_CATEGORY_VALUE;
    }

    @api
    get sortValue() {
        return this._sortValue;
    }

    set sortValue(value) {
        this._sortValue = value || DEFAULT_PRODUCT_SORT;
    }

    get normalizedCategories() {
        return (this.categories || []).map((category) => ({
            ...category,
            buttonClass: this.computeCategoryClass(category.value)
        }));
    }

    get normalizedSortOptions() {
        return (this.sortOptions || []).map((option) => ({
            ...option,
            selected: option.value === this._sortValue
        }));
    }

    get hasActiveFilters() {
        return (
            !!this._searchValue.trim() ||
            this._activeCategory !== ALL_CATEGORY_VALUE ||
            this._sortValue !== DEFAULT_PRODUCT_SORT
        );
    }

    disconnectedCallback() {
        clearTimeout(this.debounceHandle);
    }

    handleSearchInput(event) {
        this._searchValue = event.target.value || '';
        clearTimeout(this.debounceHandle);
        this.debounceHandle = setTimeout(() => {
            this.emitChange();
        }, SEARCH_DEBOUNCE_MS);
    }

    handleCategoryClick(event) {
        this._activeCategory = event.currentTarget.dataset.value || ALL_CATEGORY_VALUE;
        this.emitChange();
    }

    handleSortChange(event) {
        this._sortValue = event.target.value;
        this.emitChange();
    }

    handleReset() {
        this.resetFilters();
        this.emitChange();
    }

    @api
    resetFilters() {
        this._searchValue = '';
        this._activeCategory = ALL_CATEGORY_VALUE;
        this._sortValue = DEFAULT_PRODUCT_SORT;
    }

    emitChange() {
        this.dispatchEvent(
            new CustomEvent('filterchange', {
                detail: {
                    searchTerm: this._searchValue.trim(),
                    category: this._activeCategory,
                    sortBy: this._sortValue
                }
            })
        );
    }

    computeCategoryClass(value) {
        return value === this._activeCategory ? 'chip chip-active' : 'chip';
    }
}
