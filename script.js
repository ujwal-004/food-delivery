// API Configuration - Change the backend URL as needed
const API_URL = 'http://localhost:5000/api'; // Change this to your backend URL if hosted elsewhere

// State Management
let currentUser = null;
let cart = [];
let currentRestaurant = null;
let currentRestaurantId = null;
let currentDetailRestaurantId = null;
let foodDetailQuantity = 1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRestaurants();
    loadUserFromStorage();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
}

// ===== RESTAURANTS FUNCTIONS =====
async function loadRestaurants() {
    try {
        const response = await fetch(`${API_URL}/restaurants`);
        const restaurants = await response.json();
        displayRestaurants(restaurants);
    } catch (error) {
        console.error('Error loading restaurants:', error);
        alert('Failed to load restaurants. Make sure backend is running on ' + API_URL);
    }
}

function displayRestaurants(restaurants) {
    const container = document.getElementById('restaurants-container');
    
    if (restaurants.length === 0) {
        container.innerHTML = '<p class="empty-message">No restaurants available</p>';
        return;
    }

    container.innerHTML = restaurants.map(restaurant => `
        <div class="restaurant-card" onclick="selectRestaurant(${restaurant.id}, '${restaurant.name}')">
            <img src="${restaurant.image}" alt="${restaurant.name}" class="card-image">
            <div class="card-body">
                <div class="card-title">${restaurant.name}</div>
                <div class="card-description">${restaurant.description || 'Delicious food'}</div>
                <div class="card-rating">
                    <span>⭐ ${restaurant.rating || 4.5}</span>
                    <span>${restaurant.delivery_time || '30 mins'}</span>
                </div>
                <div class="card-time">Delivery: $${restaurant.delivery_fee || 0}</div>
            </div>
        </div>
    `).join('');
}

function selectRestaurant(id, name) {
    currentRestaurantId = id;
    currentRestaurant = name;
    loadFoodItems(id);
    document.getElementById('restaurants-section').style.display = 'none';
    document.getElementById('food-section').style.display = 'block';
    document.getElementById('restaurant-name').textContent = name;
    window.scrollTo(0, 0);
}

function goBack() {
    document.getElementById('food-section').style.display = 'none';
    document.getElementById('restaurants-section').style.display = 'block';
    currentRestaurantId = null;
    currentRestaurant = null;
}

// ===== FOOD ITEMS FUNCTIONS =====
async function loadFoodItems(restaurantId) {
    try {
        const response = await fetch(`${API_URL}/food/restaurant/${restaurantId}`);
        const items = await response.json();
        displayFoodItems(items);
    } catch (error) {
        console.error('Error loading food items:', error);
        document.getElementById('food-container').innerHTML = '<p class="empty-message">Failed to load menu</p>';
    }
}

