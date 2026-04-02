// ============================================================
// MoodObserver — Payment & Booking Backend (payment.js)
// Include this script in index.html before </body>
// ============================================================

// ============================================================
// SIMULATED BACKEND API
// Stores data in localStorage as if it were a real DB
// ============================================================
const Backend = {
  // Save booking with payment info
  createBooking(data) {
    const id = 'MO-' + Date.now().toString(36).toUpperCase()
    const record = { ...data, id, status: 'confirmed', createdAt: new Date().toISOString() }
    const all = JSON.parse(localStorage.getItem('mo_bookings_v2') || '[]')
    all.push(record)
    localStorage.setItem('mo_bookings_v2', JSON.stringify(all))
    return record
  },

  // Get all bookings
  getBookings() {
    return JSON.parse(localStorage.getItem('mo_bookings_v2') || '[]')
  },

  // Simulate payment processing (fake API call)
  async processPayment({ method, amount, details }) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 95% success rate
        if (Math.random() < 0.95) {
          resolve({
            success: true,
            transactionId: 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            method,
            amount,
            timestamp: new Date().toISOString()
          })
        } else {
          reject(new Error('Payment declined. Please try again or use a different method.'))
        }
      }, 2200 + Math.random() * 800)
    })
  }
}

// ============================================================
// PAYMENT MODAL HTML
// ============================================================
const PAYMENT_MODAL_HTML = `
<div id="paymentOverlay" style="
  display:none;
  position:fixed;inset:0;z-index:9000;
  background:rgba(0,0,0,0.75);
  backdrop-filter:blur(8px);
  align-items:center;justify-content:center;
  padding:20px;
  overflow-y:auto;
">
<div id="paymentModal" style="
  width:100%;max-width:520px;
  background:#13151e;
  border:1px solid rgba(255,255,255,0.1);
  border-radius:24px;
  overflow:hidden;
  animation:pmIn 0.35s cubic-bezier(.23,1,.32,1) both;
  margin:auto;
  position:relative;
">

<!-- Step 1: Order Summary + Payment Method -->
<div id="pmStep1">
  <!-- Header -->
  <div style="padding:24px 28px 0;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7090;margin-bottom:4px;">Secure Checkout</div>
      <div style="font-family:'DM Serif Display',serif;font-size:22px;color:#e8eaf2;">Complete Payment</div>
    </div>
    <button onclick="closePaymentModal()" style="
      width:36px;height:36px;border-radius:50%;
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
      color:#6b7090;font-size:18px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all 0.2s;
    " onmouseover="this.style.background='rgba(255,255,255,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">×</button>
  </div>

  <!-- Order Summary -->
  <div style="margin:20px 28px 0;padding:16px 18px;background:#1a1d2a;border-radius:14px;border:1px solid rgba(255,255,255,0.07);">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6b7090;margin-bottom:12px;">Order Summary</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
      <div>
        <div style="font-size:15px;font-weight:600;color:#e8eaf2;" id="pm-pkg-name">—</div>
        <div style="font-size:12px;color:#6b7090;margin-top:2px;" id="pm-pkg-desc">—</div>
      </div>
      <div style="font-family:'DM Serif Display',serif;font-size:20px;color:#5ce6b5;" id="pm-pkg-price">—</div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div id="pm-patient-name" style="font-size:13px;color:#6b7090;"></div>
        <div id="pm-appt-time" style="font-size:13px;color:#6b7090;"></div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#6b7090;">Total</div>
        <div style="font-size:18px;font-weight:700;color:#e8eaf2;" id="pm-total">—</div>
      </div>
    </div>
  </div>

  <!-- Payment Method Tabs -->
  <div style="padding:20px 28px 0;">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6b7090;margin-bottom:14px;">Payment Method</div>
    <div style="display:flex;gap:8px;margin-bottom:20px;" id="pmMethodTabs">
      <button class="pm-tab active" data-method="upi" onclick="switchPayMethod('upi')" style="
        flex:1;padding:10px 6px;border-radius:10px;
        background:rgba(124,106,247,0.15);border:1px solid #7c6af7;
        color:#a78bfa;font-size:13px;font-weight:600;cursor:pointer;
        font-family:'DM Sans',sans-serif;transition:all 0.2s;
      ">📱 UPI</button>
      <button class="pm-tab" data-method="card" onclick="switchPayMethod('card')" style="
        flex:1;padding:10px 6px;border-radius:10px;
        background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
        color:#6b7090;font-size:13px;font-weight:600;cursor:pointer;
        font-family:'DM Sans',sans-serif;transition:all 0.2s;
      ">💳 Card</button>
      <button class="pm-tab" data-method="netbanking" onclick="switchPayMethod('netbanking')" style="
        flex:1;padding:10px 6px;border-radius:10px;
        background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
        color:#6b7090;font-size:13px;font-weight:600;cursor:pointer;
        font-family:'DM Sans',sans-serif;transition:all 0.2s;
      ">🏦 Net Banking</button>
    </div>

    <!-- UPI Panel -->
    <div id="pmUpi" class="pm-panel">
      <div style="margin-bottom:12px;">
        <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7090;display:block;margin-bottom:6px;">UPI ID</label>
        <input id="pm-upi-id" placeholder="yourname@upi" style="
          width:100%;padding:12px 14px;
          background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
          border-radius:10px;color:#e8eaf2;font-family:'DM Sans',sans-serif;font-size:14px;
          outline:none;transition:border-color 0.2s;
        " onfocus="this.style.borderColor='#7c6af7'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
        <span onclick="setUpiQuick('gpay')" style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:12px;cursor:pointer;color:#6b7090;transition:all 0.2s;" onmouseover="this.style.color='#e8eaf2'" onmouseout="this.style.color='#6b7090'">Google Pay</span>
        <span onclick="setUpiQuick('phonepe')" style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:12px;cursor:pointer;color:#6b7090;transition:all 0.2s;" onmouseover="this.style.color='#e8eaf2'" onmouseout="this.style.color='#6b7090'">PhonePe</span>
        <span onclick="setUpiQuick('paytm')" style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:12px;cursor:pointer;color:#6b7090;transition:all 0.2s;" onmouseover="this.style.color='#e8eaf2'" onmouseout="this.style.color='#6b7090'">Paytm</span>
        <span onclick="setUpiQuick('bhim')" style="padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:12px;cursor:pointer;color:#6b7090;transition:all 0.2s;" onmouseover="this.style.color='#e8eaf2'" onmouseout="this.style.color='#6b7090'">BHIM</span>
      </div>
    </div>

    <!-- Card Panel -->
    <div id="pmCard" class="pm-panel" style="display:none;">
      <div style="margin-bottom:12px;">
        <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7090;display:block;margin-bottom:6px;">Card Number</label>
        <input id="pm-card-num" placeholder="1234 5678 9012 3456" maxlength="19" oninput="formatCardNum(this)" style="
          width:100%;padding:12px 14px;
          background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
          border-radius:10px;color:#e8eaf2;font-family:'DM Sans',sans-serif;font-size:14px;
          outline:none;transition:border-color 0.2s;letter-spacing:2px;
        " onfocus="this.style.borderColor='#7c6af7'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
        <div style="grid-column:span 1;">
          <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7090;display:block;margin-bottom:6px;">Expiry</label>
          <input id="pm-card-exp" placeholder="MM/YY" maxlength="5" oninput="formatExpiry(this)" style="
            width:100%;padding:12px 14px;
            background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;color:#e8eaf2;font-family:'DM Sans',sans-serif;font-size:14px;
            outline:none;transition:border-color 0.2s;
          " onfocus="this.style.borderColor='#7c6af7'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
        </div>
        <div style="grid-column:span 1;">
          <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7090;display:block;margin-bottom:6px;">CVV</label>
          <input id="pm-card-cvv" placeholder="•••" maxlength="4" type="password" style="
            width:100%;padding:12px 14px;
            background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
            border-radius:10px;color:#e8eaf2;font-family:'DM Sans',sans-serif;font-size:14px;
            outline:none;transition:border-color 0.2s;
          " onfocus="this.style.borderColor='#7c6af7'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
        </div>
        <div style="grid-column:span 1;">
          <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7090;display:block;margin-bottom:6px;">Type</label>
          <div id="pm-card-type" style="padding:12px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#6b7090;font-size:13px;min-height:45px;display:flex;align-items:center;">Auto detect</div>
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#6b7090;display:block;margin-bottom:6px;">Name on Card</label>
        <input id="pm-card-name" placeholder="As printed on card" style="
          width:100%;padding:12px 14px;
          background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
          border-radius:10px;color:#e8eaf2;font-family:'DM Sans',sans-serif;font-size:14px;
          outline:none;transition:border-color 0.2s;
        " onfocus="this.style.borderColor='#7c6af7'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
      </div>
    </div>

    <!-- Net Banking Panel -->
    <div id="pmNetbanking" class="pm-panel" style="display:none;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;" id="bankGrid"></div>
    </div>
  </div>

  <!-- Error message -->
  <div id="pmError" style="
    display:none;margin:16px 28px 0;padding:10px 14px;
    background:rgba(247,106,106,0.1);border:1px solid rgba(247,106,106,0.25);
    border-radius:10px;color:#f76a6a;font-size:13px;font-weight:500;
  "></div>

  <!-- Pay button -->
  <div style="padding:20px 28px 24px;">
    <button id="pmPayBtn" onclick="initiatePayment()" style="
      width:100%;padding:15px;
      background:linear-gradient(135deg,#7c6af7,#a78bfa);
      border:none;border-radius:14px;
      color:white;font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;
      cursor:pointer;transition:all 0.25s;
      display:flex;align-items:center;justify-content:center;gap:10px;
    " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 30px rgba(124,106,247,0.45)'"
       onmouseout="this.style.transform='none';this.style.boxShadow='none'">
      <span id="pmPayBtnText">🔒 Pay Now</span>
    </button>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;">
      <span style="font-size:11px;color:#6b7090;">🔐 256-bit SSL encrypted</span>
      <span style="color:#6b7090;font-size:11px;">•</span>
      <span style="font-size:11px;color:#6b7090;">RBI compliant</span>
      <span style="color:#6b7090;font-size:11px;">•</span>
      <span style="font-size:11px;color:#6b7090;">Instant confirmation</span>
    </div>
  </div>
</div>

<!-- Step 2: Processing -->
<div id="pmStep2" style="display:none;padding:60px 28px;text-align:center;">
  <div id="pmSpinner" style="
    width:64px;height:64px;border-radius:50%;
    border:3px solid rgba(124,106,247,0.2);
    border-top-color:#7c6af7;
    animation:spin 0.9s linear infinite;
    margin:0 auto 24px;
  "></div>
  <div style="font-family:'DM Serif Display',serif;font-size:22px;color:#e8eaf2;margin-bottom:8px;">Processing Payment</div>
  <div style="color:#6b7090;font-size:14px;" id="pmProcessingMsg">Connecting to payment gateway...</div>
  <div style="margin-top:20px;display:flex;justify-content:center;gap:6px;" id="pmProcessingDots">
    <div style="width:8px;height:8px;border-radius:50%;background:#7c6af7;animation:pmDot 1.2s infinite 0s"></div>
    <div style="width:8px;height:8px;border-radius:50%;background:#7c6af7;animation:pmDot 1.2s infinite 0.2s"></div>
    <div style="width:8px;height:8px;border-radius:50%;background:#7c6af7;animation:pmDot 1.2s infinite 0.4s"></div>
  </div>
</div>

<!-- Step 3: Success -->
<div id="pmStep3" style="display:none;padding:40px 28px;text-align:center;">
  <div style="
    width:72px;height:72px;border-radius:50%;
    background:rgba(92,230,181,0.15);border:2px solid #5ce6b5;
    display:flex;align-items:center;justify-content:center;
    font-size:32px;margin:0 auto 20px;
    animation:successPop 0.5s cubic-bezier(.23,1,.32,1) both;
  ">✓</div>
  <div style="font-family:'DM Serif Display',serif;font-size:26px;color:#5ce6b5;margin-bottom:8px;">Payment Successful!</div>
  <div style="color:#6b7090;font-size:14px;margin-bottom:24px;">Your appointment has been confirmed.</div>

  <div style="background:#1a1d2a;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px 18px;text-align:left;margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6b7090;margin-bottom:12px;">Booking Confirmation</div>
    <div id="pmConfirmDetails"></div>
  </div>

  <button onclick="closePaymentModal()" style="
    width:100%;padding:13px;
    background:rgba(92,230,181,0.12);border:1px solid rgba(92,230,181,0.3);
    border-radius:14px;color:#5ce6b5;
    font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;
    cursor:pointer;transition:all 0.2s;
  " onmouseover="this.style.background='rgba(92,230,181,0.2)'" onmouseout="this.style.background='rgba(92,230,181,0.12)'">
    Done — Back to App
  </button>
</div>

<!-- Step 4: Failure -->
<div id="pmStep4" style="display:none;padding:40px 28px;text-align:center;">
  <div style="
    width:72px;height:72px;border-radius:50%;
    background:rgba(247,106,106,0.12);border:2px solid #f76a6a;
    display:flex;align-items:center;justify-content:center;
    font-size:32px;margin:0 auto 20px;
  ">✕</div>
  <div style="font-family:'DM Serif Display',serif;font-size:24px;color:#f76a6a;margin-bottom:8px;">Payment Failed</div>
  <div style="color:#6b7090;font-size:14px;margin-bottom:24px;" id="pmFailMsg">Something went wrong.</div>
  <button onclick="retryPayment()" style="
    width:100%;padding:13px;margin-bottom:10px;
    background:linear-gradient(135deg,#7c6af7,#a78bfa);
    border:none;border-radius:14px;color:white;
    font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;
    cursor:pointer;transition:all 0.2s;
  ">Try Again →</button>
  <button onclick="closePaymentModal()" style="
    width:100%;padding:13px;
    background:transparent;border:1px solid rgba(255,255,255,0.1);
    border-radius:14px;color:#6b7090;
    font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;
    cursor:pointer;transition:all 0.2s;
  ">Cancel</button>
</div>

</div><!-- /paymentModal -->
</div><!-- /paymentOverlay -->

<style>
@keyframes pmIn { from{opacity:0;transform:translateY(30px) scale(0.96)} to{opacity:1;transform:none} }
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pmDot { 0%,60%,100%{transform:translateY(0);opacity:0.3} 30%{transform:translateY(-8px);opacity:1} }
@keyframes successPop { from{opacity:0;transform:scale(0.4)} to{opacity:1;transform:scale(1)} }
</style>
`

