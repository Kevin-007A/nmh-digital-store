
const SUPABASE_URL = "https://wdcrskelhwnrzmlucxoi.supabase.co";
const SUPABASE_KEY = "sb_publishable_cecHLOKznBIQcu3YYEcPmA_ld8sPwJb";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// HTML Elements
const productForm = document.getElementById("productForm");
const saveProductForm = document.getElementById("saveProductForm");
const productList = document.getElementById("adminProductList");
const productCount = document.getElementById("productCount");

const addProductBtn = document.getElementById("addProductBtn");
const cancelProductBtn = document.getElementById("cancelProductBtn");
const logoutBtn = document.getElementById("logoutBtn");

const editProductId = document.getElementById("editProductId");
const productName = document.getElementById("productName");
const productDescription = document.getElementById("productDescription");
const productPrice = document.getElementById("productPrice");
const productType = document.getElementById("productType");
const productImage = document.getElementById("productImage");
const productImageFile = document.getElementById("productImageFile");
const productActive = document.getElementById("productActive");

const imagePreview = document.getElementById("imagePreview");
const imagePreviewBox = document.getElementById("imagePreviewBox");
const formMessage = document.getElementById("formMessage");
const saveProductBtn = document.getElementById("saveProductBtn");

let currentObjectUrl = null;
let categories = [];
let categorySelect;

// Helpers
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatMMK(amount) {
  return Number(amount || 0).toLocaleString("en-US") + " Ks";
}

function showMessage(message, color = "#334155") {
  formMessage.textContent = message;
  formMessage.style.color = color;
}

function showImagePreview(url) {
  if (!url) {
    imagePreview.src = "";
    imagePreviewBox.style.display = "none";
    return;
  }

  imagePreview.src = url;
  imagePreviewBox.style.display = "block";
}

function clearObjectUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

// Create Category Management UI automatically
function createCategoryUI() {
  if (document.getElementById("categoryManagement")) return;

  const style = document.createElement("style");

  style.textContent = `
    #categoryManagement {
      background: white;
      padding: 22px;
      border: 1px solid #e8edf5;
      border-radius: 14px;
      margin-bottom: 22px;
    }

    .category-section {
      margin-top: 18px;
    }

    .category-section h3 {
      font-size: 15px;
      margin-bottom: 10px;
    }

    .category-items {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
    }

    .category-item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 12px;
      background: #f1f5ff;
      border: 1px solid #dce7ff;
      border-radius: 9px;
      font-size: 13px;
    }

    .category-item button {
      border: none;
      border-radius: 5px;
      padding: 5px 7px;
      cursor: pointer;
      font-size: 11px;
    }

    .category-edit {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .category-delete {
      background: #fee2e2;
      color: #dc2626;
    }

    .category-add-row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      max-width: 430px;
    }

    .category-add-row input {
      flex: 1;
      min-width: 0;
      padding: 11px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }

    .category-add-row button {
      border: none;
      background: #2563eb;
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: bold;
    }

    #productCategory {
      width: 100%;
      padding: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: white;
      font-size: 14px;
    }
  `;

  document.head.appendChild(style);

  const section = document.createElement("section");

  section.id = "categoryManagement";

  section.innerHTML = `
    <h2 style="margin:0;">Category Management</h2>
    <p style="color:#64748b;font-size:13px;">
      Add, edit and delete product categories.
    </p>

    <div class="category-section">
      <h3>🎮 Game Categories</h3>
      <div id="gameCategoryList" class="category-items"></div>

      <div class="category-add-row">
        <input id="newGameCategory" placeholder="Game name e.g. MLBB">
        <button id="addGameCategory">+ Add</button>
      </div>
    </div>

    <div class="category-section">
      <h3>📱 Digital Service Categories</h3>
      <div id="digitalCategoryList" class="category-items"></div>

      <div class="category-add-row">
        <input id="newDigitalCategory" placeholder="Service e.g. Telegram">
        <button id="addDigitalCategory">+ Add</button>
      </div>
    </div>

    <p id="categoryMessage" style="font-size:13px;"></p>
  `;

  const adminProducts = document.querySelector(".admin-products");
  const productTitle = adminProducts.querySelector(".admin-title");

  productTitle.insertAdjacentElement("afterend", section);

  // Add category selector to existing product form
  const categoryLabel = document.createElement("label");
  categoryLabel.textContent = "Product Category";

  categorySelect = document.createElement("select");
  categorySelect.id = "productCategory";

  categoryLabel.appendChild(categorySelect);

  productType.insertAdjacentElement("afterend", categoryLabel);

  document.getElementById("addGameCategory")
    .addEventListener("click", () => addCategory("game"));

  document.getElementById("addDigitalCategory")
    .addEventListener("click", () => addCategory("digital"));
}

// Admin access
async function checkAdmin() {
  const { data: userData, error: userError } =
    await db.auth.getUser();

  if (userError || !userData.user) {
    window.location.href = "admin.html";
    return false;
  }

  const { data: adminData, error: adminError } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (adminError || !adminData) {
    await db.auth.signOut();
    window.location.href = "admin.html";
    return false;
  }

  return true;
}