function displayFoodItems(items) {
    const container = document.getElementById('food-container');
    
    if (items.length === 0) {
        container.innerHTML = '<p class="empty-message">No items available at this restaurant</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="food-card" onclick="viewFoodDetail(${item.id}, '${item.name}', '${item.description}', ${item.price}, '${item.image}', ${item.restaurant_id})">
            <img src="${item.image}" alt="${item.name}" class="card-image">
            <div class="card-body">
                <div class="card-title">${item.name}</div>
                <div class="card-description">${item.description || ''}</div>
                <div class="card-price">$${item.price}</div>
                <div class="card-actions">
                    <button onclick="event.stopPropagation(); quickAddToCart(${item.id}, '${item.name}', ${item.price}, ${item.restaurant_id})" class="add-btn">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join('');
}

function viewFoodDetail(foodId, name, description, price, image, restaurantId) {
    foodDetailQuantity = 1;
    currentDetailRestaurantId = restaurantId;
    const modal = document.getElementById('food-detail-modal');
    document.getElementById('food-detail').innerHTML = `
        <img src="${image}" alt="${name}" class="food-detail-image">
        <div class="food-detail-info">
            <h3>${name}</h3>
            <p>${description || 'Delicious food item'}</p>
            <div class="food-detail-price">$${price}</div>
            
            <label>Quantity:</label>
            <div class="quantity-selector">
                <button onclick="decreaseQuantity()">-</button>
                <input type="number" id="detail-quantity" value="1" readonly>
                <button onclick="increaseQuantity()">+</button>
            </div>
            
            <button class="btn add-to-cart-modal" onclick="addDetailToCart(${foodId}, '${name}', ${price}, ${restaurantId})">
                Add to Cart
            </button>
        </div>
    `;
    modal.style.display = 'block';
}

function increaseQuantity() {
    foodDetailQuantity++;
    document.getElementById('detail-quantity').value = foodDetailQuantity;
}

function decreaseQuantity() {
    if (foodDetailQuantity > 1) {
        foodDetailQuantity--;
        document.getElementById('detail-quantity').value = foodDetailQuantity;
    }
}

function closeFoodDetail() {
    document.getElementById('food-detail-modal').style.display = 'none';
}

// ===== CART FUNCTIONS =====
function quickAddToCart(foodId, name, price, restaurantId) {
    addItemToCart(foodId, name, price, 1, restaurantId);
}

function addDetailToCart(foodId, name, price, restaurantId) {
    addItemToCart(foodId, name, price, foodDetailQuantity, restaurantId || currentDetailRestaurantId);
    closeFoodDetail();
}

function addItemToCart(foodId, name, price, quantity, restaurantId) {
    const selectedRestaurantId = restaurantId || currentRestaurantId;
    if (cart.length && Number(cart[0].restaurant_id) !== Number(selectedRestaurantId)) {
        alert('Please place or clear your current restaurant order before adding food from another restaurant.');
        return;
    }
    const existingItem = cart.find(item => item.id === foodId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: foodId,
            name: name,
            price: price,
            quantity: quantity,
            restaurant_id: selectedRestaurantId
        });
    }
    
    updateCartCount();
    showCartNotification();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function showCartNotification() {
    const btn = document.getElementById('auth-btn');
    btn.style.color = '#ffff00';
    setTimeout(() => {
        btn.style.color = 'white';
    }, 1000);
}

function openCart() {
    if (!currentUser) {
        alert('Please login first');
        toggleAuthModal();
        return;
    }
    
    displayCartItems();
    document.getElementById('cart-modal').style.display = 'block';
}

function closeCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function displayCartItems() {
    const container = document.getElementById('cart-items-container');
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-message">Your cart is empty</p>';
        document.getElementById('cart-total').textContent = '0.00';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-name">
                ${item.name}
                <div style="color: #999; font-size: 0.85rem;">$${item.price} each</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span style="width: 30px; text-align: center;">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
    `).join('');

    updateCartTotal();
}

function updateQuantity(foodId, change) {
    const item = cart.find(item => item.id === foodId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(foodId);
        } else {
            displayCartItems();
            updateCartCount();
        }
    }
}

function removeFromCart(foodId) {
    cart = cart.filter(item => item.id !== foodId);
    displayCartItems();
    updateCartCount();
}

function updateCartTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cart-total').textContent = total.toFixed(2);
}

function checkout() {
    if (!currentUser) {
        alert('Please login first');
        return;
    }

    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    displayCheckoutForm();
    closeCart();
    document.getElementById('checkout-modal').style.display = 'block';
}

function displayCheckoutForm() {
    const checkoutItems = document.getElementById('checkout-items');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    checkoutItems.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <span>${item.name} x ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');

    document.getElementById('checkout-total').textContent = total.toFixed(2);
}

function closeCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
}

async function handleCheckout(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please login first');
        return;
    }

    const deliveryAddress = document.getElementById('delivery-address').value;
    const deliveryPhone = document.getElementById('delivery-phone').value;

    if (!deliveryAddress || !deliveryPhone) {
        alert('Please fill all fields');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                restaurant_id: cart[0].restaurant_id,
                items: cart.map(({ id, quantity }) => ({ id, quantity })),
                delivery_address: deliveryAddress,
                phone: deliveryPhone
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Order placed successfully! Order ID: ${data.order_id}`);
            cart = [];
            updateCartCount();
            closeCheckout();
            document.getElementById('delivery-address').value = '';
            document.getElementById('delivery-phone').value = '';
            goBack();
            loadUserOrders();
        } else {
            alert('Error placing order: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order');
    }
}

