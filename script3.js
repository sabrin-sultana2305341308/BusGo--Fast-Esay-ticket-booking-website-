// =================== GLOBAL STATE ===================
let currentBooking = null;
let currentUser    = null;   // Set by checkAuthState() from server

// =================== INIT ===================
document.addEventListener('DOMContentLoaded', function () {
    initApp();
});

async function initApp() {
    setMinDate();
    setupNavigation();
    setupEventListeners();
    setupHamburger();
    await checkAuthState();
    initSeatMap();
}

// =================== API HELPER ===================
async function apiFetch(url, data = null, method = 'POST') {
    try {
        const opts = {
            method,
            credentials: 'same-origin',
        };

        if (data && method === 'POST') {
            // Send as form-encoded — InfinityFree blocks application/json POST requests
            opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            opts.body = new URLSearchParams(flattenForForm(data)).toString();
        }

        if (data && method === 'GET') {
            url += '?' + new URLSearchParams(data);
        }

        const resp = await fetch(url, opts);
        return await resp.json();
    } catch (err) {
        console.error('API error:', err);
        return { success: false, message: 'Network error. Please try again.' };
    }
}

// Flatten nested data for form encoding (arrays like seats[] become "3,7,12")
function flattenForForm(data) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
            result[key] = value.join(',');
        } else {
            result[key] = value;
        }
    }
    return result;
}

// =================== AUTH STATE ===================
async function checkAuthState() {
    const res = await apiFetch('api/auth.php', { action: 'check' }, 'GET');
    if (res.success && res.user) {
        currentUser = res.user;
        showLoggedInNav(currentUser);
        showSection('home');
    } else {
        currentUser = null;
        showLoggedOutNav();
        showSection('auth');
    }
}

function getSession() {
    return currentUser;   // synchronous accessor for UI checks
}

// =================== AUTH TAB SWITCH ===================
function switchAuthTab(tab) {
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('registerTab').classList.toggle('active', tab === 'register');
    document.getElementById('loginPanel').classList.toggle('active', tab === 'login');
    document.getElementById('registerPanel').classList.toggle('active', tab === 'register');
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
}

// =================== LOGIN ===================
async function handleLogin() {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password   = document.getElementById('loginPassword').value;

    if (!identifier || !password) {
        showAuthError('loginError', 'Please fill in all fields.');
        return;
    }

    const btn = document.querySelector('#loginPanel .auth-btn');
    setLoading(btn, true);

    const res = await apiFetch('api/auth.php', { action: 'login', identifier, password });
    setLoading(btn, false);

    if (!res.success) {
        showAuthError('loginError', res.message || 'Login failed.');
        return;
    }

    currentUser = res.user;
    showLoggedInNav(currentUser);
    showSection('home');
    showToast('Welcome back, ' + currentUser.name + '!');
}

// =================== REGISTER ===================
let pendingRegistration = null;

function initiateRegister() {
    const name     = document.getElementById('regName').value.trim();
    const phone    = document.getElementById('regPhone').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    document.getElementById('registerError').style.display = 'none';

    if (!name || !phone || !email || !password) {
        showAuthError('registerError', 'Please fill in all fields.');
        return;
    }
    if (!/^01[3-9]\d{8}$/.test(phone)) {
        showAuthError('registerError', 'Enter a valid Bangladesh phone number (e.g. 01700000000).');
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        showAuthError('registerError', 'Please enter a valid email address.');
        return;
    }
    if (password.length < 6) {
        showAuthError('registerError', 'Password must be at least 6 characters.');
        return;
    }

    pendingRegistration = { name, phone, email, password };
    document.getElementById('termsAgreementModal').classList.add('show');
}

async function agreeTerms() {
    if (!pendingRegistration) return;

    const btn = document.querySelector('#termsAgreementModal .btn-primary');
    setLoading(btn, true);

    const res = await apiFetch('api/auth.php', {
        action: 'register',
        ...pendingRegistration
    });
    setLoading(btn, false);

    if (!res.success) {
        document.getElementById('termsAgreementModal').classList.remove('show');
        showAuthError('registerError', res.message || 'Registration failed.');
        pendingRegistration = null;
        return;
    }

    currentUser = res.user;
    document.getElementById('termsAgreementModal').classList.remove('show');
    pendingRegistration = null;

    showLoggedInNav(currentUser);
    showSection('home');
    showToast('Welcome to BusGo, ' + currentUser.name + '!');
}

