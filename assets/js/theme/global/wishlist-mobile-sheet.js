export default function wishlistMobileSheet() {
    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const $body = $('body');
    const $document = $(document);
    let $activeTrigger = null;

    const closeSheet = (restoreFocus = true) => {
        $('.card-wishlist-menu.is-open')
            .removeClass('is-open')
            .attr('aria-hidden', 'true');
        $('.card-save.is-open')
            .removeClass('is-open')
            .attr('aria-expanded', 'false');
        $body.removeClass('card-wishlist-sheet-open');

        if (restoreFocus && $activeTrigger) {
            $activeTrigger.trigger('focus');
        }

        $activeTrigger = null;
    };

    $document
        .off('click.cardWishlistMobileOpen')
        .on('click.cardWishlistMobileOpen', '.card-save', (event) => {
            if (!mobileQuery.matches) return;

            const $trigger = $(event.currentTarget);
            const menuId = $trigger.attr('data-dropdown');

            window.setTimeout(() => {
                const $menu = $(`#${menuId}`);

                if (!$menu.hasClass('is-open')) {
                    closeSheet(false);
                    return;
                }

                $('.card-wishlist-menu.is-open').not($menu)
                    .removeClass('is-open')
                    .attr('aria-hidden', 'true');
                $('.card-save.is-open').not($trigger)
                    .removeClass('is-open')
                    .attr('aria-expanded', 'false');

                $activeTrigger = $trigger;
                $body.addClass('card-wishlist-sheet-open');
                $menu.find('[data-wishlist-mobile-close]').trigger('focus');
            }, 0);
        });

    $document
        .off('click.cardWishlistMobileClose')
        .on('click.cardWishlistMobileClose', '[data-wishlist-mobile-close]', (event) => {
            if (!$body.hasClass('card-wishlist-sheet-open')) return;

            event.preventDefault();
            event.stopPropagation();
            closeSheet();
        });

    $document
        .off('keydown.cardWishlistMobile')
        .on('keydown.cardWishlistMobile', (event) => {
            if (event.key === 'Escape' && $body.hasClass('card-wishlist-sheet-open')) {
                closeSheet();
            }
        });

    $(window)
        .off('resize.cardWishlistMobile')
        .on('resize.cardWishlistMobile', () => {
            if (!mobileQuery.matches && $body.hasClass('card-wishlist-sheet-open')) {
                closeSheet(false);
            }
        });
}
