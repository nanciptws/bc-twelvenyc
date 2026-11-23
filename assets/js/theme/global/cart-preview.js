import utils from '@bigcommerce/stencil-utils';

export const CartPreviewEvents = {
    close: 'closed.fndtn.dropdown',
    open: 'opened.fndtn.dropdown',
};

export default function cartPreview(secureBaseUrl, cartId) {
    const $cart = $('[data-cart-preview]');
    const $drawer = $('#cart-preview-dropdown');
    const $scrim = $('[data-twelve-cart-scrim]');
    const $body = $('body');
    const templateOptions = { template: 'common/cart-preview', baseUrl: secureBaseUrl };

    const updateSamplingProgress = () => {
        const $preview = $drawer.find('[data-cart-subtotal]');
        const rawSubtotal = $preview.attr('data-cart-subtotal');
        const subtotalText = $drawer.find('.twelve-cart-foot > div strong').first().text();
        const subtotal = Number.parseFloat(rawSubtotal) || Number.parseFloat(subtotalText.replace(/[^0-9.-]/g, '')) || 0;
        const target = 250;
        const remaining = Math.max(0, target - subtotal);
        const progress = Math.min(100, (subtotal / target) * 100);

        $drawer.find('[data-twelve-sampling-message]').text(
            remaining === 0
                ? 'Complimentary sampling unlocked'
                : `Add $${remaining.toFixed(2)} for complimentary sampling`,
        );
        $drawer.find('[data-twelve-sampling-bar]').css('width', `${progress}%`);
    };

    const closeDrawer = () => {
        if (!$drawer.hasClass('is-open')) return;
        $drawer.addClass('is-closing').attr('aria-hidden', 'true');
        $cart.attr('aria-expanded', 'false');
        $scrim.removeClass('is-open');
        window.setTimeout(() => {
            $drawer.removeClass('is-open is-closing');
            $body.removeClass('twelve-cart-open');
            $drawer.trigger(CartPreviewEvents.close);
        }, 450);
    };

    const loadDrawer = () => {
        $drawer.addClass('is-loading').html('<div class="loadingOverlay" style="display:block">&nbsp;</div>');
        utils.api.cart.getContent(templateOptions, (err, response) => {
            $drawer.removeClass('is-loading');
            if (!err) {
                $drawer.html(response);
                updateSamplingProgress();
            }
        });
    };

    const refreshDrawer = (currentCartId = cartId) => {
        if (!currentCartId) {
            loadDrawer();
            return;
        }

        utils.api.cart.getCartQuantity({ baseUrl: secureBaseUrl, cartId: currentCartId }, (err, quantity) => {
            if (!err) $body.trigger('cart-quantity-update', quantity);
            loadDrawer();
        });
    };

    const openDrawer = (refresh = false, currentCartId = cartId) => {
        $drawer.removeClass('is-closing').addClass('is-open').attr('aria-hidden', 'false');
        $cart.attr('aria-expanded', 'true');
        $body.addClass('twelve-cart-open');
        $scrim.addClass('is-open');
        if (refresh) refreshDrawer(currentCartId); else loadDrawer();
        $drawer.trigger(CartPreviewEvents.open);
    };

    $cart.on('click', (event) => {
        event.preventDefault();
        if ($drawer.hasClass('is-open')) closeDrawer(); else openDrawer();
    });

    $body.on('twelve-cart-preview-open', (event, currentCartId) => openDrawer(true, currentCartId));

    $body.off('click.twelveQuickAdd').on('click.twelveQuickAdd', '[data-button-type="add-cart"]', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const $button = $(event.currentTarget);
        const productId = $button.closest('[data-entity-id]').attr('data-entity-id') || $button.data('product-id');

        if (!productId || $button.hasClass('is-loading')) return;

        const originalText = $button.text();
        const formData = new FormData();
        formData.append('action', 'add');
        formData.append('product_id', productId);

        $button
            .addClass('is-loading')
            .attr({ 'aria-busy': 'true', 'aria-disabled': 'true' })
            .text('Adding…');

        utils.api.cart.itemAdd(formData, (err, response) => {
            const errorMessage = err || response?.data?.error;

            $button
                .removeClass('is-loading')
                .removeAttr('aria-busy aria-disabled')
                .text(originalText);

            if (errorMessage) {
                $button.next('.product-status-message').text(errorMessage);
                return;
            }

            openDrawer(true, response.data.cart_id);
        });
    });

    $drawer.on('click', '[data-twelve-cart-close]', closeDrawer);
    $scrim.on('click', closeDrawer);

    $drawer.on('click', '[data-twelve-cart-update]', (event) => {
        const $button = $(event.currentTarget);
        const itemId = $button.data('cartItemid');
        const quantity = Number($button.data('quantity'));
        const newQuantity = Math.max(0, quantity + ($button.data('action') === 'inc' ? 1 : -1));
        $drawer.addClass('is-loading').append('<div class="loadingOverlay" style="display:block">&nbsp;</div>');
        utils.api.cart.itemUpdate(itemId, newQuantity, (err, response) => {
            if (!err && response && response.data && response.data.status === 'succeed') {
                refreshDrawer();
            } else {
                $drawer.removeClass('is-loading').find('.loadingOverlay').remove();
            }
        });
    });

    $drawer.on('click', '[data-twelve-cart-remove]', (event) => {
        const itemId = $(event.currentTarget).data('cartItemid');
        $drawer.addClass('is-loading').append('<div class="loadingOverlay" style="display:block">&nbsp;</div>');
        utils.api.cart.itemRemove(itemId, (err, response) => {
            if (!err && response && response.data && response.data.status === 'succeed') {
                refreshDrawer();
            } else {
                $drawer.removeClass('is-loading').find('.loadingOverlay').remove();
            }
        });
    });

    $(document).on('keyup', (event) => { if (event.key === 'Escape') closeDrawer(); });

    $body.on('cart-quantity-update', (event, quantity) => {
        $cart.attr('aria-label', `Cart with ${quantity} items`);
        $('.cart-quantity').text(quantity).toggleClass('countPill--positive', quantity > 0);
        if (utils.tools.storage.localStorageAvailable()) localStorage.setItem('cart-quantity', quantity);
    });

    let quantity = 0;
    if (cartId) {
        utils.api.cart.getCartQuantity({ baseUrl: secureBaseUrl, cartId }, (err, qty) => {
            if (!err) quantity = qty;
            $body.trigger('cart-quantity-update', quantity);
        });
    } else {
        $body.trigger('cart-quantity-update', quantity);
    }
}