function declineTerms() {
    document.getElementById('termsAgreementModal').classList.remove('show');
    pendingRegistration = null;
    showAuthError('registerError', 'You must agree to the Terms & Conditions to register.');
}

// =================== LOGOUT ===================
async function logout() {
    await apiFetch('api/auth.php', { action: 'logout' });
    currentUser = null;
    showLoggedOutNav();
    showSection('auth');
    showToast('Logged out successfully.');
}

// =================== NAV ===================
function showLoggedInNav(user) {
    document.querySelectorAll('.nav-logged-in').forEach(el => el.style.display = 'list-item');
    document.querySelectorAll('.nav-guest-item').forEach(el => el.style.display = 'none');

    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.textContent = user.name.split(' ')[0];

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const homeLink = document.querySelector('[data-section="home"]');
    if (homeLink) homeLink.classList.add('active');
}

function showLoggedOutNav() {
    document.querySelectorAll('.nav-logged-in').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-guest-item').forEach(el => el.style.display = 'list-item');
}

// =================== AUTH HELPERS ===================
function showAuthError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
}

function togglePw(id, btn) {
    const input = document.getElementById(id);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// =================== LOADING STATE HELPER ===================
function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.dataset.origText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait…';
        btn.disabled = true;
    } else {
        btn.innerHTML = btn.dataset.origText || btn.innerHTML;
        btn.disabled = false;
    }
}

// =================== NAVIGATION ===================
function setupNavigation() {
    const links = document.querySelectorAll('.nav-link[data-section]');
    links.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.dataset.section;

            const protectedSections = ['home', 'cancel'];
            if (protectedSections.includes(section) && !getSession()) {
                showSection('auth');
                return;
            }

            showSection(section);
            links.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            document.querySelector('.nav-menu').classList.remove('open');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (section === 'cancel') loadMyTickets();
        });
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
}

// =================== HAMBURGER ===================
function setupHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu   = document.querySelector('.nav-menu');
    hamburger.addEventListener('click', () => navMenu.classList.toggle('open'));
}

// =================== SCROLL TO BOOKING ===================
function scrollToBooking() {
    showSection('home');
    setTimeout(() => {
        document.querySelector('.booking-container').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// =================== MIN DATE ===================
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('travelDate').min = today;
}

// =================== ROUTES ===================
const routes = {
    'dhaka-cumilla':    250,
    'dhaka-chattogram': 650,
    'dhaka-sylhet':     700,
    'dhaka-rajshahi':   800,
    'dhaka-khulna':     650
};

// =================== SEAT STATE ===================
let seats         = Array(40).fill('available');
let selectedSeats = [];
let maxSeats      = 1;
let serverBookedSeats = [];   // Fetched from API

// =================== TIMER ===================
let timer    = null;
let timeLeft = 120;

// =================== INIT SEAT MAP ===================
function initSeatMap() {
    renderSeatMap();
}

// ── Load booked seats from server for current route/date/time
async function loadBookedSeats() {
    const route = document.getElementById('route').value;
    const date  = document.getElementById('travelDate').value;
    const time  = document.getElementById('travelTime').value;

    if (!route || !date || !time) {
        serverBookedSeats = [];
        refreshSeatState();
        return;
    }

    const res = await apiFetch('api/bookings.php', { action: 'booked_seats', route, date, time }, 'GET');
    serverBookedSeats = (res.success && Array.isArray(res.seats)) ? res.seats : [];
    refreshSeatState();
}

function refreshSeatState() {
    seats = Array(40).fill('available');
    serverBookedSeats.forEach(s => { if (s >= 1 && s <= 40) seats[s - 1] = 'booked'; });
    // Re-apply any still-valid selected seats
    selectedSeats = selectedSeats.filter(s => seats[s - 1] !== 'booked');
    selectedSeats.forEach(s => { seats[s - 1] = 'selected'; });
    renderSeatMap();
    updateSummary();
}

// =================== RENDER SEAT MAP ===================
function renderSeatMap() {
    const map = document.getElementById('seatMap');
    map.innerHTML = '';

    let seatNo = 1;
    for (let r = 0; r < 10; r++) {
        const row = document.createElement('div');
        row.className = 'seat-row';

        for (let i = 0; i < 2; i++) row.appendChild(createSeat(seatNo++));

        const aisle = document.createElement('div');
        aisle.className = 'aisle';
        row.appendChild(aisle);

        for (let i = 0; i < 2; i++) row.appendChild(createSeat(seatNo++));

        map.appendChild(row);
    }

    const legend = document.createElement('div');
    legend.className = 'seat-legend';
    legend.innerHTML = `
        <div class="legend-item"><div class="legend-dot available"></div> Available</div>
        <div class="legend-item"><div class="legend-dot selected"></div> Selected</div>
        <div class="legend-item"><div class="legend-dot booked"></div> Booked</div>
    `;
    map.appendChild(legend);

    updateSelectedDisplay();
}

function createSeat(num) {
    const s = document.createElement('div');
    s.className = `seat ${seats[num - 1]}`;
    s.dataset.seat = num;
    s.innerHTML = num;
    return s;
}

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
    ['route', 'ticketType', 'travelDate', 'travelTime', 'ticketCount'].forEach(id => {
        document.getElementById(id).addEventListener('change', handleFormChange);
    });

    document.addEventListener('click', handleSeatClick);
    document.getElementById('bookingForm').addEventListener('submit', e => {
        handleBooking(e).catch(err => {
            console.error(err);
            showToast('An error occurred. Please try again.');
        });
    });
}

async function handleFormChange() {
    updateSummary();
    // Reload booked seats when route/date/time all have values
    const route = document.getElementById('route').value;
    const date  = document.getElementById('travelDate').value;
    const time  = document.getElementById('travelTime').value;
    if (route && date && time) {
        await loadBookedSeats();
    }
}

function handleSeatClick(e) {
    const seat = e.target.closest('.seat');
    if (!seat || seat.classList.contains('booked')) return;

    const num = parseInt(seat.dataset.seat);

    if (seat.classList.contains('selected')) {
        seats[num - 1] = 'available';
        selectedSeats = selectedSeats.filter(x => x !== num);
    } else {
        if (selectedSeats.length >= maxSeats) {
            showToast('You can only select ' + maxSeats + ' seat(s).');
            return;
        }
        seats[num - 1] = 'selected';
        selectedSeats.push(num);
        if (selectedSeats.length === 1) startTimer();
    }

    renderSeatMap();
    updateSummary();
}

// =================== TIMER ===================
function startTimer() {
    if (timer) return;
    timeLeft = 120;

    timer = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = String(timeLeft % 60).padStart(2, '0');
        document.getElementById('timer').innerText = `Hold Time: ${mins}:${secs}`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            timer = null;
            releaseSeats();
        }
    }, 1000);
}