// ===== SEARCH FUNCTION =====
async function searchFood() {
    const query = document.getElementById('search-input').value.trim();
    
    if (!query) {
        loadRestaurants();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/food/search/${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('API Error:', error);
            alert('Search failed: ' + (error.error || 'Unknown error'));
            return;
        }
        
        const results = await response.json();
        
        if (!Array.isArray(results)) {
            console.error('Invalid response:', results);
            alert('Search failed: Invalid response from server');
            return;
        }
        
        document.getElementById('restaurants').style.display = 'none';
        document.getElementById('food-section').style.display = 'block';
        document.getElementById('restaurant-name').textContent = `Search Results for "${query}"`;
        displayFoodItems(results);
    } catch (error) {
        console.error('Error searching:', error);
        alert('Search failed: ' + error.message);
    }
}

// ===== AUTHENTICATION FUNCTIONS =====
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            updateAuthButton();
            closeAuthModal();
            alert('Login successful!');
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
        } else {
            alert('Login failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login error: ' + error.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const address = document.getElementById('register-address').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone, password, address })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
            updateAuthButton();
            closeAuthModal();
            alert('Registration successful!');
            clearRegisterForm();
        } else {
            alert('Registration failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration error: ' + error.message);
    }
}

function clearRegisterForm() {
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-phone').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-address').value = '';
}

function loadUserFromStorage() {
    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user);
        updateAuthButton();
    }
}

function updateAuthButton() {
    const authBtn = document.getElementById('auth-btn');
    if (currentUser) {
        authBtn.textContent = `👤 ${currentUser.name} (Logout)`;
        authBtn.onclick = logout;
    } else {
        authBtn.textContent = 'Login';
        authBtn.onclick = toggleAuthModal;
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        cart = [];
        updateCartCount();
        updateAuthButton();
        loadRestaurants();
    }
}

// ===== MODAL FUNCTIONS =====
function toggleAuthModal() {
    if (currentUser) {
        logout();
    } else {
        document.getElementById('auth-modal').style.display = 'block';
    }
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

function switchTab(tab) {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tab + '-form').classList.add('active');
    event.target.classList.add('active');
}

// ===== ORDERS FUNCTIONS =====
async function loadUserOrders() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/orders/user/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const orders = await response.json();
        displayOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="empty-message">No orders yet</p>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-status">${order.status.toUpperCase()}</span>
            </div>
            <div class="order-details">
                <strong>${order.restaurant_name}</strong>
            </div>
            <div class="order-details">
                Amount: $${order.total_amount}
            </div>
            <div class="order-details">
                Delivery to: ${order.delivery_address}
            </div>
            <div class="order-details">
                Date: ${new Date(order.created_at).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

function closeOrders() {
    document.getElementById('orders-modal').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const cartModal = document.getElementById('cart-modal');
    const authModal = document.getElementById('auth-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const ordersModal = document.getElementById('orders-modal');
    const foodDetailModal = document.getElementById('food-detail-modal');
    
    if (event.target === cartModal) {
        closeCart();
    }
    if (event.target === authModal) {
        closeAuthModal();
    }
    if (event.target === checkoutModal) {
        closeCheckout();
    }
    if (event.target === ordersModal) {
        closeOrders();
    }
    if (event.target === foodDetailModal) {
        closeFoodDetail();
    }
}
