document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('deck-container');
  const menuBtn = document.getElementById('menu-toggle-btn');
  const exploreBtn = document.getElementById('explore-btn');
  const cards = Array.from(document.querySelectorAll('.page-card'));
  let isDeckOpen = false;

  function openDeck() {
    isDeckOpen = true;
    if (menuBtn) menuBtn.classList.add('is-open');
    if (container) container.classList.add('deck-active');
  }

  function closeDeck() {
    isDeckOpen = false;
    if (menuBtn) menuBtn.classList.remove('is-open');
    if (container) container.classList.remove('deck-active');
  }

  function toggleDeck() {
    if (isDeckOpen) closeDeck();
    else openDeck();
  }

  function selectCard(targetCard) {
    if (!targetCard) return;
    cards.forEach(card => card.classList.remove('is-selected'));
    targetCard.classList.add('is-selected');
    closeDeck();
    
    const pageId = targetCard.getAttribute('data-page');
    if (pageId) window.location.hash = pageId;

    // WebKit Iframe Scroll-Freeze Fix
    const iframe = targetCard.querySelector('iframe');
    if (iframe) {
      iframe.style.visibility = 'hidden';
      requestAnimationFrame(() => {
        iframe.style.visibility = 'visible';
        if (iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'WAKE_UP' }, '*');
      });
    }
  }

  window.toggleDeck = toggleDeck;
  window.navigateTo = function (pageName) {
    const targetCard = document.querySelector(`[data-page="${pageName}"]`);
    if (targetCard) selectCard(targetCard);
  };

  if (menuBtn) menuBtn.addEventListener('click', toggleDeck);
  if (exploreBtn) exploreBtn.addEventListener('click', toggleDeck);

  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (isDeckOpen) selectCard(card);
    });
    const tabHeader = card.querySelector('.card-tab-header');
    if (tabHeader) {
      tabHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isDeckOpen) openDeck();
        else selectCard(card);
      });
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleDeck();
  });

  window.addEventListener('message', (e) => {
    if (!e.data) return;
    if (e.data.type === 'NAVIGATE') window.navigateTo(e.data.page);
    else if (e.data.type === 'OPEN_STACK') openDeck();
  });
  // Make the logo navigate back to home
  const logoWrap = document.querySelector('.logo-wrap');
  if (logoWrap) {
    logoWrap.addEventListener('click', () => {
      window.navigateTo('home');
    });
  }

  // --- THEME CONTROLLER ---
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const sunIcon = document.getElementById('theme-sun-icon');
  const moonIcon = document.getElementById('theme-moon-icon');

  function setTheme(theme) {
    const isLight = (theme === 'light');
    if (isLight) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }

    if (sunIcon) sunIcon.style.display = isLight ? 'none' : 'block';
    if (moonIcon) moonIcon.style.display = isLight ? 'block' : 'none';

    if (themeToggleBtn) {
      themeToggleBtn.style.background = isLight ? '#FFFFFF' : '#280E48';
      themeToggleBtn.style.borderColor = isLight ? '#1D0A35' : '#D8B4E2';
      themeToggleBtn.style.color = isLight ? '#1D0A35' : '#D8B4E2';
    }

    document.querySelectorAll('.card-frame').forEach(frame => {
      try {
        if (frame.contentDocument) {
          if (isLight) {
            frame.contentDocument.body.classList.add('light-theme');
            frame.contentDocument.documentElement.classList.add('light-theme');
          } else {
            frame.contentDocument.body.classList.remove('light-theme');
            frame.contentDocument.documentElement.classList.remove('light-theme');
          }
        }
      } catch(err) {} 
      if (frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'THEME_CHANGE', theme: theme }, '*');
      }
    });

    localStorage.setItem('onestop_theme', theme);
  }

  const savedTheme = localStorage.getItem('onestop_theme') || 'dark';
  setTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isCurrentlyLight = document.body.classList.contains('light-theme');
      setTheme(isCurrentlyLight ? 'dark' : 'light');
    });
  }

  const initialHash = window.location.hash.replace('#', '');
  const matchedCard = cards.find(c => c.getAttribute('data-page') === initialHash);
  if (matchedCard) selectCard(matchedCard);
  else {
    const homeCard = document.querySelector('[data-page="home"]');
    if (homeCard) selectCard(homeCard);
  }
});