// ============================================================
// BANKS
// ============================================================
const BANKS = [
  { name: 'SBI', icon: '🏛' },
  { name: 'HDFC', icon: '💙' },
  { name: 'ICICI', icon: '🔷' },
  { name: 'Axis', icon: '🏦' },
  { name: 'Kotak', icon: '🔴' },
  { name: 'Yes Bank', icon: '🟡' },
  { name: 'PNB', icon: '🟠' },
  { name: 'Canara', icon: '🌿' }
]

// ============================================================
// STATE
// ============================================================
let payState = {
  currentMethod: 'upi',
  selectedBank: null,
  bookingData: null,
  pendingTxn: null
}

// ============================================================
// INIT — inject modal into DOM
// ============================================================
function initPaymentSystem() {
  if (document.getElementById('paymentOverlay')) return
  document.body.insertAdjacentHTML('beforeend', PAYMENT_MODAL_HTML)

  // Build bank grid
  const grid = document.getElementById('bankGrid')
  if (grid) {
    BANKS.forEach(b => {
      const el = document.createElement('div')
      el.setAttribute('data-bank', b.name)
      el.innerHTML = `<span style="font-size:16px">${b.icon}</span> ${b.name}`
      el.style.cssText = `
        padding:11px 14px;background:rgba(255,255,255,0.04);
        border:1px solid rgba(255,255,255,0.1);border-radius:10px;
        font-size:13px;font-weight:500;color:#6b7090;cursor:pointer;
        display:flex;align-items:center;gap:8px;transition:all 0.2s;
      `
      el.addEventListener('click', () => selectBank(b.name, el))
      grid.appendChild(el)
    })
  }

  // Close on overlay click
  document.getElementById('paymentOverlay').addEventListener('click', e => {
    if (e.target.id === 'paymentOverlay') closePaymentModal()
  })
}

