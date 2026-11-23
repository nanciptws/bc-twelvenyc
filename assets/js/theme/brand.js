import Category from './category';
import FacetedSearch from './common/faceted-search';

export default class Brand extends Category {
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
        const productsPerPage = this.context.brandProductsPerPage;
        const requestOptions = {
            template: {
                productListing: 'brand/product-listing',
                sidebar: 'brand/sidebar',
            },
            config: {
                shop_by_brand: true,
                brand: {
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            showMore: 'brand/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $('.twelve-category-page').removeClass('twelve-facets-ready');
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);
            this.initTwelveFacetDropdowns();
            this.initTwelveGridDensity();
            this.initTwelveLoadMore();
            this.updateTwelveProgress();

            if (this.twelveMobileSortInProgress) {
                const closeMobileSheets = () => {
                    $facetedSearchContainer
                        .find('#facetedSearch-navList, .twelve-mobile-sort-sheet')
                        .removeClass('is-open')
                        .attr('aria-hidden', 'true');
                    $facetedSearchContainer.find('.facetedSearch-toggle')
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
        });
    }

    updateTwelveProgress() {
        const $listing = $('#product-listing-container');
        const loaded = $listing.find('.productGrid > .product').length;
        const nextPageUrl = $listing.find('[data-twelve-load-more-button]').attr('href');
        const shopByBrandTotal = Number.parseInt($listing.find('[data-twelve-brand-count-source]').text().trim(), 10);

        const setTotal = (total) => {
            $listing.find('[data-twelve-total-source]').attr('data-twelve-total-source', total);
            $listing.find('[data-twelve-total-count], [data-twelve-load-total]').text(total);
            super.updateTwelveProgress();
        };

        if (Number.isFinite(shopByBrandTotal) && shopByBrandTotal >= loaded) {
            setTotal(shopByBrandTotal);
            return;
        }

        if (!nextPageUrl) {
            setTotal(loaded);
            return;
        }

        const totalUrl = new URL(window.location.href);
        totalUrl.searchParams.delete('page');
        totalUrl.searchParams.delete('sort');
        const requestKey = totalUrl.toString();
        if (this.twelveBrandTotalKey === requestKey && this.twelveBrandTotal) {
            setTotal(this.twelveBrandTotal);
            return;
        }

        const countRemainingPages = (url, total, visited = new Set()) => {
            if (!url || visited.has(url)) return Promise.resolve(total);
            visited.add(url);

            return $.get(url).then((response) => {
                const $response = $('<div>').append($.parseHTML(response));
                const pageCount = $response.find('#product-listing-container .productGrid > .product').length;
                const followingUrl = $response.find('[data-twelve-load-more-button]').attr('href');

                return countRemainingPages(followingUrl, total + pageCount, visited);
            });
        };

        countRemainingPages(nextPageUrl, loaded).done((total) => {

            this.twelveBrandTotalKey = requestKey;
            this.twelveBrandTotal = total;
            setTotal(total);
        }).fail(() => setTotal(loaded));
    }
}