function releaseSeats() {
    showToast('Hold time expired! Please reselect your seats.');
    selectedSeats.forEach(s => { seats[s - 1] = 'available'; });
    selectedSeats = [];
    renderSeatMap();
    updateSummary();
    document.getElementById('timer').innerText = 'Hold Time: 2:00';
}

// =================== SUMMARY ===================
function updateSummary() {
    const route = document.getElementById('route').value;
    const type  = document.getElementById('ticketType').value;
    const count = parseInt(document.getElementById('ticketCount').value);
    const date  = document.getElementById('travelDate').value;
    const time  = document.getElementById('travelTime').value;

    maxSeats = count;

    if (selectedSeats.length > maxSeats) {
        selectedSeats.slice(maxSeats).forEach(s => { seats[s - 1] = 'available'; });
        selectedSeats = selectedSeats.slice(0, maxSeats);
        renderSeatMap();
    }

    const price = routes[route] || 0;
    const total = price * (type === 'roundway' ? 2 : 1) * count;

    const routeSel  = document.getElementById('route');
    const routeText = routeSel.options[routeSel.selectedIndex].text;

    document.getElementById('summaryRoute').innerText      = route ? routeText : '-';
    document.getElementById('summaryTicketType').innerText = type === 'roundway' ? 'Round Way' : 'One Way';
    document.getElementById('summaryDateTime').innerText   = (date && time) ? `${date} at ${time}` : '-';
    document.getElementById('summaryTickets').innerText    = count ? `${count} Ticket(s)` : '-';
    document.getElementById('summarySeats').innerText      = selectedSeats.length ? selectedSeats.join(', ') : '-';
    document.getElementById('totalAmount').innerText       = total + ' BDT';

    const btn   = document.getElementById('bookBtn');
    const ready = route && date && time && selectedSeats.length === count;
    btn.disabled = !ready;
    btn.classList.toggle('active', !!ready);

    updateSelectedDisplay();
}