// ============================================================
// OPEN PAYMENT MODAL
// ============================================================
function openPaymentModal(bookingData) {
  initPaymentSystem()
  payState.bookingData = bookingData
  payState.currentMethod = 'upi'

  // Populate summary
  document.getElementById('pm-pkg-name').textContent = bookingData.pkg
  document.getElementById('pm-pkg-desc').textContent = bookingData.pkgDesc || ''
  document.getElementById('pm-pkg-price').textContent = '₹' + bookingData.price
  document.getElementById('pm-total').textContent = '₹' + bookingData.price
  document.getElementById('pm-patient-name').textContent = '👤 ' + bookingData.name
  document.getElementById('pm-appt-time').textContent = '📅 ' + bookingData.date + ' at ' + bookingData.time

  // Reset to step 1
  showPmStep(1)
  switchPayMethod('upi')

  const overlay = document.getElementById('paymentOverlay')
  overlay.style.display = 'flex'
  setTimeout(() => {
    const modal = document.getElementById('paymentModal')
    if (modal) modal.style.animation = 'pmIn 0.35s cubic-bezier(.23,1,.32,1) both'
  }, 10)
}

function closePaymentModal() {
  const overlay = document.getElementById('paymentOverlay')
  if (overlay) overlay.style.display = 'none'
  clearPmError()
}