// Load categories
async function loadCategories() {
  const { data, error } = await db
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    document.getElementById("categoryMessage").textContent =
      "Category ဖတ်မရပါ: " + error.message;
    return;
  }

  categories = data || [];

  renderCategories();
  updateCategorySelect();
}

// Render category lists
function renderCategories() {
  const gameList = document.getElementById("gameCategoryList");
  const digitalList = document.getElementById("digitalCategoryList");

  function makeCategoryHTML(item) {
    return `
      <div class="category-item">
        <strong>${escapeHTML(item.name)}</strong>

        <button
          class="category-edit"
          data-category-action="edit"
          data-id="${item.id}">
          Edit
        </button>

        <button
          class="category-delete"
          data-category-action="delete"
          data-id="${item.id}">
          Delete
        </button>
      </div>
    `;
  }

  gameList.innerHTML = categories
    .filter(item => item.category_type === "game")
    .map(makeCategoryHTML)
    .join("") || "<p>No game categories yet.</p>";

  digitalList.innerHTML = categories
    .filter(item => item.category_type === "digital")
    .map(makeCategoryHTML)
    .join("") || "<p>No digital categories yet.</p>";

  document.getElementById("categoryManagement")
    .querySelectorAll("button[data-category-action]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const item = categories.find(
          category => String(category.id) === button.dataset.id
        );

        if (!item) return;

        if (button.dataset.categoryAction === "edit") {
          editCategory(item);
        } else {
          deleteCategory(item);
        }
      });
    });
}

// Add category
async function addCategory(type) {
  const input = document.getElementById(
    type === "game" ? "newGameCategory" : "newDigitalCategory"
  );

  const name = input.value.trim();

  if (!name) {
    alert("Category နာမည်ထည့်ပါ။");
    return;
  }

  const { error } = await db
    .from("categories")
    .insert({
      name,
      category_type: type
    });

  if (error) {
    alert("Category ထည့်မရပါ: " + error.message);
    return;
  }

  input.value = "";

  await loadCategories();

  alert("Category အသစ် ထည့်ပြီးပါပြီ။");
}

// Edit category
async function editCategory(item) {
  const newName = prompt("Category နာမည်အသစ်ထည့်ပါ:", item.name);

  if (newName === null) return;

  if (!newName.trim()) {
    alert("Category နာမည်အလွတ်မဖြစ်ရပါ။");
    return;
  }

  const { error } = await db
    .from("categories")
    .update({ name: newName.trim() })
    .eq("id", item.id);

  if (error) {
    alert("ပြင်၍မရပါ: " + error.message);
    return;
  }

  await loadCategories();

  alert("Category ပြင်ပြီးပါပြီ။");
}

// Delete category
async function deleteCategory(item) {
  const confirmed = confirm(
    `"${item.name}" Category ကို ဖျက်မှာ သေချာပါသလား?\n\nဒီ Category နဲ့ ချိတ်ထားတဲ့ Product တွေမှာ Category မရှိတော့ပါ။`
  );

  if (!confirmed) return;

  const { error } = await db
    .from("categories")
    .delete()
    .eq("id", item.id);

  if (error) {
    alert("ဖျက်၍မရပါ: " + error.message);
    return;
  }

  await loadCategories();
  await loadAdminProducts();

  alert("Category ဖျက်ပြီးပါပြီ။");
}

// Update category dropdown according to product type
function updateCategorySelect(selectedId = "") {
  if (!categorySelect) return;

  const type = productType.value;

  const filtered = categories.filter(
    item => item.category_type === type
  );

  categorySelect.innerHTML =
    `<option value="">-- Select Category --</option>` +
    filtered.map(item => `
      <option value="${item.id}">
        ${escapeHTML(item.name)}
      </option>
    `).join("");

  categorySelect.value = selectedId ? String(selectedId) : "";
}

productType.addEventListener("change", () => {
  updateCategorySelect();
});

// Load products
async function loadAdminProducts() {
  productList.innerHTML = "Loading products...";

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    productList.textContent = "Product များ ဖတ်၍မရပါ။";
    return;
  }

  productCount.textContent = data.length;

  if (!data.length) {
    productList.textContent = "Product မရှိသေးပါ။";
    return;
  }

  const categoryMap = new Map(
    categories.map(item => [String(item.id), item.name])
  );

  productList.innerHTML = data.map(item => `
    <div class="admin-product-row">
      <div>
        <strong>${escapeHTML(item.name)}</strong>
        <p>${escapeHTML(item.description || "")}</p>
        <p>${formatMMK(item.price)}</p>

        <p>Category: ${
          escapeHTML(categoryMap.get(String(item.category_id)) || "မရွေးရသေး")
        }</p>

        ${item.image_url ? `
          <img
            src="${escapeHTML(item.image_url)}"
            alt=""
            style="width:65px;height:65px;object-fit:cover;border-radius:8px;"
          >
        ` : ""}
      </div>

      <div>${escapeHTML(item.product_type)}</div>

      <div class="${item.is_active ? "active-status" : "inactive-status"}">
        ${item.is_active ? "Active" : "Inactive"}
      </div>

      <div class="product-actions">
        <button class="edit-btn" data-action="edit" data-id="${item.id}">
          Edit
        </button>

        <button class="delete-btn" data-action="delete" data-id="${item.id}">
          Delete
        </button>
      </div>
    </div>
  `).join("");
}