function updateSelectedDisplay() {
    const el = document.getElementById('selectedSeats');
    el.innerHTML = selectedSeats.length
        ? 'Selected Seats: <strong>' + selectedSeats.join(', ') + '</strong>'
        : 'No seats selected yet';
}

// =================== BOOKING ===================
async function handleBooking(e) {
    e.preventDefault();

    const session = getSession();
    if (!session) {
        showToast('Please login to book a ticket.');
        showSection('auth');
        return;
    }

    clearInterval(timer);
    timer = null;

    const routeEl   = document.getElementById('route');
    const route     = routeEl.value;
    const routeLabel = routeEl.options[routeEl.selectedIndex].text.split(' (')[0];
    const type      = document.getElementById('ticketType').value;
    const count     = parseInt(document.getElementById('ticketCount').value);
    const date      = document.getElementById('travelDate').value;
    const time      = document.getElementById('travelTime').value;
    const price     = routes[route] || 0;
    const total     = price * (type === 'roundway' ? 2 : 1) * count;
    const ticketType = type === 'roundway' ? 'Round Way' : 'One Way';

    const btn = document.getElementById('bookBtn');
    setLoading(btn, true);

    const res = await apiFetch('api/bookings.php', {
        action: 'create',
        route,
        routeLabel,
        ticketType,
        date,
        time,
        seats: [...selectedSeats],
        count,
        total,
    });

    setLoading(btn, false);

    if (!res.success) {
        showToast(res.message || 'Booking failed. Please try again.');
        // Reload seats in case of conflict
        await loadBookedSeats();
        return;
    }

    const booking = res.booking;
    currentBooking = booking;

    // Mark seats as booked in local map
    selectedSeats.forEach(s => { seats[s - 1] = 'booked'; });
    selectedSeats = [];
    renderSeatMap();

    // Show confirmation modal
    document.getElementById('confirmRef').textContent       = booking.id;
    document.getElementById('confirmPassenger').textContent = booking.userName;
    document.getElementById('confirmRoute').textContent     = booking.routeLabel;
    document.getElementById('confirmDateTime').textContent  = `${booking.date} at ${booking.time}`;
    document.getElementById('confirmSeats').textContent     = booking.seats.join(', ');
    document.getElementById('confirmTotal').textContent     = booking.total + ' BDT';
    document.getElementById('confirmationModal').classList.add('show');

    document.getElementById('timer').innerText = 'Hold Time: 2:00';
}

