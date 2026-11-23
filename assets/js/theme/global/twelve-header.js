export default function twelveHeader() {
    const header = document.querySelector('.twelve-header');
    if (!header) return;

    // The mobile drawer stops click propagation, so handle signup during capture.
    header.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
        if (!target || !target.closest('.open-signup-popup')) return;

        event.preventDefault();
        document.body.classList.add('has-activeModal');

        const authenticationModel = document.querySelector('.bc-authentication-model');
        const firstSignupStep = document.querySelector('.company-create-b2b-step-0');
        if (authenticationModel) authenticationModel.style.display = 'flex';
        if (firstSignupStep) firstSignupStep.style.display = 'block';
    }, true);

    const menus = Array.from(header.querySelectorAll('.twelve-menu'));
    const mobileToggle = header.querySelector('[data-mobile-menu-toggle]');
    header.querySelector('[data-twelve-mobile-close]').addEventListener('click', () => mobileToggle.click());
    header.querySelectorAll('.twelve-category-group, .twelve-mobile-select').forEach(section => {
        const parentLink = section.querySelector(':scope > summary > a');
        if (parentLink) parentLink.addEventListener('click', event => {
            event.stopPropagation();
            if (window.matchMedia('(max-width: 991px)').matches) {
                event.preventDefault();
                section.open = !section.open;
            }
        });
        section.addEventListener('toggle', () => {
            if (!section.open || window.matchMedia('(min-width: 992px)').matches) return;
            const siblings = section.parentElement.querySelectorAll(':scope > details');
            siblings.forEach(sibling => {
                if (sibling !== section) sibling.open = false;
            });
        });
    });
    const desktop = window.matchMedia('(min-width: 992px) and (hover: hover)');
    const layout = window.matchMedia('(min-width: 992px)');
    const navigation = header.querySelector('.twelve-navigation');
    const desktopSlot = header.querySelector('[data-twelve-desktop-menu-slot]');
    const mobileSlot = header.querySelector('[data-twelve-mobile-menu-slot]');
    const placeNavigation = () => {
        (layout.matches ? desktopSlot : mobileSlot).appendChild(navigation);
        menus.forEach(menu => { menu.open = false; });
        header.querySelectorAll('.twelve-category-group').forEach(group => {
            group.open = layout.matches;
        });
    };
    placeNavigation();
    layout.addEventListener('change', placeNavigation);
    const closeMenus = (except) => menus.forEach(menu => {
        if (menu !== except) menu.open = false;
    });

    menus.forEach(menu => {
        menu.addEventListener('toggle', () => {
            if (menu.open) closeMenus(menu);
        });
        menu.closest('.twelve-nav-item').addEventListener('mouseenter', () => {
            if (desktop.matches) {
                closeMenus(menu);
                menu.open = true;
            }
        });
    });

    header.addEventListener('mouseleave', () => {
        if (desktop.matches && !menus.some(menu => menu.contains(document.activeElement))) closeMenus();
    });
    header.addEventListener('focusout', event => {
        if (!header.contains(event.relatedTarget)) closeMenus();
    });
    document.addEventListener('click', event => {
        const target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
        if (!target || !target.closest('.twelve-menu')) closeMenus();
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const openMenu = menus.find(menu => menu.open);
        if (openMenu) {
            openMenu.querySelector('summary').focus();
            closeMenus();
        }
        const mobileToggle = header.querySelector('[data-mobile-menu-toggle]');
        if (mobileToggle && mobileToggle.getAttribute('aria-expanded') === 'true') mobileToggle.click();
    });
    layout.addEventListener('change', () => closeMenus());
}
