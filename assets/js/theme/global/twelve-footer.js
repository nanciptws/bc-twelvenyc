export default function twelveFooter() {
    $('[data-twelve-footer-toggle]').on('click', (event) => {
        const $button = $(event.currentTarget);
        const $column = $button.closest('.twelve-footer-column');
        const $content = $column.find('[data-twelve-footer-content]');
        const isOpen = $column.toggleClass('is-open').hasClass('is-open');
        $button.attr('aria-expanded', isOpen);
        $content.css('max-height', isOpen ? `${$content[0].scrollHeight}px` : '');
    });
}