function handleHeaderSearch(e) {
  if (e && e.preventDefault) e.preventDefault();
  const queryInput = document.getElementById('header-search-input');
  if (!queryInput) return;
  const query = queryInput.value.trim();
  if (!query) return;

  if (window.navigateTo) window.navigateTo('apothecary');
  
  setTimeout(() => {
    const apothecaryCard = document.querySelector('[data-page="apothecary"]');
    if (apothecaryCard) {
      const iframe = apothecaryCard.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'SEARCH', query: query }, '*');
      }
    }
  }, 100);
}

// --- CART CONTROLLER ---
document.addEventListener('DOMContentLoaded', () => {
  let cart = JSON.parse(localStorage.getItem('onestop_cart')) || [];
  const cartBadge = document.getElementById('cart-badge');
  const cartWidget = document.getElementById('cart-widget');
  const cartDrawer = document.getElementById('cart-drawer');
  const closeCartBtn = document.getElementById('close-cart-btn');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartTotalPrice = document.getElementById('cart-total-price');

  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutModal = document.getElementById('checkout-modal');
  const closeCheckoutModal = document.getElementById('close-checkout-modal');

  function renderCart() {
    if (!cartItemsContainer) return;
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (totalItems > 0) {
      cartBadge.textContent = totalItems;
      cartBadge.style.display = 'flex';
    } else {
      cartBadge.style.display = 'none';
    }

    cartItemsContainer.innerHTML = '';
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p style="text-align: center; margin-top: 2rem; opacity: 0.6; font-size: 0.85rem;">Your bag is currently empty.</p>';
    } else {
      cart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
          <div class="cart-item-info">
            <h5>${item.name}</h5>
            <p>$${(item.price * item.quantity).toFixed(2)}</p>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(216, 180, 226, 0.3); border-radius: 999px; padding: 2px 8px;">
              <button class="qty-btn minus-btn" data-index="${index}" style="background: none; border: none; color: inherit; font-weight: bold; cursor: pointer; font-size: 1rem; padding: 0 4px;">&minus;</button>
              <span style="font-weight: 800; font-family: monospace; font-size: 0.9rem; min-width: 1.2rem; text-align: center;">${item.quantity}</span>
              <button class="qty-btn plus-btn" data-index="${index}" style="background: none; border: none; color: inherit; font-weight: bold; cursor: pointer; font-size: 1rem; padding: 0 4px;">&plus;</button>
            </div>
            <button class="remove-item-btn" data-index="${index}" title="Remove Item" style="margin-left: 0.75rem; background: none; border: none; color: #888; font-size: 1.2rem; cursor: pointer;">&times;</button>
          </div>
        `;
        cartItemsContainer.appendChild(row);
      });

      // Event Listeners for + / - / Delete
      document.querySelectorAll('.minus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-index');
          if (cart[idx].quantity > 1) {
            cart[idx].quantity -= 1;
          } else {
            cart.splice(idx, 1); // Delete if they minus past 1
          }
          localStorage.setItem('onestop_cart', JSON.stringify(cart));
          renderCart();
        });
      });

      document.querySelectorAll('.plus-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-index');
          cart[idx].quantity += 1;
          localStorage.setItem('onestop_cart', JSON.stringify(cart));
          renderCart();
        });
      });

      document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = e.target.getAttribute('data-index');
          cart.splice(idx, 1);
          localStorage.setItem('onestop_cart', JSON.stringify(cart));
          renderCart();
        });
      });
    }
    
    if (cartTotalPrice) cartTotalPrice.textContent = `$${totalValue.toFixed(2)}`;
  }

  renderCart();

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'ADD_TO_CART') {
      const incomingItem = e.data.item;
      const existingItem = cart.find(i => i.id === incomingItem.id);
      if (existingItem) existingItem.quantity += 1;
      else cart.push({ ...incomingItem, quantity: 1 });
      
      localStorage.setItem('onestop_cart', JSON.stringify(cart));
      cartBadge.classList.add('pop');
      setTimeout(() => cartBadge.classList.remove('pop'), 200);
      renderCart();
    }
  });

  if (cartWidget) cartWidget.addEventListener('click', () => cartDrawer.classList.add('is-open'));
  if (closeCartBtn) closeCartBtn.addEventListener('click', () => cartDrawer.classList.remove('is-open'));

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return; 
      cart = []; 
      localStorage.setItem('onestop_cart', JSON.stringify(cart));
      renderCart();
      cartDrawer.classList.remove('is-open'); 
      checkoutModal.classList.add('show'); 
    });
  }

  if (closeCheckoutModal) {
    closeCheckoutModal.addEventListener('click', () => checkoutModal.classList.remove('show'));
  }
});

// --- MOBILE SEARCH PANEL LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
  const mobileSearchToggle = document.getElementById('mobile-search-toggle');
  const mobileSearchPanel = document.getElementById('mobile-search-panel');
  const mobileSearchInput = document.getElementById('mobileSearchInput');

  if (mobileSearchToggle && mobileSearchPanel) {
    mobileSearchToggle.addEventListener('click', () => {
      mobileSearchPanel.classList.toggle('is-open');
      if (mobileSearchPanel.classList.contains('is-open')) {
        mobileSearchInput.focus();
      }
    });
  }

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const iframes = document.querySelectorAll('.deck-page iframe');
      iframes.forEach(iframe => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'SEARCH', query: query }, '*');
        }
      });
    });
  }
});

// ==========================================
// GLOBAL SEARCH OVERLAY LOGIC
// ==========================================

const searchIndex = [
  { type: 'product', id: "hydrating-barrier-cream", category: "Skincare", name: "Hydrating Barrier Cream", desc: "Moisturizes and calms dry, sensitive skin.", price: 24.00 },
  { type: 'product', id: "daily-vitamin-c-zinc", category: "Immunity", name: "Daily Vitamin C & Zinc", desc: "High absorption everyday immunity support.", price: 18.00 },
  { type: 'product', id: "night-sleep-support", category: "Sleep & Rest", name: "Night Sleep Support", desc: "Natural herbal formula for peaceful sleep.", price: 22.00 },
  { type: 'product', id: "omega-3-fish-oil", category: "Heart Health", name: "Omega-3 Fish Oil", desc: "Triple strength EPA/DHA for brain and heart.", price: 28.00 },
  { type: 'product', id: "digestive-enzymes", category: "Gut Health", name: "Digestive Enzymes", desc: "Breaks down complex foods to ease bloating.", price: 26.00 },
  { type: 'page', id: "consult-pharmacist", category: "Service", name: "Talk to a Pharmacist", desc: "Free medication advice and clinical consults.", target: "consultation" },
  { type: 'page', id: "upload-prescription", category: "Service", name: "Upload a Prescription", desc: "Send photos or documents for easy refills.", target: "dispensary" }
];

const desktopSearchInput = document.getElementById('searchInput');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const searchOverlay = document.getElementById('search-overlay');
const searchResultsContainer = document.getElementById('search-results-container');
const closeSearchBtn = document.getElementById('close-search-btn');

// --- UPDATED: Universal cleanup function ---
function closeSearchUI() {
  // 1. Hide the search results overlay
  searchOverlay.style.display = 'none';
  
  // 2. Clear and collapse desktop search
  if (desktopSearchInput) {
    desktopSearchInput.value = '';
    desktopSearchInput.blur(); // Drops focus
    
    // Finds the parent containers and removes the classes that keep them expanded
    const desktopWrap = desktopSearchInput.closest('.header-search-wrap');
    const desktopBox = desktopSearchInput.closest('.header-search-box');
    if (desktopWrap) desktopWrap.classList.remove('active', 'show', 'open', 'is-open');
    if (desktopBox) desktopBox.classList.remove('active', 'show', 'open', 'is-open');
  }
  
  // 3. Clear and collapse mobile search
  if (mobileSearchInput) {
    mobileSearchInput.value = '';
    mobileSearchInput.blur(); // Forces the mobile keyboard to close
  }
  
  const mobilePanel = document.getElementById('mobile-search-panel');
  if (mobilePanel) {
    // Added 'is-open' here to perfectly match your toggle logic!
    mobilePanel.classList.remove('show', 'active', 'open', 'is-open'); 
    mobilePanel.style.display = ''; 
  }
}
function handleLiveSearch(query) {
  const q = query.toLowerCase().trim();
  
  if (q.length === 0) {
    searchOverlay.style.display = 'none';
    return;
  }

  const results = searchIndex.filter(item => 
    item.name.toLowerCase().includes(q) || 
    item.category.toLowerCase().includes(q) ||
    item.desc.toLowerCase().includes(q)
  );

  if (results.length > 0) {
    searchResultsContainer.innerHTML = results.map(item => {
      if (item.type === 'product') {
        // Product Row: Passes the item name into navFromSearch
        return `
          <div class="search-result-item" style="cursor: pointer;" onclick="navFromSearch('apothecary', '${item.name}')">
            <div class="search-result-info">
              <span style="font-size: 0.65rem; font-weight: 700; color: #777; text-transform: uppercase;">${item.category}</span>
              <h4 style="color: inherit; margin: 0.2rem 0;">${item.name}</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #666;">${item.desc}</p>
            </div>
            <div class="search-result-action">
              <span style="font-weight: 800; font-size: 1rem;">$${item.price.toFixed(2)}</span>
              <button class="btn-pill btn-primary" style="padding: 0.4rem 0.9rem; font-size: 0.7rem; border-radius: 999px;" 
                      onclick="event.stopPropagation(); addFromSearch('${item.id}', '${item.name}', ${item.price}, this)">
                ADD
              </button>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="search-result-item" style="cursor: pointer;" onclick="navFromSearch('${item.target}')">
            <div class="search-result-info">
              <span style="font-size: 0.65rem; font-weight: 700; color: #777; text-transform: uppercase;">${item.category}</span>
              <h4 style="color: inherit; margin: 0.2rem 0;">${item.name}</h4>
              <p style="margin: 0; font-size: 0.8rem; color: #666;">${item.desc}</p>
            </div>
            <div class="search-result-action">
              <button class="btn-pill" style="padding: 0.4rem 0.9rem; font-size: 0.7rem; border-radius: 999px; background: transparent; border: 1.5px solid #1D0A35; color: #1D0A35; font-weight: 700;">
                OPEN &rarr;
              </button>
            </div>
          </div>
        `;
      }
    }).join('');
  } else {
    searchResultsContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #888; font-size: 0.9rem;">
        No results found matching "${query}".
      </div>`;
  }
  
  searchOverlay.style.display = 'flex';
}

window.addFromSearch = function(id, name, price, btnEl) {
  btnEl.innerText = '✓ ADDED';
  btnEl.style.background = '#22C55E';
  btnEl.style.color = '#FFF';
  btnEl.style.border = 'none';

  window.postMessage({ type: 'ADD_TO_CART', item: { id, name, price } }, '*');
  setTimeout(() => closeSearchUI(), 800);
};

// --- NEW: Added optional itemName parameter ---
window.navFromSearch = function(targetPage, itemName = null) {
  const cards = document.querySelectorAll('.page-card');
  cards.forEach(card => card.classList.remove('is-selected'));
  
  const targetCard = document.querySelector(`.page-card[data-page="${targetPage}"]`);
  if (targetCard) {
    targetCard.classList.add('is-selected');
    
    // If a specific product was clicked, tell the iframe to scroll to it
    if (itemName) {
      const iframe = targetCard.querySelector('.card-frame');
      setTimeout(() => {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'SCROLL_TO_ITEM', itemName: itemName }, '*');
        }
      }, 300); // 300ms delay allows the card transition to reveal before scrolling
    }
  }
  
  closeSearchUI();
};

if (desktopSearchInput) desktopSearchInput.addEventListener('input', (e) => handleLiveSearch(e.target.value));
if (mobileSearchInput) mobileSearchInput.addEventListener('input', (e) => handleLiveSearch(e.target.value));
if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeSearchUI);

document.addEventListener('click', (e) => {
  // Now explicitly ignores clicks on the mobile toggle button too!
  if (!e.target.closest('#search-overlay') && 
      !e.target.closest('.header-search-wrap') && 
      !e.target.closest('.mobile-search-panel') && 
      !e.target.closest('#mobile-search-toggle')) {
    closeSearchUI();
  }
});