function showPmStep(n) {
  ;[1, 2, 3, 4].forEach(i => {
    const el = document.getElementById('pmStep' + i)
    if (el) el.style.display = i === n ? 'block' : 'none'
  })
}

// ============================================================
// PAYMENT METHOD SWITCHING
// ============================================================
function switchPayMethod(method) {
  payState.currentMethod = method
  clearPmError()

  // Update tab styles
  document.querySelectorAll('.pm-tab').forEach(tab => {
    const isActive = tab.dataset.method === method
    tab.style.background = isActive ? 'rgba(124,106,247,0.15)' : 'rgba(255,255,255,0.04)'
    tab.style.borderColor = isActive ? '#7c6af7' : 'rgba(255,255,255,0.1)'
    tab.style.color = isActive ? '#a78bfa' : '#6b7090'
  })

  // Show panel
  ;['upi', 'card', 'netbanking'].forEach(m => {
    const el = document.getElementById('pm' + m.charAt(0).toUpperCase() + m.slice(1))
    if (el) el.style.display = m === method ? 'block' : 'none'
  })
}

function setUpiQuick(app) {
  const placeholders = { gpay: 'name@okaxis', phonepe: 'number@ybl', paytm: 'number@paytm', bhim: 'name@upi' }
  document.getElementById('pm-upi-id').placeholder = placeholders[app] || 'yourname@upi'
  document.getElementById('pm-upi-id').focus()
}

