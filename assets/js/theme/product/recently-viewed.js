const STORAGE_KEY = 'twelve-recent-product-ids';
const LIMIT = 4;
const STORAGE_LIMIT = LIMIT + 1;
const NO_IMAGE_URL = 'https://cdn11.bigcommerce.com/s-ga7j4wazzm/images/stencil/original/image-manager/no-image.jpg';

// Persist identifiers only. Prices, names and availability always come from the API.
export function rememberProduct(storage, productId) {
    const currentId = Number(productId);
    if (!Number.isSafeInteger(currentId) || currentId < 1) return [];
    let previous = [];
    try {
        const stored = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
        if (Array.isArray(stored)) previous = stored;
    } catch (error) {
        // Corrupt or unavailable storage must not prevent the current card rendering.
    }
    const ids = [currentId].concat(previous)
        .filter((id, index, all) => Number.isSafeInteger(id) && id > 0 && all.indexOf(id) === index)
        .slice(0, STORAGE_LIMIT);
    try { storage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch (error) { /* Storage can be disabled. */ }
    return ids;
}

function productCard(product) {
    if (!product.path?.startsWith('/') || product.path.startsWith('//')) return null;
    const item = document.createElement('li');
    item.className = 'product';
    item.dataset.productId = product.entityId;
    if (document.documentElement.classList.contains('account-policy-product')
        || document.documentElement.classList.contains('account-policy-brand')) {
        item.classList.add('account-policy-pending');
    }
    const article = document.createElement('article');
    article.className = 'twelve-recent-card';

    const wishlist = document.createElement('a');
    wishlist.className = 'card-save action-b2b-wishlist';
    wishlist.href = '#';
    wishlist.hidden = true;
    wishlist.dataset.b2bProductId = String(product.entityId);
    wishlist.dataset.b2bProductSku = product.sku || '';
    wishlist.setAttribute('aria-label', `Add ${product.name} to shopping list`);
    wishlist.setAttribute('aria-disabled', 'true');
    wishlist.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';

    const b2bContext = document.createElement('div');
    b2bContext.className = 'b2b-card-product-context';
    b2bContext.hidden = true;
    b2bContext.setAttribute('aria-hidden', 'true');
    const b2bSku = document.createElement('span');
    b2bSku.dataset.productSku = '';
    b2bSku.textContent = product.sku || '';
    const b2bForm = document.createElement('form');
    b2bForm.dataset.cartItemAdd = '';
    const productInput = document.createElement('input');
    productInput.type = 'hidden';
    productInput.name = 'product_id';
    productInput.value = String(product.entityId);
    const quantityInput = document.createElement('input');
    quantityInput.type = 'hidden';
    quantityInput.name = 'qty[]';
    quantityInput.value = '1';
    const b2bHook = document.createElement('span');
    b2bHook.className = 'b2b-card-wishlist-hook';
    b2bForm.append(productInput, quantityInput);
    b2bContext.append(b2bSku, b2bForm, b2bHook);

    const imageLink = document.createElement('a');
    imageLink.href = product.path;
    imageLink.className = 'twelve-recent-image';
    imageLink.setAttribute('aria-label', product.name);
    const imageUrl = product.defaultImage?.url || NO_IMAGE_URL;
    if (imageUrl && /^(https?:\/\/|\/[^/])/.test(imageUrl)) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = product.defaultImage?.altText || product.name;
        img.loading = 'lazy';
        imageLink.append(img);
    }
    const fields = product.customFields?.edges.map(edge => edge.node) || [];
    const field = name => fields.find(entry => entry.name.toLowerCase() === name.toLowerCase())?.value;
    const brand = document.createElement('p');
    brand.className = 'twelve-recent-brand';
    brand.textContent = product.brand?.name || '';
    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.href = product.path;
    link.textContent = product.name;
    title.append(link);
    article.append(wishlist, b2bContext, imageLink);
    if (brand.textContent) article.append(brand);
    article.append(title);
    if (product.sku) {
        const sku = document.createElement('span');
        sku.className = 'card-price-note';
        sku.style.display = 'block';
        sku.style.marginTop = '5px';
        sku.textContent = `Product ID: ${product.sku}`;
        article.append(sku);
    }
    if (product.prices?.price) {
        const price = document.createElement('p');
        price.className = 'twelve-recent-price';
        const { value, currencyCode } = product.prices.price;
        price.textContent = new Intl.NumberFormat(document.documentElement.lang || 'en', { style: 'currency', currency: currencyCode }).format(value);
        article.append(price);
    }
    const dimensions = field('_specifications_DIMENSIONS') || field('_size_fit_DIMENSIONS');
    if (dimensions) {
        const text = document.createElement('p');
        text.className = 'twelve-recent-dimensions';
        text.textContent = dimensions;
        article.append(text);
    }
    item.append(article);
    return item;
}

export default async function recentlyViewed(context) {
    const section = document.querySelector('[data-pdp-recent]');
    if (!section) return;
    let storage;
    try { storage = window.localStorage; } catch (error) { storage = null; }
    const ids = rememberProduct(storage, context.productId);
    const currentId = Number(context.productId);
    const displayIds = ids.filter(id => id !== currentId).slice(0, LIMIT);
    if (!displayIds.length || !context.twelveStorefrontToken) {
        section.hidden = true;
        return;
    }
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${context.twelveStorefrontToken}` },
            body: JSON.stringify({
                query: `query RecentlyViewed($ids: [Int!], $currency: currencyCode!, $showPrices: Boolean!) {
                    site { products(entityIds: $ids, first: 4) { edges { node {
                        entityId name path sku
                        brand { name }
                        defaultImage { url(width: 640) altText }
                        prices(currencyCode: $currency) @include(if: $showPrices) { price { value currencyCode } }
                        customFields(first: 50) { edges { node { name value } } }
                    } } } }
                }`,
                variables: { ids: displayIds, currency: context.twelveCurrency || 'USD', showPrices: Boolean(context.twelvePrice) },
            }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (result.errors?.length) throw new Error(result.errors.map(error => error.message).join('; '));
        const products = result.data?.site?.products?.edges.map(edge => edge.node) || [];
        const grid = section.querySelector('[data-pdp-recent-grid]');
        grid.replaceChildren();
        displayIds.forEach(id => {
            const product = products.find(entry => entry.entityId === id);
            const card = product && productCard(product);
            if (card) grid.append(card);
        });
        section.hidden = !grid.children.length;
    } catch (error) {
        // Do not display stale cached prices or invent cards for unavailable products.
        section.hidden = true;
        console.warn('Recently viewed products could not be loaded:', error.message);
    }
}
