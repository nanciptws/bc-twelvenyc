import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from './common/utils/translations-utils';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').trigger('focus');
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        if (this.ensureSustainablySourcedFilters()) return;

        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        this.initFacetedSearch();
        this.initTwelveFacetDropdowns();
        this.initTwelveGridDensity();
        this.initTwelveLoadMore();
        this.updateTwelveProgress();

        if (!$('#facetedSearch').length) {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);

            // Refresh range view when shop-by-price enabled
            const urlParams = new URLSearchParams(window.location.search);

            if (urlParams.has('search_query')) {
                $('.reset-filters').show();
            }

            $('input[name="price_min"]').attr('value', urlParams.get('price_min'));
            $('input[name="price_max"]').attr('value', urlParams.get('price_max'));
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();
        this.hideSustainablySourcedFiltersInUrl();
        this.setSustainablySourcedLoading(false);
    }

    isSustainablySourcedCategory() {
        return $('[data-sustainably-sourced-category]').length > 0;
    }

    getSustainablySourcedFilters() {
        const filterConfig = document.querySelector('[data-sustainably-sourced-filters]');

        if (!filterConfig) return [];

        try {
            const filters = JSON.parse(filterConfig.textContent);

            return Array.isArray(filters) ? filters : [];
        } catch (error) {
            return [];
        }
    }

    getSustainablySourcedUrl(url) {
        if (!this.isSustainablySourcedCategory()) return url;

        this.setSustainablySourcedLoading(true);

        const nextUrl = new URL(url, window.location.origin);

        nextUrl.searchParams.set('_bc_fsnf', '1');
        this.getSustainablySourcedFilters().forEach(([name, value]) => {
            if (!nextUrl.searchParams.getAll(name).includes(value)) {
                nextUrl.searchParams.append(name, value);
            }
        });

        return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    }

    setSustainablySourcedLoading(isLoading) {
        if (!this.isSustainablySourcedCategory()) return;

        $('[data-sustainably-sourced-category]').toggleClass('is-filtered-ready', !isLoading);
    }

    ensureSustainablySourcedFilters() {
        if (!this.isSustainablySourcedCategory()) return false;

        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        const requiredUrl = this.getSustainablySourcedUrl(currentUrl);

        if (requiredUrl === currentUrl) return false;

        window.location.replace(requiredUrl);
        return true;
    }

    hideSustainablySourcedFiltersInUrl() {
        if (!this.isSustainablySourcedCategory()) return;

        const visibleUrl = new URL(window.location.href);

        this.getSustainablySourcedFilters().forEach(([name, requiredValue]) => {
            const visibleValues = visibleUrl.searchParams.getAll(name)
                .filter(value => value !== requiredValue);

            visibleUrl.searchParams.delete(name);
            visibleValues.forEach(value => visibleUrl.searchParams.append(name, value));
        });
        visibleUrl.searchParams.delete('_bc_fsnf');

        window.history.replaceState(
            window.history.state,
            document.title,
            `${visibleUrl.pathname}${visibleUrl.search}${visibleUrl.hash}`,
        );
    }

    hideSustainablySourcedSelectedFilters($container) {
        if (!this.isSustainablySourcedCategory()) return;

        const defaultValues = new Set(
            this.getSustainablySourcedFilters().map(([, value]) => value.trim()),
        );
        const $refineFilters = $container.find('.facetedSearch-refineFilters');

        $refineFilters.find('.inlineList li').each((index, item) => {
            const selectedValue = $(item).find('.facetLabel').text().replace(/\s+/g, ' ').trim();

            if (defaultValues.has(selectedValue)) {
                $(item).remove();
            }
        });

        const hasExtraFilters = $refineFilters.find('.inlineList li').length > 0;

        $refineFilters.toggle(hasExtraFilters);
        $refineFilters.find('> a[data-faceted-search-facet]').toggle(hasExtraFilters);
        $container.find('[data-twelve-mobile-filter-clear]').toggle(hasExtraFilters);
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.trigger('focus');
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $('.twelve-category-page').removeClass('twelve-facets-ready');
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);
            this.initTwelveFacetDropdowns();
            this.initTwelveGridDensity();
            this.initTwelveLoadMore();
            this.updateTwelveProgress();
            this.hideSustainablySourcedFiltersInUrl();
            this.setSustainablySourcedLoading(false);

            if (this.twelveMobileSortInProgress) {
                const closeMobileSheets = () => {
                    $('#faceted-search-container')
                        .find('#facetedSearch-navList, .twelve-mobile-sort-sheet')
                        .removeClass('is-open')
                        .attr('aria-hidden', 'true');
                    $('#faceted-search-container .facetedSearch-toggle')
                        .removeClass('is-open')
                        .attr('aria-expanded', 'false');
                    $('body').removeClass('twelve-mobile-sheet-open');
                    this.twelveMobileFilterOpen = false;
                };

                closeMobileSheets();
                window.setTimeout(closeMobileSheets, 0);
                this.twelveMobileSortInProgress = false;
            }

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
            transformUrl: (url) => this.getSustainablySourcedUrl(url),
        });
    }

    initTwelveFacetDropdowns() {
        const $container = $('#faceted-search-container');
        const mobileSortInProgress = this.twelveMobileSortInProgress;
        const facetToRestore = mobileSortInProgress ? null : this.twelveOpenFacet;

        if (mobileSortInProgress) {
            this.twelveOpenFacet = null;
            this.twelveMobileFilterOpen = false;
        }
        this.hideSustainablySourcedSelectedFilters($container);

        const selectedChipCount = $container.find('.facetedSearch-refineFilters .inlineList li').length;
        const selectedFacetCount = this.isSustainablySourcedCategory()
            ? selectedChipCount
            : selectedChipCount || $container.find('.accordion-content .navList-action.is-selected').length;

        $container.find('[data-twelve-mobile-filter-count]').text(selectedFacetCount || '');

        $container.find('.accordion-navigation, .accordion-content').removeClass('is-open');
        $container.find('.accordion-navigation').attr('aria-expanded', 'false');
        $container.find('.accordion-block').each((index, block) => {
            const $block = $(block);
            const selectedCount = $block.find('.navList-action.is-selected').length;
            const $title = $block.find('.accordion-title').first();

            $title.find('.twelve-facet-count').remove();
            if (selectedCount) {
                $title.append(`<span class="twelve-facet-count">${selectedCount}</span>`);
            }
        });
        if (facetToRestore && $container.find(facetToRestore).length) {
            $container.find(`[data-collapsible="${facetToRestore}"]`).addClass('is-open').attr('aria-expanded', 'true');
            $container.find(facetToRestore).addClass('is-open').attr('aria-hidden', 'false');
        }
        if (this.twelveMobileFilterOpen && window.matchMedia('(max-width: 991px)').matches) {
            $container.find('#facetedSearch-navList').addClass('is-open').attr('aria-hidden', 'false');
            $('body').addClass('twelve-mobile-sheet-open');
        }
        if (this.facetedSearch) {
            this.facetedSearch.collapsedFacets = $container.find('.accordion-navigation').map((index, navigation) => {
                const target = $(navigation).attr('data-collapsible');
                return target !== facetToRestore ? target.replace(/^#/, '') : null;
            }).get();
        }
        //Here V1
        const containerElement = $container.get(0);
        if (containerElement?.twelveFacetClickHandler) {
            containerElement.removeEventListener('click', containerElement.twelveFacetClickHandler, true);
        }
        if(containerElement){
            containerElement.twelveFacetClickHandler = (event) => {
                const navigation = event.target.closest('.accordion-navigation');
                if (!navigation || !containerElement.contains(navigation)) return;
    
                event.preventDefault();
                event.stopImmediatePropagation();
    
                const $current = $(navigation);
                const target = $current.attr('data-collapsible');
                const willOpen = !$current.hasClass('is-open');
    
                $container.find('.accordion-navigation').removeClass('is-open').attr('aria-expanded', 'false');
                $container.find('.accordion-content').removeClass('is-open').attr('aria-hidden', 'true');
    
                if (willOpen) {
                    $current.addClass('is-open').attr('aria-expanded', 'true');
                    $container.find(target).addClass('is-open').attr('aria-hidden', 'false');
                    this.twelveOpenFacet = target;
                } else {
                    this.twelveOpenFacet = null;
                }
            };
            containerElement.addEventListener('click', containerElement.twelveFacetClickHandler, true);
        }

        $container.off('click.twelveSelection').on('click.twelveSelection', '.accordion-content [data-faceted-search-facet]', (event) => {
            this.twelveOpenFacet = `#${$(event.currentTarget).closest('.accordion-content').attr('id')}`;
            this.twelveMobileFilterOpen = window.matchMedia('(max-width: 991px)').matches;
        });

        $container.off('click.twelveDone').on('click.twelveDone', '.facet-done', () => {
            this.twelveOpenFacet = null;
            $container.find('.accordion-navigation, .accordion-content').removeClass('is-open');
            $container.find('.accordion-navigation').attr('aria-expanded', 'false');
        });

        $container.off('click.twelveMobileClose').on('click.twelveMobileClose', '[data-twelve-mobile-filter-close]', () => {
            this.twelveMobileFilterOpen = false;
            $('#facetedSearch-navList').removeClass('is-open').attr('aria-hidden', 'true');
            $('.facetedSearch-toggle').removeClass('is-open').attr('aria-expanded', 'false');
            $('body').removeClass('twelve-mobile-sheet-open');
        });

        $container.off('click.twelveMobileClear').on('click.twelveMobileClear', '[data-twelve-mobile-filter-clear]', () => {
            const clearUrl = $container.find('.facetedSearch-refineFilters > a[data-faceted-search-facet]').attr('href');
            if (clearUrl) window.location.assign(this.getSustainablySourcedUrl(clearUrl));
        });

        $container.off('click.twelveMobileFilterOpen').on('click.twelveMobileFilterOpen', '.facetedSearch-toggle', () => {
            this.twelveMobileFilterOpen = true;
            $('body').addClass('twelve-mobile-sheet-open');
        });

        $container.off('click.twelveMobileSortOpen').on('click.twelveMobileSortOpen', '[data-twelve-mobile-sort-open]', () => {
            this.twelveMobileFilterOpen = false;
            this.twelveOpenFacet = null;
            $container.find('.accordion-navigation, .accordion-content').removeClass('is-open');
            $container.find('.accordion-navigation').attr('aria-expanded', 'false');
            $container.find('.accordion-content').attr('aria-hidden', 'true');
            $container.find('#facetedSearch-navList').removeClass('is-open').attr('aria-hidden', 'true');

            const $select = $container.find('#sort');
            const $list = $container.find('[data-twelve-mobile-sort-list]').empty();

            $select.find('option').each((index, option) => {
                const $option = $(option);
                $('<button type="button" role="radio">')
                    .attr('aria-checked', option.selected ? 'true' : 'false')
                    .attr('data-sort-value', $option.val())
                    .text($option.text())
                    .appendTo($list);
            });
            $container.find('.twelve-mobile-sort-sheet').addClass('is-open').attr('aria-hidden', 'false');
            $('body').addClass('twelve-mobile-sheet-open');
        });

        $container.off('click.twelveMobileSheetClose').on('click.twelveMobileSheetClose', '[data-twelve-mobile-sheet-close]', () => {
            this.twelveMobileFilterOpen = false;
            $container.find('#facetedSearch-navList, .twelve-mobile-sort-sheet').removeClass('is-open').attr('aria-hidden', 'true');
            $('body').removeClass('twelve-mobile-sheet-open');
        });

        $container.off('click.twelveMobileSortValue').on('click.twelveMobileSortValue', '[data-sort-value]', (event) => {
            const value = $(event.currentTarget).attr('data-sort-value');
            const $select = $container.find('#sort');

            this.twelveMobileFilterOpen = false;
            this.twelveOpenFacet = null;
            this.twelveMobileSortInProgress = true;
            $container.find('.accordion-navigation, .accordion-content').removeClass('is-open');
            $container.find('.accordion-navigation').attr('aria-expanded', 'false');
            $container.find('.accordion-content').attr('aria-hidden', 'true');
            $select.val(value);
            $container.find('[data-sort-value]').attr('aria-checked', 'false');
            $(event.currentTarget).attr('aria-checked', 'true');
            $container.find('.twelve-mobile-sort-sheet').removeClass('is-open').attr('aria-hidden', 'true');
            $('body').removeClass('twelve-mobile-sheet-open');

            const selectElement = $select.get(0);
            if (selectElement) {
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        $('.twelve-category-page').addClass('twelve-facets-ready');
    }

    initTwelveGridDensity() {
        const $page = $('.twelve-category-page');

        $page.off('click.twelveDensity').on('click.twelveDensity', '[data-category-columns]', (event) => {
            const $button = $(event.currentTarget);
            const useThreeColumns = $button.data('category-columns') === 3;

            $page.find('[data-category-columns]').removeClass('is-active').attr('aria-pressed', 'false');
            $button.addClass('is-active').attr('aria-pressed', 'true');
            $page.find('.productGrid').toggleClass('is-three-columns', useThreeColumns);
        });
    }

    updateTwelveProgress() {
        const $listing = $('#product-listing-container');
        const loaded = $listing.find('.productGrid > .product').length;
        const total = Number($listing.find('[data-twelve-total-source]').attr('data-twelve-total-source')) || loaded;

        $listing.find('[data-twelve-showing-count], [data-twelve-loaded-count]').text(loaded);
        $listing.find('[data-twelve-load-progress]').css('width', `${Math.min(100, (loaded / total) * 100)}%`);
    }

    initTwelveLoadMore() {
        const $listing = $('#product-listing-container');

        $listing.off('click.twelveLoadMore').on('click.twelveLoadMore', '[data-twelve-load-more-button]', (event) => {
            event.preventDefault();

            const $button = $(event.currentTarget);
            const nextUrl = $button.attr('href');

            if (!nextUrl || $button.hasClass('is-loading')) return;

            $button.addClass('is-loading').attr('aria-disabled', 'true').html('<span>Loading…</span>');

            $.get(nextUrl).done((response) => {
                const $response = $('<div>').append($.parseHTML(response));
                const $newProducts = $response.find('#product-listing-container .productGrid .product');
                const newNextUrl = $response.find('[data-twelve-load-more-button]').attr('href');
                const $grid = $listing.find('.productGrid');

                $grid.append($newProducts);

                this.updateTwelveProgress();

                if (newNextUrl) {
                    $button.attr('href', newNextUrl).removeClass('is-loading').removeAttr('aria-disabled').html('<span>Load more</span>');
                } else {
                    $button.remove();
                }
            }).fail(() => {
                $button.removeClass('is-loading').removeAttr('aria-disabled').html('<span>Load more</span>');
            });
        });
    }
}
