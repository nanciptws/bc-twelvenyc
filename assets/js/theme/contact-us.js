import PageManager from './page-manager';
import nod from './common/nod';
import forms from './common/models/forms';
import { announceInputErrorMessage } from './common/utils/form-utils';

export default class ContactUs extends PageManager {
    onReady() {
        this.registerContactFormValidation();
        this.registerDocumentUpload();
    }

    registerDocumentUpload() {
        const form = document.querySelector('form[data-contact-form]');

        if (!form) return;

        const fileInput = form.querySelector('[data-contact-document]');
        const documentValue = form.querySelector('[data-contact-document-value]');
        const uploadTokenInput = form.querySelector('[data-contact-upload-token]');
        const uploadStatus = form.querySelector('[data-contact-upload-status]');
        const uploadUrl = form.dataset.documentUploadUrl;
        const maxFileSize = 10 * 1024 * 1024;

        if (!fileInput || !documentValue || !uploadTokenInput || !uploadStatus || !uploadUrl) return;

        const createUploadToken = () => {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }

            return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        };

        uploadTokenInput.value = createUploadToken();

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];

            if (!file) return;

            if (fileInput.files.length > 1) {
                window.alert('Only one file can be uploaded.');
                fileInput.value = '';
                return;
            }

            if (file.size > maxFileSize) {
                window.alert('The selected file exceeds the 10 MB upload limit.');
                fileInput.value = '';
                return;
            }

            const uploadData = new FormData();
            uploadData.append('document', file);
            uploadData.append('upload_token', uploadTokenInput.value);

            fileInput.disabled = true;
            uploadStatus.hidden = false;
            uploadStatus.classList.remove('is-error', 'is-success');
            uploadStatus.textContent = 'Uploading file…';

            try {
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: uploadData,
                    credentials: 'include',
                    headers: { Accept: 'application/json' },
                });
                const result = await response.json();

                if (!response.ok || !result.success || !result.file) {
                    throw new Error(result.message || 'The file could not be uploaded.');
                }

                documentValue.value = result.file;
                uploadStatus.classList.add('is-success');
                uploadStatus.textContent = '';

                const documentLink = document.createElement('a');
                documentLink.href = result.file;
                documentLink.target = '_blank';
                documentLink.rel = 'noopener noreferrer';
                documentLink.textContent = result.name;

                uploadStatus.appendChild(documentLink);
                uploadStatus.appendChild(document.createTextNode(' uploaded successfully.'));
            } catch (error) {
                window.alert(error.message || 'The file could not be uploaded. Please try again.');
                fileInput.value = '';
                uploadStatus.classList.add('is-error');
                uploadStatus.textContent = error.message || 'Upload failed. Please try again.';
            } finally {
                fileInput.disabled = false;
            }
        });
    }

    registerContactFormValidation() {
        const formSelector = 'form[data-contact-form]';
        const contactUsValidator = nod({
            submit: `${formSelector} button[type="submit"]`,
            tap: announceInputErrorMessage,
        });
        const $contactForm = $(formSelector);
        const $loadingOverlay = $('.contact-loadingOverlay');

        const composeContactQuestion = form => {
            const question = form.querySelector('#contact_question');

            if (!question) return;

            if (!Object.prototype.hasOwnProperty.call(question.dataset, 'originalQuestion')) {
                question.dataset.originalQuestion = question.value.trim();
            }

            const fieldValue = selector => {
                const field = form.querySelector(selector);
                return field && field.value.trim() ? field.value.trim() : 'Not provided';
            };
            const originalQuestion = question.dataset.originalQuestion;
            const contactDetails = [
                `Brand: ${fieldValue('#contact_brand')}`,
                `Region: ${fieldValue('#contact_region')}`,
                `Reason For Contacting: ${fieldValue('#contact_reason')}`,
                `Market: ${fieldValue('#contact_market')}`,
                `Additional Info: ${fieldValue('#contact_additional_info')}`,
                `Attachment: ${fieldValue('[data-contact-document-value]')}`,
            ];

            if (originalQuestion) {
                contactDetails.push('', `Comments/Questions: ${originalQuestion}`);
            }

            question.value = contactDetails.join('\n\n');
        };

        contactUsValidator.add([
            {
                selector: `${formSelector} input[name="contact_email"]`,
                validate: (cb, val) => {
                    const result = forms.email(val);

                    cb(result);
                },
                errorMessage: this.context.contactEmail,
            },
            {
                selector: `${formSelector} textarea[name="contact_question"]`,
                validate: (cb, val) => {
                    const result = forms.notEmpty(val);

                    cb(result);
                },
                errorMessage: this.context.contactQuestion,
            },
        ]);

        $contactForm.on('submit', event => {
            const form = event.currentTarget;
            const documentInput = form.querySelector('[data-contact-document]');

            if (documentInput && documentInput.disabled) {
                event.preventDefault();
                window.alert('Please wait for the document upload to finish before submitting.');
                return;
            }

            composeContactQuestion(form);
            contactUsValidator.performCheck();

            if (contactUsValidator.areAll('valid')) {
                $loadingOverlay.show();
                return;
            }

            event.preventDefault();
        });
    }
}
