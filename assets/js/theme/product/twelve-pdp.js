import $ from 'jquery';
import recentlyViewed from './recently-viewed';

export default function twelvePdp(context) {
    const root = document.querySelector('.twelve-pdp');
    if (!root) return;
    const source = root.querySelector('[data-pdp-source]');
    const hiddenFieldsConfig = document.querySelector('[data-pdp-hidden-fields]');
    const customerUserType = hiddenFieldsConfig?.dataset.customerUserType?.trim().toLowerCase();
    
    let hiddenFieldsByUserType = {};
    try {
        hiddenFieldsByUserType = JSON.parse(hiddenFieldsConfig?.textContent || '{}');
    } catch (error) {
        console.error('Unable to parse PDP hidden-fields configuration.', error);
    }
    const hiddenFields = new Set(
        (Object.entries(hiddenFieldsByUserType).find(([userType]) => userType.toLowerCase() === customerUserType)?.[1] || [])
            .map(name => name.trim().toLowerCase()),
    );
    const specificationInternalFields = new Set(['_int_bid region', '_int_rfp product id']);
    const groups = [
        [['_spec_', '_int_'], 'Specifications'],
        [['_deco_'], 'Decoration'],
        [['_sizefit_'], 'Size & fit'],
    ];
    const fields = Array.from(source.querySelectorAll('dt')).map(dt => ({ name: dt.textContent.trim(), value: dt.nextElementSibling.textContent.trim(), dt, dd: dt.nextElementSibling }));
    const field = name => fields.find(item => item.name.toLowerCase() === name.toLowerCase())?.value;
    const set = (selector, value) => {
        const target = root.querySelector(selector);
        if (target && value) { target.textContent = value; target.hidden = false; }
    };
    const normalizeLabel = value => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const productTitle = root.querySelector('.productView-title')?.textContent.trim();
    const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumbs .breadcrumb'));
    const category = breadcrumbs.slice(0, -1).reverse().find(item => (
        normalizeLabel(item.textContent) !== normalizeLabel(productTitle)
        && normalizeLabel(item.textContent) !== 'home'
        && normalizeLabel(item.textContent) !== 'shop'
    ));
    const firstField = (...names) => names.map(name => field(name)).find(Boolean);
    const categoryLabel = category?.textContent.trim() || firstField('_spec_CATEGORY');
    let lastTierLimitsByCategory = context.lastTierLimitsByCategory || {};
    if (typeof lastTierLimitsByCategory === 'string') {
        try {
            lastTierLimitsByCategory = JSON.parse(lastTierLimitsByCategory);
        } catch (error) {
            console.error('Unable to parse PDP category tier limits.', error);
            lastTierLimitsByCategory = {};
        }
    }
    const categoryTierLimit = Object.entries(lastTierLimitsByCategory).find(([categoryName]) => (
        normalizeLabel(categoryName) === normalizeLabel(categoryLabel)
    ))?.[1];
    const configuredLastTierLimit = Number(categoryTierLimit ?? context.lastTierLimit);
    const lastTierLimit = Number.isFinite(configuredLastTierLimit) && configuredLastTierLimit > 0
        ? configuredLastTierLimit
        : 100000;
    if (normalizeLabel(categoryLabel) !== normalizeLabel(productTitle)) {
        set('[data-pdp-category]', categoryLabel);
    }
    set('[data-pdp-id]', firstField('_int_RFP Product ID'));
    const originCountry = firstField('_spec_Origin Country');
    if (originCountry) {
        set('[data-pdp-origin]', originCountry);
        root.querySelector('.twelve-pdp-exw')?.removeAttribute('hidden');
    }
    set('[data-pdp-unit]', field('_unit_of_measurement'));
    groups.forEach(([prefixes, title], index) => {
        const matches = fields.map(item => ({
            ...item,
            prefix: prefixes.find(prefix => item.name.toLowerCase().startsWith(prefix)),
        })).filter(item => (
            item.prefix
            && item.value
            && !hiddenFields.has(item.name.toLowerCase())
            && (item.prefix !== '_int_' || specificationInternalFields.has(item.name.toLowerCase()))
        ));
        if (!matches.length) return;
        const accordion = document.createElement('div');
        accordion.className = `twelve-pdp-accordion${index === 0 ? ' is-open' : ''}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
        const label = document.createElement('span');
        label.className = 'twelve-pdp-accordion-label';
        label.textContent = title;
        const icon = document.createElement('span');
        icon.className = 'twelve-pdp-accordion-icon';
        icon.setAttribute('aria-hidden', 'true');
        button.append(label, icon);
        const panel = document.createElement('div');
        panel.className = 'twelve-pdp-accordion-panel';
        const inner = document.createElement('div');
        inner.className = 'twelve-pdp-accordion-inner';
        const list = document.createElement('dl');
        const grouped = new Map();
        matches.forEach(({ name, prefix, dt, dd }) => {
            const key = name.toLowerCase();
            if (grouped.has(key)) {
                const existing = grouped.get(key);
                const value = document.createElement('span');
                value.textContent = dd.textContent;
                existing.append(value);
                dt.remove();
                dd.remove();
                return;
            }
            dt.textContent = name.slice(prefix.length);
            const value = document.createElement('span');
            value.textContent = dd.textContent;
            dd.replaceChildren(value);
            grouped.set(key, dd);
            list.append(dt, dd);
        });
        inner.append(list);
        panel.append(inner);
        accordion.append(button, panel);
        source.before(accordion);
        if (index === 0) panel.style.maxHeight = `${panel.scrollHeight}px`;
        button.addEventListener('click', () => {
            const open = !accordion.classList.contains('is-open');
            accordion.classList.toggle('is-open', open);
            button.setAttribute('aria-expanded', String(open));
            panel.style.maxHeight = open ? `${panel.scrollHeight}px` : '0px';
        });
    });
    fields.filter(item => item.name.startsWith('_') && item.dt.parentElement === source).forEach(({ dt, dd }) => { dt.remove(); dd.remove(); });
    if (!source.children.length) source.remove();

    const qty = root.querySelector('[name="qty[]"]');
    const body = root.querySelector('[data-pdp-tiers]');
    let price = context.twelvePrice;
    let rates = context.twelveBulkRates || [];
    const currency = context.twelveCurrency || 'USD';
    const money = value => new Intl.NumberFormat(document.documentElement.lang || 'en', { style: 'currency', currency }).format(value);
    const add = root.querySelector('#form-action-addToCart');
    const originalLabel = add?.value;
    const bcMinimumQuantity = Math.max(1, Number(qty?.dataset.quantityMin) || 1);
    const minimumQuantity = () => {
        const firstBulkMinimum = Number(rates[0]?.min);
        return Number.isFinite(firstBulkMinimum) && firstBulkMinimum > 0
            ? firstBulkMinimum
            : bcMinimumQuantity;
    };
    const clampQuantity = () => {
        if (!qty) return;
        const min = minimumQuantity();
        const max = Number(qty.dataset.quantityMax) || Infinity;
        qty.dataset.quantityMin = String(min);
        qty.min = String(min);
        $(qty).data('quantityMin', min);
        qty.value = Math.min(max, Math.max(min, parseInt(qty.value, 10) || min));
    };
    const render = () => {
        clampQuantity();
        const base = price?.with_tax || price?.without_tax;
        if (body) body.replaceChildren();
        let unitPrice = Number(base?.value);
        const selectedRate = rates.find(rate => Number(qty?.value || 1) >= rate.min && (!rate.max || Number(qty?.value || 1) <= rate.max));
        if (selectedRate && base) {
            const discount = price.with_tax && selectedRate.discount_inc_tax ? selectedRate.discount_inc_tax : selectedRate.discount;
            const amount = Number(discount?.value ?? discount);
            unitPrice = selectedRate.type === 'price' || selectedRate.type === 'fixed' ? amount : base.value * (1 - amount / 100);
        }
        if (add && !add.disabled && Number.isFinite(unitPrice)) add.value = originalLabel.toLowerCase().includes('pre') ? originalLabel : `Add to order · ${money(Math.max(0, unitPrice) * Number(qty?.value || 1))}`;
        const displayedPrice = root.querySelector(price?.with_tax ? '[data-product-price-with-tax]' : '[data-product-price-without-tax]');
        if (displayedPrice && Number.isFinite(unitPrice)) displayedPrice.textContent = money(Math.max(0, unitPrice));
        if (!body) return;
        body.closest('.twelve-pdp-volume').hidden = !base || !rates.length;
        if (!base || !rates.length) return;
        const quantity = Number(qty?.value || 1);
        rates.forEach((rate, index) => {
            const discount = price.with_tax && rate.discount_inc_tax ? rate.discount_inc_tax : rate.discount;
            const amount = Number(discount?.value ?? discount);
            const unit = rate.type === 'price' || rate.type === 'fixed' ? amount : base.value * (1 - amount / 100);
            if (!Number.isFinite(unit)) return;
            const row = document.createElement('tr');
            const quantityCell = document.createElement('td');
            const button = document.createElement('button');
            button.type = 'button';
            const isLastTier = index === rates.length - 1;
            const displayedMaximum = isLastTier ? lastTierLimit : Number(rate.max);
            button.textContent = `${Number(rate.min).toLocaleString()}${displayedMaximum ? ` – ${displayedMaximum.toLocaleString()}` : ' +'}`;
            button.setAttribute('aria-label', `Set quantity to ${rate.min}`);
            button.addEventListener('click', () => {
                if (!qty) return;
                const min = minimumQuantity();
                const max = Number(qty.dataset.quantityMax) || Infinity;
                qty.value = Math.min(max, Math.max(min, Number(rate.min)));
                $(qty).trigger('change');
                render();
            });
            button.disabled = !qty || (Number(qty.dataset.quantityMax) > 0 && Number(rate.min) > Number(qty.dataset.quantityMax));
            row.addEventListener('click', event => { if (!event.target.closest('button')) button.click(); });
            quantityCell.append(button);
            const valueCell = document.createElement('td');
            valueCell.textContent = money(Math.max(0, unit));
            row.classList.toggle('is-active', quantity >= rate.min && (!rate.max || quantity <= rate.max));
            row.append(quantityCell, valueCell);
            body.append(row);
        });
    };
    if (qty) qty.addEventListener('change', () => {
        clampQuantity();
    }, true);
    if (qty) qty.addEventListener('blur', render);
    $(root).on('change', '[name="qty[]"]', render);
    $(root).on('click', '[data-quantity-change] button', render);
    $(root).on('twelve-price-update', (event, data) => {
        price = data.price;
        if (data.bulk_discount_rates !== undefined) rates = data.bulk_discount_rates || [];
        render();
    });
    render();

    const dialog = document.querySelector('[data-pdp-lightbox]');
    const fullImage = dialog.querySelector('img');
    const galleryLinks = Array.from(root.querySelectorAll('[data-image-gallery-item]'));
    const stage = root.querySelector('[data-image-gallery-main]');
    const hasZoomableImage = () => stage && !stage.matches('.no-image') && !stage.querySelector('.no-image');
    const zoomer = document.createElement('div');
    zoomer.className = 'twelve-pdp-zoomer';
    zoomer.setAttribute('aria-hidden', 'true');
    if (stage) stage.append(zoomer);
    let slide = 0;
    const showSlide = index => {
        slide = galleryLinks.length ? (index + galleryLinks.length) % galleryLinks.length : 0;
        fullImage.src = galleryLinks[slide]?.href || root.querySelector('[data-image-gallery-main] a')?.href || root.querySelector('[data-main-image]')?.src;
    };
    root.querySelector('[data-pdp-zoom]').addEventListener('click', () => {
        if (!hasZoomableImage()) return;
        const current = root.querySelector('[data-image-gallery-main] a');
        slide = Math.max(0, galleryLinks.findIndex(link => link.href === current?.href));
        showSlide(slide);
        dialog.showModal();
    });
    if (stage) {
        const resetZoom = () => {
            stage.classList.remove('is-zooming');
            zoomer.style.backgroundPosition = '50% 50%';
        };
        stage.addEventListener('mousemove', event => {
            if (!hasZoomableImage() || window.matchMedia('(max-width: 760px)').matches) return;
            const bounds = stage.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
            const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
            zoomer.style.backgroundPosition = `${x}% ${y}%`;
        });
        stage.addEventListener('mouseenter', () => {
            if (!hasZoomableImage() || window.matchMedia('(max-width: 760px)').matches) {
                resetZoom();
                return;
            }
            const zoomUrl = stage.dataset.zoomImage || stage.querySelector('a')?.href || stage.querySelector('[data-main-image]')?.currentSrc;
            if (!zoomUrl) return;
            zoomer.style.backgroundImage = `url(${JSON.stringify(zoomUrl)})`;
            stage.classList.add('is-zooming');
        });
        stage.addEventListener('mouseleave', resetZoom);
        stage.addEventListener('pointercancel', resetZoom);
        window.addEventListener('blur', resetZoom);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) resetZoom();
        });
    }
    dialog.querySelector('[data-pdp-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-pdp-prev]').addEventListener('click', () => showSlide(slide - 1));
    dialog.querySelector('[data-pdp-next]').addEventListener('click', () => showSlide(slide + 1));
    dialog.querySelector('[data-pdp-prev]').hidden = galleryLinks.length < 2;
    dialog.querySelector('[data-pdp-next]').hidden = galleryLinks.length < 2;
    dialog.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') showSlide(slide - 1);
        if (event.key === 'ArrowRight') showSlide(slide + 1);
    });
    const sticky = document.querySelector('[data-pdp-sticky]');
    const syncSticky = () => {
        sticky.querySelector('[data-pdp-sticky-price]').textContent = root.querySelector('.productView-price')?.textContent.trim() || '';
        sticky.querySelector('button').disabled = !add || add.disabled;
    };
    if (add) {
        const observer = new IntersectionObserver(entries => {
            sticky.hidden = entries[0].isIntersecting || entries[0].boundingClientRect.top > 0 || !add.offsetParent;
            syncSticky();
        });
        observer.observe(add);
        new MutationObserver(syncSticky).observe(root.querySelector('.productView-price'), { childList: true, subtree: true, characterData: true });
        sticky.querySelector('button').addEventListener('click', () => add.click());
    }

    recentlyViewed(context);
}