function selectBank(name, el) {
  payState.selectedBank = name
  document.querySelectorAll('#bankGrid div').forEach(b => {
    b.style.borderColor = 'rgba(255,255,255,0.1)'
    b.style.background = 'rgba(255,255,255,0.04)'
    b.style.color = '#6b7090'
  })
  el.style.borderColor = '#7c6af7'
  el.style.background = 'rgba(124,106,247,0.12)'
  el.style.color = '#a78bfa'
}

function formatCardNum(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16)
  input.value = v.replace(/(.{4})/g, '$1 ').trim()

  // Detect card type
  const typeEl = document.getElementById('pm-card-type')
  if (typeEl) {
    if (/^4/.test(v)) typeEl.textContent = '💳 Visa'
    else if (/^5[1-5]/.test(v)) typeEl.textContent = '💳 Mastercard'
    else if (/^6/.test(v)) typeEl.textContent = '💳 RuPay'
    else if (/^3[47]/.test(v)) typeEl.textContent = '💳 Amex'
    else typeEl.textContent = 'Auto detect'
  }
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '')
  if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4)
  input.value = v
}

// ============================================================
// VALIDATION
// ============================================================
function validatePayment() {
  const method = payState.currentMethod
  if (method === 'upi') {
    const upi = document.getElementById('pm-upi-id').value.trim()
    if (!upi || !upi.includes('@')) return 'Please enter a valid UPI ID (e.g. name@upi)'
  } else if (method === 'card') {
    const num  = document.getElementById('pm-card-num').value.replace(/\s/g, '')
    const exp  = document.getElementById('pm-card-exp').value
    const cvv  = document.getElementById('pm-card-cvv').value
    const name = document.getElementById('pm-card-name').value.trim()
    if (num.length < 16) return 'Please enter a valid 16-digit card number'
    if (exp.length < 5) return 'Please enter a valid expiry date (MM/YY)'
    if (cvv.length < 3) return 'Please enter a valid CVV'
    if (!name) return 'Please enter the name on your card'
  } else if (method === 'netbanking') {
    if (!payState.selectedBank) return 'Please select your bank'
  }
  return null
}

function showPmError(msg) {
  const el = document.getElementById('pmError')
  if (el) { el.textContent = '⚠️ ' + msg; el.style.display = 'block' }
}

function clearPmError() {
  const el = document.getElementById('pmError')
  if (el) { el.textContent = ''; el.style.display = 'none' }
}

