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

  // --- THEME CONTROLLER ---
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const headerLogo = document.getElementById('header-logo');
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

    if (headerLogo) {
      headerLogo.src = isLight ? 'images/onestop logo dark1.png' : 'images/onestop logo light1.png';
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
// Replace your existing selectCard function with this one:
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


// --- CART CONTROLLER (Local Storage, Delete & Checkout) ---
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
            <p>$${item.price.toFixed(2)}</p>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="font-weight: 800; font-family: monospace; font-size: 0.9rem;">x${item.quantity}</div>
            <button class="remove-item-btn" data-index="${index}" title="Remove Item">&times;</button>
          </div>
        `;
        cartItemsContainer.appendChild(row);
      });

      // Bind Delete Buttons
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

  // Checkout Logic
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return; // Do nothing if empty
      cart = []; // Clear Cart
      localStorage.setItem('onestop_cart', JSON.stringify(cart));
      renderCart();
      cartDrawer.classList.remove('is-open'); // Close Drawer
      checkoutModal.classList.add('show'); // Pop Success Modal
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

  // Hook up the mobile input to filter the iframes
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