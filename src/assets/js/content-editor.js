const contentEditors = new WeakMap();


function documentForm() {
    return {
        get formElement() { return this.$refs?.editorForm || this.$el; },
        id: null, signedIn: false, step: 1, isAdmin: false, editorUnavailable: false,
        editorPages: [
            {number: 1, label: 'Metadata', icon: 'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5'},
            {number: 2, label: 'Content', icon: 'm4 16-1 5 5-1L21 7l-4-4L4 16Zm10-10 4 4'},
            {number: 3, label: 'Images', icon: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M8 7h.01'},
        ],
        loading: true, busy: false, savedSnapshot: '', beforeUnload: null,
        personal: window.location.pathname.startsWith('/my/'),
        get returnUrl() { return this.personal ? '/my/content/' : '/admin/content/'; },
        get canEdit() {
            const auth = Alpine.store('auth');
            return !this.doc.status || ['draft', 'changes_requested'].includes(this.doc.status)
                || auth.hasRole('admin') || auth.hasRole('reviewer');
        },
        get dirty() { return !!this.savedSnapshot && JSON.stringify(this.doc) !== this.savedSnapshot; },
        destroy() {
            if (this.beforeUnload) window.removeEventListener('beforeunload', this.beforeUnload);
            const state = contentEditors.get(this.formElement);
            state?.observer.disconnect(); state?.editor.destroy();
            contentEditors.delete(this.formElement);
        },
        async goToStep(step) {
            this.step = step;
            await this.$nextTick();
            if (step === 2) this.mountEditor();
        },
        mountEditor() {
            if (!this.schema.has_markdown || !this.canEdit || contentEditors.has(this.formElement)) return;
            if (!window.toastui?.Editor) { this.editorUnavailable = true; return; }
            const element = this.$refs.visualEditor.firstElementChild;
            const isDark = () => document.documentElement.classList.contains('dark')
                || document.documentElement.dataset.theme === 'dark';
            try {
            const editor = new window.toastui.Editor({
                el: element, height: '480px', initialEditType: 'wysiwyg',
                initialValue: this.doc.body_md || '', previewStyle: 'tab',
                usageStatistics: false, autofocus: false, theme: isDark() ? 'dark' : 'light',
                toolbarItems: [['heading', 'bold', 'italic', 'strike'], ['hr', 'quote'],
                    ['ul', 'ol', 'task'], ['table', 'image', 'link'], ['code', 'codeblock']],
                hooks: {addImageBlobHook: (blob, callback) => {
                    this.uploadInlineImage(blob, callback);
                    return false;
                }},
                events: {change: () => { this.doc.body_md = editor.getMarkdown(); }},
            });
            const observer = new MutationObserver(() => element.classList.toggle('toastui-editor-dark', isDark()));
            observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'data-theme']});
            contentEditors.set(this.formElement, {editor, observer});
            this.editorUnavailable = false;
            } catch (error) {
                element.replaceChildren();
                this.editorUnavailable = true;
            }
        },
        async uploadInlineImage(blob, callback) {
            if (this.uploadingImages || !this.canEdit) return;
            this.uploadingImages = true; this.error = null;
            try {
                const form = new FormData(); form.append('image', blob);
                const image = await Alpine.store('api').call('upload', {}, form);
                if (!image.url) throw new Error('The upload did not return an image URL.');
                const field = this.schema.fields.find(f => f.type === 'images');
                if (field) {
                    this.doc[field.key] ||= [];
                    this.doc[field.key].push({url: image.url, name: blob.name || 'Image', alt: ''});
                }
                callback(image.url, blob.name || 'Image');
            } catch (error) { this.error = error.message || 'Image upload failed'; }
            finally { this.uploadingImages = false; }
        },
        async validateRequiredFields() {
            for (const field of this.schema.fields.filter(f => f.required)) {
                const value = this.doc[field.key];
                if (value == null || value === '' || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length)) {
                    await this.goToStep(field.key === 'body_md' ? 2 : field.type === 'images' ? 3 : 1);
                    this.error = `${field.label || field.key} is required before submitting.`;
                    document.getElementById('content-' + field.key)?.focus();
                    return false;
                }
            }
            const invalid = this.formElement.querySelector?.(':invalid');
            if (invalid) {
                const key = invalid.id.replace('content-', '');
                const field = this.schema.fields.find(f => f.key === key);
                await this.goToStep(field?.type === 'images' ? 3 : 1);
                invalid.reportValidity(); return false;
            }
            return true;
        },
        doc_type: null,
        schema: { label: '', fields: [] },
        doc: { dietary: [] },
        error: null,
        ui_message: '',
        prevValues: {}, // stores previous values for auto fields
        uploadingImages: false,
        isDraggingFiles: false,
        draggedImage: null,

        async init() {
            try {
                if (!await requireContentLogin()) return;
                this.signedIn = true;
                const params = new URLSearchParams(window.location.search);
                this.id = params.get('id');
                this.doc_type = params.get('doc_type');
                if (!this.doc_type && this.id) {
                    const draft = await Alpine.store('api').call('content_get', {id: this.id});
                    this.doc_type = draft.doc_type;
                }
                if (!this.doc_type) throw new Error('Choose a content type from My Content first.');
                await this.loadSchema();
                await this.loadDraft();
                const profile = await Alpine.store('api').call('profile_json');
                this.isAdmin = (profile.roles || []).includes('admin');
                if (!this.id || (!this.doc.author && this.doc.submitted_by === profile.user?.id)) this.doc.author = profile.user?.display_name || '';
                this.normalizeImageFields();
                this.setupFieldActions();
                this.savedSnapshot = JSON.stringify(this.doc);
                this.beforeUnload = event => {
                    if (this.dirty || this.busy || this.uploadingImages) { event.preventDefault(); event.returnValue = ''; }
                };
                window.addEventListener('beforeunload', this.beforeUnload);
            } catch (error) { this.error = error.message; }
            finally { this.loading = false; }
        },

        async loadSchema() {
            const schemas = await Alpine.store("api").call("content_schema", {}, {});
            this.schema = schemas.types[this.doc_type];

            if (!this.schema) {
                throw new Error(`Unknown document type: ${this.doc_type}`);
            }

            // Initialize fields in doc
            this.schema.fields.forEach(f => {
                if (['checkbox', 'multiselect', 'images'].includes(f.type) && !Array.isArray(this.doc[f.key])) {
                    this.doc[f.key] = [];
                } else if (!(f.key in this.doc)) {
                    this.doc[f.key] = '';
                }
                if (f.readonly) this.doc[f.key] = this.doc[f.key] || '';
            });
        },

        async loadDraft() {
            const getNested = (obj, path, key) => {
                if (!path) return obj[key];
                const parts = path.split('.');
                let current = obj;
                for (const part of parts) {
                    if (!current || typeof current !== 'object' || !(part in current)) return undefined;
                    current = current[part];
                }
                return current[key];
            };

            if (!this.id) {
                this.doc.doc_type = this.doc_type;
                this.doc.body_md ||= '';
                this.doc.title ||= '';
                return;
            }

            const data = await Alpine.store("api").call("content_get", { id: this.id }, {});

            this.doc = { ...data, ...(data.meta || { dietary: [] }) };
            this.schema.fields.forEach(f => {
                if (f.storage === 'meta') {
                    this.doc[f.key] = getNested(data.meta, f.path, f.key);
                } else {
                    this.doc[f.key] = data[f.key];
                }
                if (this.doc[f.key] === undefined || this.doc[f.key] === null) {
                    this.doc[f.key] = ['checkbox', 'multiselect', 'images'].includes(f.type) ? [] : '';
                }
            });
        },

            async copyMarkdownImage(image) {
                if (!image?.url) {
                    this.error = 'This image needs a URL before its Markdown can be copied.';
                    return;
                }

                const markdown = `![${image.alt || image.name || 'Image'}](${image.url})`;

                try {
                    await navigator.clipboard.writeText(markdown);
                    this.ui_message = 'Image Markdown copied';
                } catch (error) {
                    this.error = 'Unable to copy Markdown. Please copy the URL manually.';
                }
            },
        handleCheckboxChange(key, value, checked) {
            if (!Array.isArray(this.doc[key])) this.doc[key] = [];
            if (checked && !this.doc[key].includes(value)) {
                this.doc[key].push(value);
            } else if (!checked) {
                this.doc[key] = this.doc[key].filter(v => v !== value);
            }
        },
            normalizeImageFields() {
                this.schema.fields
                    .filter(field => field.type === 'images')
                    .forEach(field => {
                        const images = Array.isArray(this.doc[field.key]) ? this.doc[field.key] : [];
                        this.doc[field.key] = images
                            .filter(image => image)
                            .map(image => typeof image === 'string'
                                ? { name: this.imageNameFromUrl(image), alt: '', url: image }
                                : {
                                    name: image.name || this.imageNameFromUrl(image.url),
                                    alt: image.alt || '',
                                    url: image.url || ''
                                });
                    });
            },

            imageNameFromUrl(url) {
                return decodeURIComponent((url || '').split('/').pop().split('?')[0]) || 'Image';
            },

            async uploadImages(files, fieldKey) {
                const imageFiles = Array.from(files || []).filter(file => file.type.startsWith('image/'));
                this.isDraggingFiles = false;

                if (!imageFiles.length) {
                    this.error = 'Please choose image files.';
                    return;
                }

                this.error = null;
                this.uploadingImages = true;
                this.doc[fieldKey] = Array.isArray(this.doc[fieldKey]) ? this.doc[fieldKey] : [];

                try {
                    for (const file of imageFiles) {
                        const formData = new FormData();
                        formData.append('image', file);

                        const data = await Alpine.store('api').call('upload', {}, formData);
                        if (!data.url) throw new Error(`Upload did not return a URL for ${file.name}`);

                        this.doc[fieldKey].push({ name: file.name, alt: '', url: data.url });
                    }
                } catch (error) {
                    this.error = error.message || 'Image upload failed';
                } finally {
                    this.uploadingImages = false;
                }
            },

            startImageDrag(index, fieldKey) {
                console.log(`Dragging image at index ${index} from field ${fieldKey}`);
                this.draggedImage = { index, fieldKey };
            },

            async handleMarkdownDrop(event) {
                console.log("Handling markdown drop");
                if (this.draggedImage) {
                    const image = this.doc[this.draggedImage.fieldKey][this.draggedImage.index];
                    this.insertMarkdownImage(image);
                    this.draggedImage = null;
                    return;
                }

                const imageField = this.schema.fields.find(field => field.type === 'images');
                const files = Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
                if (!imageField || !files.length) return;

                const firstNewImageIndex = (this.doc[imageField.key] || []).length;
                await this.uploadImages(files, imageField.key);
                (this.doc[imageField.key] || []).slice(firstNewImageIndex).forEach(image => this.insertMarkdownImage(image));
            },

            async insertMarkdownImage(image) {
                if (!image?.url || !this.canEdit) return;
                await this.goToStep(2);
                const editor = contentEditors.get(this.formElement)?.editor;
                if (editor) {
                    editor.exec('addImage', {imageUrl: image.url, altText: image.alt || image.name || 'Image'});
                    this.doc.body_md = editor.getMarkdown();
                    editor.focus();
                } else {
                    const alt = (image.alt || image.name || 'Image').replace(/[\[\]\\]/g, '\\$&');
                    this.doc.body_md += `\n\n![${alt}](<${image.url.replace(/>/g, '%3E')}>)`;
                }
            },
        // ------------------------
        // New helper functions
        // ------------------------
        slugify(text) {
            if (!text) return '';
            return text.toString().toLowerCase().trim()
                .replace(/[\s\W-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        },

        parseAddress(text) {
            console.log("Parsing address:", text);
            if (!text) return null;
            const regex = /^(.*?),\s*(.*?),\s*([A-Z]{2})\s*(\d{5})?$/i;
            const match = text.match(regex);
            if (!match) return null;
            return { street: match[1], city: match[2], state: match[3], zip: match[4] || "" };
        },

        setupFieldActions() {
            this.schema.fields.forEach(f => {
                if (!f.actions) return;

                f.actions.forEach(action => {
                    if (action.action === 'slugify' && action.source) {
                        this.$watch(`doc.${action.source}`, value => {
                            // Only auto-update if empty or matches previous auto-value
                            const prev = this.prevValues[f.key];
                            if (!this.doc[f.key] || this.doc[f.key] === prev) {
                                this.doc[f.key] = this.slugify(value);
                                this.prevValues[f.key] = this.doc[f.key];
                            }
                        });
                    }

                    if (action.action === 'parse_address') {
                        this.$watch(`doc.${f.key}`, value => {
                            const parsed = this.parseAddress(value);
                            if (!parsed || !action.targets) return;
                            Object.entries(action.targets).forEach(([sourceKey, targetField]) => {
                                this.doc[targetField] = parsed[sourceKey] || '';
                            });
                        });
                    }

                    // Add other actions here: copy, template, validate, etc.
                });
            });
        },

        // ------------------------
        // Existing methods
        // ------------------------
        buildPayload() {
            const meta = JSON.parse(JSON.stringify(this.doc.meta || {}));
            const columns = {};
            const setNested = (obj, path, key, value) => {
                if (!path) { obj[key] = value; return; }
                const parts = path.split('.');
                let current = obj;
                for (const part of parts) {
                    if (!(part in current) || typeof current[part] !== 'object') current[part] = {};
                    current = current[part];
                }
                current[key] = value;
            };

            this.schema.fields.forEach(field => {
                const value = this.doc[field.key];
                if (value === undefined) return;
                if (field.storage === 'meta') setNested(meta, field.path, field.key, value);
                else columns[field.key] = value;
            });

            return { title: this.doc.title || '', body_md: this.doc.body_md || '', ...columns, meta, doc_type: this.doc_type };
        },

        get renderedMarkdown() {
            return safeContentMarkdown(this.doc.body_md || '');
        },

        async save(submit = false) {
            if (this.busy || !this.canEdit || this.uploadingImages) return false;
            this.error = null; this.ui_message = '';
            if (submit && !await this.validateRequiredFields()) return false;
            this.busy = true;
            try {
                const payload = this.buildPayload();
                const data = await Alpine.store('api').call(this.id ? 'content_update' : 'content_create', this.id ? {id: this.id} : {}, payload);
                this.id = data.id;
                this.doc.status = data.status;
                if (data.author !== undefined) this.doc.author = data.author;
                this.savedSnapshot = JSON.stringify(this.doc);
                const url = new URL(window.location.href);
                url.searchParams.set('id', this.id);
                url.searchParams.set('doc_type', this.doc_type);
                history.replaceState(null, '', url);
                if (submit) {
                    await Alpine.store('api').call('content_submit', {id: this.id}, {});
                    this.doc.status = 'submitted';
                    this.savedSnapshot = JSON.stringify(this.doc);
                    this.ui_message = 'Submitted for review.';
                } else this.ui_message = 'Draft saved.';
                return true;
            } catch (error) { this.error = error.message || 'Unable to save. Your changes are still here.'; return false; }
            finally { this.busy = false; }
        },
        async submit() { return this.save(true); }
    };
}

function safeContentMarkdown(markdown) {
    const doc = new DOMParser().parseFromString(marked.parse(markdown), 'text/html');
    const tags = new Set('P BR HR H1 H2 H3 H4 H5 H6 STRONG EM DEL BLOCKQUOTE PRE CODE UL OL LI A IMG TABLE THEAD TBODY TR TH TD'.split(' '));
    for (const element of [...doc.body.querySelectorAll('*')]) {
        if (!tags.has(element.tagName)) { element.replaceWith(doc.createTextNode(element.textContent)); continue; }
        for (const attr of [...element.attributes]) {
            if (!['href', 'src', 'alt', 'title'].includes(attr.name)) element.removeAttribute(attr.name);
            else if (['href', 'src'].includes(attr.name)) {
                try { if (!['http:', 'https:'].includes(new URL(attr.value, window.location.href).protocol)) element.removeAttribute(attr.name); }
                catch { element.removeAttribute(attr.name); }
            }
        }
    }
    return doc.body.innerHTML;
}