// ============================================================
// PAYMENT FLOW
// ============================================================
async function initiatePayment() {
  clearPmError()
  const err = validatePayment()
  if (err) { showPmError(err); return }

  const btn = document.getElementById('pmPayBtn')
  btn.disabled = true
  btn.style.opacity = '0.7'

  showPmStep(2)

  const msgs = [
    'Connecting to payment gateway...',
    'Verifying payment details...',
    'Awaiting bank confirmation...',
    'Almost there...'
  ]
  let mi = 0
  const interval = setInterval(() => {
    const el = document.getElementById('pmProcessingMsg')
    if (el) el.textContent = msgs[Math.min(mi++, msgs.length - 1)]
  }, 700)

  try {
    const result = await Backend.processPayment({
      method: payState.currentMethod,
      amount: payState.bookingData.price,
      details: getPaymentDetails()
    })

    clearInterval(interval)
    payState.pendingTxn = result

    // Save booking with payment confirmation
    const confirmed = Backend.createBooking({
      ...payState.bookingData,
      paymentMethod: payState.currentMethod,
      transactionId: result.transactionId,
      paidAt: result.timestamp
    })

    showConfirmation(confirmed, result)
  } catch (err) {
    clearInterval(interval)
    btn.disabled = false
    btn.style.opacity = '1'
    document.getElementById('pmFailMsg').textContent = err.message
    showPmStep(4)
  }
}

function getPaymentDetails() {
  const m = payState.currentMethod
  if (m === 'upi') return { upiId: document.getElementById('pm-upi-id').value }
  if (m === 'card') return { last4: document.getElementById('pm-card-num').value.replace(/\s/g, '').slice(-4) }
  if (m === 'netbanking') return { bank: payState.selectedBank }
  return {}
}

function showConfirmation(booking, txn) {
  const detailsEl = document.getElementById('pmConfirmDetails')
  const rows = [
    ['Booking ID', booking.id],
    ['Transaction ID', txn.transactionId],
    ['Patient', booking.name],
    ['Package', booking.pkg],
    ['Date & Time', booking.date + ' at ' + booking.time],
    ['Amount Paid', '₹' + booking.price],
    ['Payment Method', payState.currentMethod.toUpperCase()]
  ]
  detailsEl.innerHTML = rows.map(([k, v]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <span style="font-size:12px;color:#6b7090;">${k}</span>
      <span style="font-size:13px;font-weight:600;color:#e8eaf2;text-align:right;max-width:55%;">${v}</span>
    </div>`).join('')

  showPmStep(3)

  // Also update the main booking result on the page
  const br = document.getElementById('bookingResult')
  if (br) {
    br.className = 'booking-result success'
    br.innerHTML = `✅ <strong>${booking.name}</strong>'s appointment confirmed! Booking ID: <strong>${booking.id}</strong> · Txn: ${txn.transactionId}`
    br.style.display = 'block'
  }
}

function retryPayment() {
  showPmStep(1)
  const btn = document.getElementById('pmPayBtn')
  if (btn) { btn.disabled = false; btn.style.opacity = '1' }
}

// ============================================================
// OVERRIDE submitBooking from index.html
// ============================================================
function submitBooking() {
  const name  = document.getElementById('f-name').value.trim()
  const phone = document.getElementById('f-phone').value.trim()
  const date  = document.getElementById('f-date').value
  const time  = document.getElementById('f-time').value
  const pkg   = document.getElementById('f-package').value
  const result = document.getElementById('bookingResult')

  if (!name || !phone || !date || !time || !pkg) {
    result.className = 'booking-result error'
    result.textContent = '⚠️ Please fill in all required fields before proceeding to payment.'
    result.style.display = 'block'
    return
  }
  if (!/^\+?[\d\s\-]{8,15}$/.test(phone)) {
    result.className = 'booking-result error'
    result.textContent = '⚠️ Please enter a valid phone number.'
    result.style.display = 'block'
    return
  }

  result.style.display = 'none'

  // Parse price from selected package
  const priceMap = { 'Basic Support — ₹499': 499, 'Deep Therapy — ₹999': 999, 'Premium Healing — ₹1499': 1499 }
  const descMap  = { 'Basic Support — ₹499': '30-minute introductory session', 'Deep Therapy — ₹999': '60-minute focused session', 'Premium Healing — ₹1499': '90-minute in-depth session' }
  const price = priceMap[pkg] || 0
  const pkgName = pkg.split(' — ')[0]

  openPaymentModal({
    name,
    phone,
    email: document.getElementById('f-email').value.trim(),
    date,
    time,
    pkg: pkgName,
    pkgDesc: descMap[pkg] || '',
    price
  })
}

// Auto-init
document.addEventListener('DOMContentLoaded', initPaymentSystem)
if (document.readyState !== 'loading') initPaymentSystem()