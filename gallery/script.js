document.addEventListener('DOMContentLoaded', () => {
            const galleryGrid = document.getElementById('gallery-grid');
            const loadingIndicator = document.getElementById('loading-indicator');
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            const lightboxClose = document.getElementById('lightbox-close');
            const lightboxPrev = document.getElementById('lightbox-prev');
            const lightboxNext = document.getElementById('lightbox-next');
            const lightboxDownload = document.getElementById('lightbox-download');
            const lightboxShare = document.getElementById('lightbox-share');
            const navSlider = document.getElementById('nav-slider');
            const navItems = document.querySelectorAll('.nav-item');
            const searchContainer = document.querySelector('.search-container');
            const searchBtn = document.getElementById('search-btn');
            const searchBar = document.getElementById('search-bar');
            const uploadInput = document.getElementById('upload-input');
            const mainContent = document.getElementById('main-content');
            const downloadsView = document.getElementById('downloads-view');
            const downloadsGrid = document.getElementById('downloads-grid');
            const noDownloadsMsg = document.getElementById('no-downloads-msg');
            const downloadCount = document.getElementById('download-count');

            let galleryItems = [];
            let downloadedItems = JSON.parse(localStorage.getItem('downloadedGalleryItems')) || [];
            let currentLightboxIndex = 0;

            // --- Initial Setup ---
            async function initializeGallery() {
                try {
                    // Using Unsplash for varied, high-quality images
                    const imageCount = 58;
                    
                    // Create an array of image URLs from the Unsplash API
                    galleryItems = Array.from({ length: imageCount }, (_, i) => ({
                        id: `unsplash-${i}`,
                        // Using a specific collection for a cohesive aesthetic
                        src: `https://source.unsplash.com/collection/9499700/800x600?sig=${i}`,
                        type: 'image'
                    }));

                    // Add user uploaded images from local storage to the beginning of the gallery
                    const uploadedImages = JSON.parse(localStorage.getItem('uploadedGalleryImages')) || [];
                    galleryItems.unshift(...uploadedImages);

                    renderGallery(galleryItems);
                    updateDownloadCounter();
                } catch (error) {
                    console.error("Failed to initialize gallery:", error);
                    galleryGrid.innerHTML = '<p class="text-red-500 col-span-full text-center">Could not load images. Please check your network connection.</p>';
                } finally {
                    loadingIndicator.style.display = 'none';
                }
            }

            // --- Rendering Functions ---
            function createGalleryCard(item, index) {
                const card = document.createElement('div');
                card.className = 'group relative aspect-square overflow-hidden rounded-xl cursor-pointer shadow-lg transition-transform duration-300 ease-in-out hover:!transform-none';
                card.dataset.index = index;

                const img = document.createElement('img');
                img.src = item.src;
                img.alt = `Gallery item ${index + 1}`;
                img.loading = 'lazy'; // Important for performance
                img.className = 'w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110';
                
                const overlay = document.createElement('div');
                overlay.className = 'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 p-2';

                const expandBtn = createIconButton('expand', 'Expand', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17v5h5M17 7V2h-5m10 15-6-6M2 7l6-6"/></svg>');
                expandBtn.onclick = (e) => { e.stopPropagation(); openLightbox(index); };

                const downloadBtn = createIconButton('download', 'Download', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>');
                downloadBtn.onclick = (e) => { e.stopPropagation(); downloadItem(item); };

                const shareBtn = createIconButton('share', 'Share', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>');
                shareBtn.onclick = (e) => { e.stopPropagation(); shareItem(item); };

                overlay.append(expandBtn, downloadBtn, shareBtn);
                card.append(img, overlay);
                card.addEventListener('click', () => openLightbox(index));

                return card;
            }

            function createIconButton(action, label, svg) {
                const button = document.createElement('button');
                button.innerHTML = svg;
                button.setAttribute('aria-label', label);
                button.className = 'p-3 glass-effect rounded-full text-white hover:bg-white/20 transition-all duration-300 transform hover:scale-110';
                button.addEventListener('mousedown', (e) => {
                    e.target.closest('button').classList.add('liquid-click-effect');
                });
                button.addEventListener('animationend', (e) => {
                    e.target.closest('button').classList.remove('liquid-click-effect');
                });
                return button;
            }
            
            function renderGallery(items) {
                galleryGrid.innerHTML = '';
                items.forEach((item, index) => {
                    galleryGrid.appendChild(createGalleryCard(item, index));
                });
            }

            function renderDownloads() {
                downloadsGrid.innerHTML = '';
                if(downloadedItems.length === 0){
                    noDownloadsMsg.classList.remove('hidden');
                } else {
                    noDownloadsMsg.classList.add('hidden');
                    downloadedItems.forEach((item, index) => {
                        const card = createGalleryCard(item, galleryItems.findIndex(g => g.id === item.id));
                        downloadsGrid.appendChild(card);
                    });
                }
            }

            // --- Lightbox Logic ---
            function openLightbox(index) {
                currentLightboxIndex = index;
                const item = galleryItems[index];
                if (!item) return;

                lightboxImg.src = item.src;
                lightbox.classList.remove('hidden');
                lightbox.classList.add('flex');
                document.body.style.overflow = 'hidden';

                // Event listeners for lightbox actions
                window.addEventListener('keydown', handleKeyPress);
                lightboxImg.addEventListener('touchstart', handleTouchStart, { passive: true });
                lightboxImg.addEventListener('touchmove', handleTouchMove, { passive: true });
            }

            function closeLightbox() {
                lightbox.classList.add('hidden');
                lightbox.classList.remove('flex');
                document.body.style.overflow = '';
                window.removeEventListener('keydown', handleKeyPress);
                lightboxImg.removeEventListener('touchstart', handleTouchStart);
                lightboxImg.removeEventListener('touchmove', handleTouchMove);
            }

            function showNextImage() {
                currentLightboxIndex = (currentLightboxIndex + 1) % galleryItems.length;
                updateLightboxImage();
            }

            function showPrevImage() {
                currentLightboxIndex = (currentLightboxIndex - 1 + galleryItems.length) % galleryItems.length;
                updateLightboxImage();
            }

            function updateLightboxImage() {
                const item = galleryItems[currentLightboxIndex];
                lightboxImg.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                setTimeout(() => {
                    lightboxImg.src = item.src;
                    lightboxImg.onload = () => {
                        lightboxImg.classList.remove('opacity-0');
                    };
                }, 150);
            }

            // --- Event Handlers ---
            function handleKeyPress(e) {
                if (e.key === 'Escape') closeLightbox();
                if (e.key === 'ArrowRight') showNextImage();
                if (e.key === 'ArrowLeft') showPrevImage();
            }

            let touchStartX = 0;
            let touchEndX = 0;
            const swipeThreshold = 50; // 50px swipe

            function handleTouchStart(e) {
                touchStartX = e.changedTouches[0].screenX;
            }

            function handleTouchMove(e) {
                touchEndX = e.changedTouches[0].screenX;
            }
            
            lightboxImg.addEventListener('touchend', () => {
                if (touchStartX - touchEndX > swipeThreshold) {
                    showNextImage();
                } else if (touchEndX - touchStartX > swipeThreshold) {
                    showPrevImage();
                }
            });

            lightboxClose.addEventListener('click', closeLightbox);
            lightboxPrev.addEventListener('click', showPrevImage);
            lightboxNext.addEventListener('click', showNextImage);
            lightboxDownload.addEventListener('click', () => downloadItem(galleryItems[currentLightboxIndex]));
            lightboxShare.addEventListener('click', () => shareItem(galleryItems[currentLightboxIndex]));

            // --- Navigation Logic ---
            navItems.forEach((item) => {
                item.addEventListener('click', (e) => {
                    const button = e.currentTarget;
                    const view = button.dataset.view;
                    
                    // Update slider position
                    navSlider.style.transform = `translateX(${button.offsetLeft - navSlider.parentElement.offsetLeft + 8}px)`; // 8 is for padding
                    
                    // Update active item styles
                    navItems.forEach(i => i.classList.replace('text-white', 'text-gray-400'));
                    button.classList.replace('text-gray-400', 'text-white');

                    if (view === 'gallery') {
                        mainContent.classList.remove('hidden');
                        downloadsView.classList.add('hidden');
                    } else if (view === 'downloads') {
                        mainContent.classList.add('hidden');
                        downloadsView.classList.remove('hidden');
                        renderDownloads();
                    }
                });
            });
            
            // Set initial position of slider
            if (navItems.length > 0) {
                navSlider.style.transform = `translateX(${navItems[0].offsetLeft - navSlider.parentElement.offsetLeft + 8}px)`;
            }

            // --- Search Bar Logic ---
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isExpanded = searchBar.classList.contains('w-32');
                if (isExpanded) {
                    if(searchBar.value === '') {
                        searchBar.classList.remove('w-32', 'p-2', 'opacity-100');
                        searchBar.classList.add('w-0', 'p-0', 'opacity-0');
                    } else {
                        // perform search
                        const query = searchBar.value.toLowerCase();
                        const filteredItems = galleryItems.filter(item => 
                            item.alt?.toLowerCase().includes(query) || item.id.includes(query)
                        );
                        renderGallery(filteredItems);
                    }
                } else {
                    searchBar.classList.add('w-32', 'p-2', 'opacity-100');
                    searchBar.classList.remove('w-0', 'p-0', 'opacity-0');
                    searchBar.focus();
                }
            });

            searchBar.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    const query = searchBar.value.toLowerCase();
                    const filteredItems = galleryItems.filter(item => item.id.includes(query));
                    renderGallery(filteredItems);
                }
            });

            // --- Actions: Download, Share, Upload ---
            async function downloadItem(item) {
                try {
                    // Using a cors proxy for fetching from unsplash
                    const response = await fetch(`https://cors-anywhere.herokuapp.com/${item.src}`);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `${item.id}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();

                    // Add to downloads collection if not already there
                    if(!downloadedItems.find(d => d.id === item.id)) {
                        downloadedItems.push(item);
                        localStorage.setItem('downloadedGalleryItems', JSON.stringify(downloadedItems));
                        updateDownloadCounter();
                        showNotification("Added to downloads.");
                    } else {
                        showNotification("Already in your downloads.");
                    }
                } catch (err) {
                    console.error('Download failed:', err);
                    showNotification('Download failed! CORS policy might be blocking it.', true);
                }
            }
            
            async function shareItem(item) {
                const shareData = {
                    title: 'Check out this image!',
                    text: 'I found this beautiful image in the gallery.',
                    url: item.src,
                };
                try {
                    if (navigator.share) {
                        await navigator.share(shareData);
                    } else {
                        // Fallback for desktop/unsupported browsers
                        navigator.clipboard.writeText(item.src);
                        showNotification('Image URL copied to clipboard!');
                    }
                } catch (err) {
                    console.error('Share failed:', err);
                    showNotification('Could not share image.', true);
                }
            }
            
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if(file && file.type.startsWith('image/')){
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const newItem = {
                            id: `upload-${Date.now()}`,
                            src: event.target.result,
                            type: 'image'
                        };
                        galleryItems.unshift(newItem);
                        
                        const uploadedImages = JSON.parse(localStorage.getItem('uploadedGalleryImages')) || [];
                        uploadedImages.unshift(newItem);
                        localStorage.setItem('uploadedGalleryImages', JSON.stringify(uploadedImages));
                        
                        renderGallery(galleryItems);
                        showNotification('Image uploaded successfully!');
                    }
                    reader.readAsDataURL(file);
                }
            });

            function updateDownloadCounter() {
                if (downloadedItems.length > 0) {
                    downloadCount.textContent = downloadedItems.length;
                    downloadCount.classList.remove('hidden');
                } else {
                    downloadCount.classList.add('hidden');
                }
            }
            
            function showNotification(message, isError = false) {
                const modal = document.getElementById('notification-modal');
                const msgEl = document.getElementById('notification-message');
                msgEl.textContent = message;
                modal.className = modal.className.replace(/bg-\w+-500/, isError ? 'bg-red-500' : 'bg-green-500');
                
                modal.classList.remove('translate-x-[150%]');
                modal.classList.add('translate-x-0');

                setTimeout(() => {
                    modal.classList.add('translate-x-[150%]');
                    modal.classList.remove('translate-x-0');
                }, 3000);
            }

            // --- Start the app ---
            initializeGallery();
        });
