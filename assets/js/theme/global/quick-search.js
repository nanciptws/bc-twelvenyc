import _ from 'lodash';
import utils from '@bigcommerce/stencil-utils';
import StencilDropDown from './stencil-dropdown';

export default function () {
    const TOP_STYLING = 'top: 49px;';
    const $quickSearchResults = $('.quickSearchResults');
    const $quickSearchForms = $('[data-quick-search-form]');
    const $quickSearchExpand = $('#quick-search-expand');
    const $searchQuery = $quickSearchForms.find('[data-search-quick]');
    const $searchTitle = $('[data-twelve-search-title]');
    const $searchLoading = $('[data-twelve-search-loading]');
    const preloadQuery = $('.twelve-search-overlay').data('pre-load') || 'box';
    let popularLoaded = false;

    const renderResults = (response, isPopular = false) => {
        $quickSearchResults.html(response);
        if (typeof window.twelveRefreshB2BWishlistCards === 'function') {
            window.twelveRefreshB2BWishlistCards();
        }
        const resultCount = $quickSearchResults.find('[data-twelve-result-count]').first().data('twelve-result-count') || 0;
        $searchTitle.html(isPopular ? 'Products · <em>Popular right now</em>' : `Products (${resultCount})`);
    };

    const loadPopularProducts = () => {
        if (popularLoaded) return;
        popularLoaded = true;
        $searchLoading.show();
        // BigCommerce quick search supplies the products; keep the visible input empty.
        utils.api.search.search(preloadQuery, { template: 'search/quick-results' }, (err, response) => {
            $searchLoading.hide();
            if (!err && !$searchQuery.val()) renderResults(response, true);
        });
    };
    const stencilDropDownExtendables = {
        hide: () => {
            $quickSearchExpand.attr('aria-expanded', false);
            $searchQuery.trigger('blur');
        },
        show: (event) => {
            $quickSearchExpand.attr('aria-expanded', true);
            $searchQuery.trigger('focus');
            loadPopularProducts();
            event.stopPropagation();
        },
    };
    const stencilDropDown = new StencilDropDown(stencilDropDownExtendables);
    stencilDropDown.bind($('[data-search="quickSearch"]'), $('#quickSearch'), TOP_STYLING);

    stencilDropDownExtendables.onBodyClick = (e, $container) => {
        // If the target element has this data tag or one of it's parents, do not close the search results
        // We have to specify `.modal-background` because of limitations around Foundation Reveal not allowing
        // any modification to the background element.
        if ($(e.target).closest('[data-prevent-quick-search-close], .modal-background').length === 0) {
            stencilDropDown.hide($container);
        }
    };

    // stagger searching for 1200ms after last input
    const debounceWaitTime = 1200;
    const doSearch = _.debounce((searchQuery) => {
        $searchLoading.show();
        utils.api.search.search(searchQuery, { template: 'search/quick-results' }, (err, response) => {
            $searchLoading.hide();
            if (err) {
                return false;
            }

            renderResults(response);
            const $quickSearchResultsCurrent = $quickSearchResults.filter(':visible');

            const $noResultsMessage = $quickSearchResultsCurrent.find('.quickSearchMessage');
            if ($noResultsMessage.length) {
                $noResultsMessage.attr({
                    role: 'status',
                    'aria-live': 'polite',
                });
            } else {
                const $quickSearchAriaMessage = $quickSearchResultsCurrent.next();
                $quickSearchAriaMessage.addClass('u-hidden');

                const predefinedText = $quickSearchAriaMessage.data('search-aria-message-predefined-text');
                const itemsFoundCount = $quickSearchResultsCurrent.find('.product').length;

                $quickSearchAriaMessage.text(`${itemsFoundCount} ${predefinedText} ${searchQuery}`);

                setTimeout(() => {
                    $quickSearchAriaMessage.removeClass('u-hidden');
                }, 100);
            }
        });
    }, debounceWaitTime);

    $('[data-twelve-search-term]').on('click', (event) => {
        const searchQuery = $(event.currentTarget).data('twelve-search-term');
        $searchQuery.val(searchQuery);
        doSearch.cancel();
        $('[data-twelve-search-term]').removeClass('is-active');
        $(event.currentTarget).addClass('is-active');
        $searchLoading.show();
        utils.api.search.search(searchQuery, { template: 'search/quick-results' }, (err, response) => {
            $searchLoading.hide();
            if (!err) renderResults(response);
        });
    });

    utils.hooks.on('search-quick', (event, currentTarget) => {
        const searchQuery = $(currentTarget).val();

        $('[data-twelve-search-term]').removeClass('is-active');

        // server will only perform search with at least 3 characters
        if (searchQuery.length < 3) {
            return;
        }

        doSearch(searchQuery);
    });

    // Catch the submission of the quick-search forms
    $quickSearchForms.on('submit', event => {
        event.preventDefault();

        const $target = $(event.currentTarget);
        const searchQuery = $target.find('input').val();
        const searchUrl = $target.data('url');

        if (searchQuery.length === 0) {
            return;
        }

        window.location.href = `${searchUrl}?search_query=${encodeURIComponent(searchQuery)}`;
    });
}