// =================== CLOSE MODAL ===================
function closeModal() {
    document.getElementById('confirmationModal').classList.remove('show');
    document.getElementById('bookingForm').reset();
    document.getElementById('totalAmount').innerText = '0 BDT';
    ['summaryRoute','summaryTicketType','summaryDateTime','summaryTickets','summarySeats']
        .forEach(id => { document.getElementById(id).innerText = '-'; });
    document.getElementById('timer').innerText = 'Hold Time: 2:00';
    document.getElementById('bookBtn').disabled = true;
    document.getElementById('bookBtn').classList.remove('active');
    // Reset seat map fully
    serverBookedSeats = [];
    seats = Array(40).fill('available');
    selectedSeats = [];
    renderSeatMap();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCancelModal() {
    document.getElementById('cancelConfirmModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
    const confModal = document.getElementById('confirmationModal');
    if (confModal) confModal.addEventListener('click', e => { if (e.target === confModal) closeModal(); });

    const termsModal = document.getElementById('termsAgreementModal');
    if (termsModal) termsModal.addEventListener('click', e => { if (e.target === termsModal) declineTerms(); });

    const cancelModal = document.getElementById('cancelConfirmModal');
    if (cancelModal) cancelModal.addEventListener('click', e => { if (e.target === cancelModal) closeCancelModal(); });

    const refundModal = document.getElementById('refundModal');
    if (refundModal) refundModal.addEventListener('click', e => { if (e.target === refundModal) closeRefundModal(); });
});

// =================== MY TICKETS ===================
async function loadMyTickets() {
    const session = getSession();
    if (!session) return;

    const container = document.getElementById('myTicketsList');
    container.innerHTML = `
        <div class="tickets-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading your tickets...</p>
        </div>`;

    const res = await apiFetch('api/bookings.php', { action: 'list' }, 'GET');

    if (!res.success) {
        container.innerHTML = `<div class="no-tickets"><i class="fas fa-exclamation-circle"></i><p>${res.message || 'Failed to load tickets.'}</p></div>`;
        return;
    }

    const bookings = res.bookings || [];

    if (bookings.length === 0) {
        container.innerHTML = `
            <div class="no-tickets">
                <i class="fas fa-ticket-alt"></i>
                <p>You haven't booked any tickets yet.</p>
                <button class="cta-btn" onclick="showSection('home'); document.querySelector('[data-section=home]').classList.add('active');">
                    <i class="fas fa-bus"></i> Book Now
                </button>
            </div>`;
        return;
    }

    container.innerHTML = bookings.map(b => {
        const bookedDate = new Date(b.bookedAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        return `
        <div class="ticket-card ${b.status}">
            <div class="ticket-card-header">
                <span class="ticket-ref">#${b.id}</span>
                <span class="ticket-status ${b.status}">
                    ${b.status === 'confirmed'
                        ? '<i class="fas fa-check-circle"></i> Confirmed'
                        : '<i class="fas fa-times-circle"></i> Cancelled'}
                </span>
            </div>
            <div class="ticket-card-body">
                <div class="ticket-info-row">
                    <div class="ticket-info-item">
                        <span class="info-label"><i class="fas fa-route"></i> Route</span>
                        <span class="info-value">${b.routeLabel}</span>
                    </div>
                    <div class="ticket-info-item">
                        <span class="info-label"><i class="fas fa-exchange-alt"></i> Type</span>
                        <span class="info-value">${b.ticketType}</span>
                    </div>
                </div>
                <div class="ticket-info-row">
                    <div class="ticket-info-item">
                        <span class="info-label"><i class="fas fa-calendar"></i> Travel Date</span>
                        <span class="info-value">${b.date} at ${b.time}</span>
                    </div>
                    <div class="ticket-info-item">
                        <span class="info-label"><i class="fas fa-chair"></i> Seat(s)</span>
                        <span class="info-value">${b.seats.join(', ')}</span>
                    </div>
                </div>
                <div class="ticket-info-row">
                    <div class="ticket-info-item">
                        <span class="info-label"><i class="fas fa-money-bill-wave"></i> Total Paid</span>
                        <span class="info-value">${b.total} BDT</span>
                    </div>
                    <div class="ticket-info-item">
                        <span class="info-label"><i class="fas fa-clock"></i> Booked On</span>
                        <span class="info-value">${bookedDate}</span>
                    </div>
                </div>
            </div>
            ${b.status === 'confirmed' ? `
            <div class="ticket-card-footer">
                <button class="btn-download-sm" onclick="downloadExistingTicket('${b.id}')">
                    <i class="fas fa-download"></i> Download Ticket
                </button>
                <button class="btn-cancel" onclick="confirmCancelTicket('${b.id}')">
                    <i class="fas fa-times"></i> Cancel Ticket
                </button>
            </div>` : ''}
        </div>`;
    }).join('');

    // Cache bookings for PDF downloads
    window._cachedBookings = bookings;
}

// =================== CANCELLATION ===================
function confirmCancelTicket(bookingId) {
    document.getElementById('cancelBookingId').value = bookingId;
    document.getElementById('cancelConfirmModal').classList.add('show');
}

async function proceedCancelTicket() {
    const bookingId = document.getElementById('cancelBookingId').value;

    const btn = document.querySelector('#cancelConfirmModal .btn-danger');
    setLoading(btn, true);

    const res = await apiFetch('api/bookings.php', { action: 'cancel', bookingId });
    setLoading(btn, false);

    if (!res.success) {
        showToast(res.message || 'Cancellation failed.');
        return;
    }

    document.getElementById('cancelConfirmModal').classList.remove('show');
    await loadMyTickets();

    // Show refund popup
    const refund = res.refund;
    document.getElementById('refundBookingRef').textContent = 'Booking Ref: #' + bookingId;
    document.getElementById('refundAmount').textContent     = refund.amount + ' BDT';
    document.getElementById('refundBreakdown').textContent  = refund.breakdown;
    document.getElementById('refundNote').textContent       = refund.note;
    document.getElementById('refundTimeline').textContent   = refund.timeline;
    document.getElementById('refundModal').classList.add('show');
}

function closeRefundModal() {
    document.getElementById('refundModal').classList.remove('show');
}

// =================== DOWNLOAD TICKET (from My Tickets) ===================
function downloadExistingTicket(bookingId) {
    const cached = (window._cachedBookings || []).find(b => b.id === bookingId);
    if (cached) {
        currentBooking = cached;
        downloadTicketPDF();
    } else {
        showToast('Booking not found.');
    }
}

// =================== TOAST ===================
function showToast(message) {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: #333; color: white; padding: 12px 24px; border-radius: 50px;
            font-size: 0.9rem; font-family: 'Poppins', sans-serif; z-index: 9999;
            box-shadow: 0 6px 20px rgba(0,0,0,0.2); transition: opacity 0.4s ease;
            white-space: nowrap;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// =================== PDF GENERATION ===================
// (Unchanged – client-side jsPDF, no API calls needed)
function downloadTicketPDF() {
    if (!currentBooking) { showToast('No booking data found.'); return; }
    if (!window.jspdf)   { showToast('PDF library not loaded. Please refresh.'); return; }

    const { jsPDF } = window.jspdf;
    const b = currentBooking;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [200, 88] });
    const W = 200, H = 88;

    doc.setFillColor(255, 240, 245);
    doc.rect(0, 0, W, H, 'F');

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(4, 4, 128, H - 8, 5, 5, 'F');

    doc.setFillColor(248, 184, 208);
    doc.roundedRect(137, 4, 59, H - 8, 5, 5, 'F');

    doc.setDrawColor(232, 130, 159);
    doc.setLineWidth(0.4);
    doc.setLineDash([1.5, 2], 0);
    doc.line(133, 6, 133, H - 6);
    doc.setLineDash([], 0);

    doc.setFillColor(248, 184, 208);
    doc.roundedRect(4, 4, 128, 16, 5, 0, 'F');
    doc.rect(4, 13, 128, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('BusGo', 10, 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('BOARDING PASS', 85, 14);

    doc.setFontSize(5.5);
    doc.setTextColor(255, 200, 220);
    doc.text('by SubTech Limited', 10, 19);

    const parts = b.routeLabel.split(' \u2192 ');
    const from  = parts[0] || 'Dhaka';
    const to    = parts[1] || '';

    doc.setFontSize(6.5);
    doc.setTextColor(180, 130, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('FROM', 10, 28);
    doc.text('TO', 78, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(34, 34, 34);
    doc.text(from, 10, 37);
    doc.text(to,   78, 37);

    doc.setFontSize(9);
    doc.setTextColor(248, 184, 208);
    doc.text('- - ->', 53, 37);

    doc.setDrawColor(240, 205, 218);
    doc.setLineWidth(0.3);
    doc.line(10, 41, 126, 41);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(170, 130, 150);
    doc.text('PASSENGER', 10, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(34, 34, 34);
    doc.text(b.userName, 10, 54);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(170, 130, 150);
    doc.text('DATE', 78, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(34, 34, 34);
    doc.text(b.date, 78, 54);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(170, 130, 150);
    doc.text('TIME', 10, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(34, 34, 34);
    doc.text(b.time, 10, 67.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(170, 130, 150);
    doc.text('TYPE', 50, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(34, 34, 34);
    doc.text(b.ticketType, 50, 67.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(170, 130, 150);
    doc.text('TOTAL', 90, 61);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(34, 34, 34);
    doc.text(b.total + ' BDT', 90, 67.5);

    doc.setDrawColor(240, 205, 218);
    doc.line(10, 71, 126, 71);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(180, 150, 165);
    doc.text('Please carry this printed copy as your ticket. This ticket is non-transferable.', 10, 76.5);
    doc.text('Arrive at the counter before boarding time to avoid cancellation.', 10, 81);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(232, 130, 159);
    doc.text('SEAT(S)', 145, 16);

    const seatStr = b.seats.join(', ');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(seatStr.length > 5 ? 13 : 20);
    doc.setTextColor(34, 34, 34);
    doc.text(seatStr, 145, 32);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.line(141, 38, 191, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(232, 130, 159);
    doc.text('BOOKING REF', 145, 45);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(34, 34, 34);
    doc.text('#' + b.id, 145, 53.5);

    doc.setDrawColor(255, 255, 255);
    doc.line(141, 58, 191, 58);

    const barData = [2,1,3,1,2,2,1,3,1,2,1,3,2,1,2,1,3,1,2,1];
    let bx = 143;
    barData.forEach((w, i) => {
        if (i % 2 === 0) {
            doc.setFillColor(232, 130, 159);
            doc.rect(bx, 62, w * 0.7, 14, 'F');
        }
        bx += w * 0.7 + 0.5;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text('VALID TICKET', 151, 81);

    doc.save('BusGo_Ticket_' + b.id + '.pdf');
    showToast('Ticket PDF downloaded successfully!');
}
