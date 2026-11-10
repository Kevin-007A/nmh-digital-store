
const SUPABASE_URL = "https://wdcrskelhwnrzmlucxoi.supabase.co";

const SUPABASE_KEY = "sb_publishable_cecHLOKznBIQcu3YYEcPmA_ld8sPwJb";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const productList = document.querySelector("#productList");
const itemTotal = document.querySelector("#itemTotal");
const filters = document.querySelector("#filters");

const orderModal = document.querySelector("#orderModal");
const orderForm = document.querySelector("#orderForm");
const orderMessage = document.querySelector("#orderMessage");
const submitOrder = document.querySelector("#submitOrder");

let allProducts = [];
let selectedProduct = null;
let currentFilter = "all";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function formatPrice(price) {
  return "Ks" + Number(price).toLocaleString();
}

// LOAD PRODUCTS
async function loadProducts() {
  productList.textContent = "ပစ္စည်းများ ဖတ်နေပါတယ်...";

  const { data, error } = await db
    .from("products")
    .select("id,name,description,price,product_type,image_url")
    .eq("is_active", true)
    .order("id");

  if (error) {
    console.error(error);
    productList.textContent = "Database ချိတ်ဆက်မှု မအောင်မြင်ပါ။";
    return;
  }

  allProducts = data || [];

  itemTotal.textContent = `ပစ္စည်း ${allProducts.length} မျိုး`;

  renderProducts();
}

// RENDER PRODUCTS
function renderProducts() {
  const products = currentFilter === "all"
    ? allProducts
    : allProducts.filter(item => item.product_type === currentFilter);

  if (!products.length) {
    productList.textContent = "ပစ္စည်းမရှိသေးပါ။";
    return;
  }

  productList.innerHTML = products.map(item => {
    const image = item.image_url
      ? `<img src="${escapeHTML(item.image_url)}"
              alt="${escapeHTML(item.name)}"
              loading="lazy">`
      : "🎮";

    return `
      <div class="product-row">
        <div class="product-icon">${image}</div>

        <div class="product-info">
          <h3>${escapeHTML(item.name)}</h3>
          <p>${escapeHTML(item.description || "")}</p>
        </div>

        <div class="product-price">
          ${formatPrice(item.price)}
        </div>

        <button class="buy-button"
                type="button"
                data-product-id="${Number(item.id)}">
          ဝယ်မည်
        </button>
      </div>
    `;
  }).join("");
}

// FILTER BUTTONS
filters.addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  currentFilter = button.dataset.filter;

  filters.querySelectorAll(".filter").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  renderProducts();
});

// OPEN ORDER FORM
function openOrderForm(product) {
  selectedProduct = product;

  document.querySelector("#selectedProductName").textContent =
    product.name;

  document.querySelector("#selectedProductPrice").textContent =
    formatPrice(product.price);

  orderForm.reset();

  orderMessage.textContent = "";
  orderMessage.className = "order-message";

  submitOrder.disabled = false;
  submitOrder.textContent = "Order တင်မည်";

  orderModal.classList.add("active");
  orderModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  document.querySelector("#customerName").focus();
}

// CLOSE ORDER FORM
function closeOrderForm() {
  orderModal.classList.remove("active");
  orderModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");

  selectedProduct = null;
}

document.querySelector("#closeOrderModal")
  .addEventListener("click", closeOrderForm);

document.querySelector("#cancelOrder")
  .addEventListener("click", closeOrderForm);

orderModal.addEventListener("click", event => {
  if (event.target === orderModal) {
    closeOrderForm();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && orderModal.classList.contains("active")) {
    closeOrderForm();
  }
});

// BUY BUTTON
productList.addEventListener("click", event => {
  const button = event.target.closest(".buy-button");
  if (!button) return;

  const productId = Number(button.dataset.productId);

  const product = allProducts.find(item =>
    Number(item.id) === productId
  );

  if (!product) {
    showToast("ပစ္စည်းကို ရှာမတွေ့ပါ။");
    return;
  }

  openOrderForm(product);
});

// SUBMIT ORDER
orderForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!selectedProduct) {
    showToast("ပစ္စည်းကို ပြန်ရွေးချယ်ပါ။");
    return;
  }

  const customerName =
    document.querySelector("#customerName").value.trim();

  const customerPhone =
    document.querySelector("#customerPhone").value.trim();

  const playerId =
    document.querySelector("#playerId").value.trim();

  if (!customerName || !customerPhone || !playerId) {
    orderMessage.textContent = "အချက်အလက်အားလုံး ဖြည့်ပေးပါ။";
    orderMessage.className = "order-message error";
    return;
  }

  submitOrder.disabled = true;
  submitOrder.textContent = "Order ပို့နေပါတယ်...";

  orderMessage.textContent = "ခဏစောင့်ပေးပါ...";
  orderMessage.className = "order-message";

  try {
    const { data, error } = await db.functions.invoke(
      "create-order",
      {
        body: {
          product_id: selectedProduct.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          player_id: playerId
        }
      }
    );

    if (error) {
      console.error("Order function error:", error);
      throw new Error("Order ပို့မရပါ။ ပြန်လည်ကြိုးစားပေးပါ။");
    }

    if (!data || !data.success) {
      throw new Error(data?.error || "Order တင်မအောင်မြင်ပါ။");
    }

    orderMessage.textContent =
      `Order အောင်မြင်ပါသည်။ Order ID: ${data.order_id}`;

    orderMessage.className = "order-message success";

    submitOrder.textContent = "အောင်မြင်ပါပြီ ✓";

    showToast("Order အောင်မြင်ပါပြီ။");

    orderForm.reset();

    setTimeout(() => {
      closeOrderForm();
    }, 2500);

  } catch (error) {
    console.error(error);

    orderMessage.textContent =
      error.message || "အမှားတစ်ခု ဖြစ်ပွားခဲ့ပါတယ်။";

    orderMessage.className = "order-message error";

    submitOrder.disabled = false;
    submitOrder.textContent = "ထပ်မံကြိုးစားမည်";
  }
});

// MOBILE MENU
document.querySelector("#menuButton").addEventListener("click", () => {
  document.querySelector(".nav").classList.toggle("open");
});

// CLOSE MOBILE MENU
document.querySelectorAll(".nav a").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelector(".nav").classList.remove("open");
  });
});

// CART BUTTON
document.querySelector("#cartButton").addEventListener("click", () => {
  showToast("ဝယ်ယူရန် ပစ္စည်းတစ်ခုကို ရွေးပြီး ဝယ်မည် နှိပ်ပါ။");
});

// START
loadProducts();