// Open empty form
function openAddForm() {
  saveProductForm.reset();

  editProductId.value = "";
  productActive.checked = true;

  clearObjectUrl();
  showImagePreview("");

  document.getElementById("formTitle").textContent = "Add New Product";
  saveProductBtn.textContent = "Save Product";

  showMessage("");

  updateCategorySelect();

  productForm.style.display = "block";
  productName.focus();
}

// Close form
function closeForm() {
  productForm.style.display = "none";
  saveProductForm.reset();

  editProductId.value = "";

  clearObjectUrl();
  showImagePreview("");
  showMessage("");
  updateCategorySelect();
}

// Image selection
productImageFile.addEventListener("change", () => {
  const file = productImageFile.files[0];

  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    alert("JPG, PNG သို့မဟုတ် WEBP ပုံသာ ရွေးချယ်ပါ။");
    productImageFile.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("ပုံအရွယ်အစား 5MB ထက် မကျော်ရပါ။");
    productImageFile.value = "";
    return;
  }

  clearObjectUrl();

  currentObjectUrl = URL.createObjectURL(file);
  showImagePreview(currentObjectUrl);

  showMessage("ပုံ Preview အဆင်သင့်ဖြစ်ပါပြီ။", "#16a34a");
});

// Upload image
async function uploadProductImage(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const filePath =
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { data, error } = await db.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  const { data: publicData } = db.storage
    .from("product-images")
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

// Save product
saveProductForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = productName.value.trim();
  const description = productDescription.value.trim();
  const price = Number(productPrice.value);
  const type = productType.value;
  const isActive = productActive.checked;
  const categoryId = categorySelect.value
    ? Number(categorySelect.value)
    : null;

  if (!name) {
    showMessage("Product Name ထည့်ပါ။", "#dc2626");
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    showMessage("မှန်ကန်သော MMK Price ထည့်ပါ။", "#dc2626");
    return;
  }

  if (!categoryId) {
    showMessage("Product Category ရွေးချယ်ပါ။", "#dc2626");
    return;
  }

  saveProductBtn.disabled = true;
  saveProductBtn.textContent = "Saving...";

  try {
    let imageUrl = productImage.value.trim() || null;

    const selectedFile = productImageFile.files[0];

    if (selectedFile) {
      showMessage("ပုံ Upload လုပ်နေပါတယ်...");
      imageUrl = await uploadProductImage(selectedFile);
    }

    const productData = {
      name,
      description,
      price,
      product_type: type,
      category_id: categoryId,
      image_url: imageUrl,
      is_active: isActive
    };

    let result;

    if (editProductId.value) {
      result = await db
        .from("products")
        .update(productData)
        .eq("id", editProductId.value);
    } else {
      result = await db
        .from("products")
        .insert([productData]);
    }

    if (result.error) throw result.error;

    showMessage("Product သိမ်းဆည်းပြီးပါပြီ။", "#16a34a");

    await loadAdminProducts();
    closeForm();

  } catch (error) {
    console.error(error);

    showMessage(
      "သိမ်းဆည်းမှု မအောင်မြင်ပါ: " + error.message,
      "#dc2626"
    );

  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.textContent = editProductId.value
      ? "Update Product"
      : "Save Product";
  }
});

// Edit and Delete products
productList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {
    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert("Product အချက်အလက် ဖတ်မရပါ။");
      return;
    }

    openAddForm();

    document.getElementById("formTitle").textContent = "Edit Product";

    editProductId.value = data.id;
    productName.value = data.name;
    productDescription.value = data.description || "";
    productPrice.value = data.price;
    productType.value = data.product_type;
    productImage.value = data.image_url || "";
    productActive.checked = data.is_active;

    updateCategorySelect(data.category_id);

    productImageFile.value = "";
    showImagePreview(data.image_url || "");

    saveProductBtn.textContent = "Update Product";
    return;
  }

  if (action === "delete") {
    if (!confirm("ဒီ Product ကို ဖျက်မှာ သေချာပါသလား?")) return;

    const { error } = await db
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      alert("ဖျက်၍မရပါ: " + error.message);
      return;
    }

    alert("Product ဖျက်ပြီးပါပြီ။");
    await loadAdminProducts();
  }
});

// Buttons
addProductBtn.addEventListener("click", openAddForm);
cancelProductBtn.addEventListener("click", closeForm);

// Logout
logoutBtn.addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("Logout မအောင်မြင်ပါ: " + error.message);
    return;
  }

  window.location.href = "admin.html";
});

// Start Dashboard
async function startDashboard() {
  const allowed = await checkAdmin();

  if (!allowed) return;

  createCategoryUI();

  await loadCategories();
  await loadAdminProducts();
}

startDashboard();
