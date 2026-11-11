
const SUPABASE_URL = "https://wdcrskelhwnrzmlucxoi.supabase.co";
const SUPABASE_KEY = "sb_publishable_cecHLOKznBIQcu3YYEcPmA_ld8sPwJb";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let categories = [];
let products = [];
let editingCategoryId = null;

const $ = (id) => document.getElementById(id);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function money(value) {
  return "Ks " + Number(value || 0).toLocaleString("en-US");
}

function showMessage(message, success = false) {
  const box = $("formMessage");
  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.style.color = success ? "#16803c" : "#dc2626";
  box.style.display = "block";
}

function hideMessage() {
  const box = $("formMessage");
  if (box) {
    box.textContent = "";
    box.style.display = "none";
  }
}

/* =========================
   ADMIN AUTHENTICATION
========================= */

async function checkAdmin() {
  const { data: { user }, error } = await db.auth.getUser();

  if (error || !user) {
    location.href = "admin.html";
    return false;
  }

  const { data, error: adminError } = await db
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !data) {
    alert("Admin account မဟုတ်ပါ။");
    await db.auth.signOut();
    location.href = "admin.html";
    return false;
  }

  return true;
}

/* =========================
   CATEGORY MANAGEMENT UI
========================= */

function createCategoryUI() {
  const adminProducts = document.querySelector(".admin-products");
  const adminTitle = document.querySelector(".admin-title");

  if (!adminProducts || !adminTitle) {
    console.error("Category UI ထည့်ရန် .admin-products သို့မဟုတ် .admin-title မတွေ့ပါ။");
    return;
  }

  if ($("categoryManagement")) return;

  const section = document.createElement("section");
  section.id = "categoryManagement";
  section.style.cssText = `
    background:#fff;
    padding:20px;
    margin:20px 0;
    border-radius:14px;
    border:1px solid #e5e7eb;
  `;

  section.innerHTML = `
    <h2 style="margin:0 0 8px;font-size:20px;">Category Management</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 16px;">
      Category အသစ်ထည့်ပြီး Product များကို သက်ဆိုင်ရာ Category အောက်တွင် ထည့်နိုင်ပါသည်။
    </p>

    <form id="categoryForm" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <input
        id="categoryNameInput"
        type="text"
        placeholder="Category အမည် ထည့်ပါ"
        required
        maxlength="60"
        style="flex:1;min-width:180px;padding:12px;border:1px solid #d1d5db;border-radius:8px;"
      >
      <button
        type="submit"
        id="categorySaveButton"
        style="padding:11px 18px;background:#1769e8;color:white;border:0;border-radius:8px;cursor:pointer;"
      >Category ထည့်မယ်</button>
      <button
        type="button"
        id="categoryCancelButton"
        style="display:none;padding:11px 18px;background:#64748b;color:white;border:0;border-radius:8px;cursor:pointer;"
      >မလုပ်တော့ပါ</button>
    </form>

    <div id="categoryMessage" style="font-size:13px;margin-bottom:12px;"></div>
    <div id="categoryList"></div>
  `;

  adminTitle.insertAdjacentElement("afterend", section);

  $("categoryForm").addEventListener("submit", saveCategory);
  $("categoryCancelButton").addEventListener("click", cancelCategoryEdit);

  $("categoryList").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "edit") {
      editCategory(id);
    }

    if (action === "delete") {
      await deleteCategory(id);
    }

    if (action === "up") {
      await moveCategory(id, -1);
    }

    if (action === "down") {
      await moveCategory(id, 1);
    }
  });
}

function categoryMessage(message, success = false) {
  const box = $("categoryMessage");
  if (!box) return;

  box.textContent = message;
  box.style.color = success ? "#16803c" : "#dc2626";
}

function cancelCategoryEdit() {
  editingCategoryId = null;
  $("categoryNameInput").value = "";
  $("categorySaveButton").textContent = "Category ထည့်မယ်";
  $("categoryCancelButton").style.display = "none";
  categoryMessage("");
}

async function loadCategories() {
  const { data, error } = await db
    .from("categories")
    .select("id,name,category_type,display_order")
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Category loading error:", error);
    categoryMessage("Category များဖတ်မရပါ။ " + error.message);
    return;
  }

  categories = data || [];
  renderCategories();
  updateProductCategorySelect();
  loadAdminProducts();
}

function renderCategories() {
  const list = $("categoryList");
  if (!list) return;

  if (!categories.length) {
    list.innerHTML = `
      <p style="color:#64748b;font-size:14px;">Category မရှိသေးပါ။</p>
    `;
    return;
  }

  list.innerHTML = categories.map((category, index) => `
    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      flex-wrap:wrap;
      padding:12px;
      margin-bottom:8px;
      border:1px solid #e5e7eb;
      border-radius:9px;
    ">
      <div style="font-weight:600;">
        ${index + 1}. ${escapeHTML(category.name)}
      </div>

      <div style="display:flex;gap:5px;flex-wrap:wrap;">
        <button data-action="up" data-id="${category.id}"
          ${index === 0 ? "disabled" : ""}
          style="padding:7px 10px;border:0;border-radius:6px;cursor:pointer;">
          ↑
        </button>

        <button data-action="down" data-id="${category.id}"
          ${index === categories.length - 1 ? "disabled" : ""}
          style="padding:7px 10px;border:0;border-radius:6px;cursor:pointer;">
          ↓
        </button>

        <button data-action="edit" data-id="${category.id}"
          style="padding:7px 10px;background:#1769e8;color:white;border:0;border-radius:6px;cursor:pointer;">
          ပြင်မယ်
        </button>

        <button data-action="delete" data-id="${category.id}"
          style="padding:7px 10px;background:#dc2626;color:white;border:0;border-radius:6px;cursor:pointer;">
          ဖျက်မယ်
        </button>
      </div>
    </div>
  `).join("");
}

async function saveCategory(event) {
  event.preventDefault();

  const name = $("categoryNameInput").value.trim();
  if (!name) return;

  const saveButton = $("categorySaveButton");
  saveButton.disabled = true;

  let result;

  if (editingCategoryId) {
    result = await db
      .from("categories")
      .update({ name })
      .eq("id", editingCategoryId);
  } else {
    const maxOrder = categories.length
      ? Math.max(...categories.map(c => Number(c.display_order || 0)))
      : -1;

    // category_type သည် လက်ရှိ database constraint နှင့် ကိုက်ညီရန် game ထည့်ထားသည်။
    // Store ပေါ်တွင် Game / Digital အုပ်စုခွဲပြသခြင်း မရှိပါ။
    result = await db
      .from("categories")
      .insert({
        name,
        category_type: "game",
        display_order: maxOrder + 1
      });
  }

  saveButton.disabled = false;

  if (result.error) {
    if (result.error.code === "23505") {
      categoryMessage("ဒီ Category အမည် ရှိပြီးသားပါ။");
    } else {
      categoryMessage("သိမ်းဆည်းမရပါ။ " + result.error.message);
    }
    return;
  }

  cancelCategoryEdit();
  categoryMessage("Category သိမ်းဆည်းပြီးပါပြီ။", true);
  await loadCategories();
}

function editCategory(id) {
  const category = categories.find(c => Number(c.id) === id);
  if (!category) return;

  editingCategoryId = id;
  $("categoryNameInput").value = category.name;
  $("categorySaveButton").textContent = "ပြင်ဆင်သိမ်းမယ်";
  $("categoryCancelButton").style.display = "inline-block";
  $("categoryNameInput").focus();
}

async function deleteCategory(id) {
  const category = categories.find(c => Number(c.id) === id);
  if (!category) return;

  const confirmed = confirm(
    `"${category.name}" ကို ဖျက်မှာ သေချာပါသလား?\n\nဒီ Category နဲ့ ချိတ်ထားတဲ့ Product တွေမှာ Category မရှိတော့ပါ။`
  );

  if (!confirmed) return;

  const { error } = await db
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    categoryMessage("ဖျက်မရပါ။ " + error.message);
    return;
  }

  categoryMessage("Category ဖျက်ပြီးပါပြီ။", true);
  await loadCategories();
}

async function moveCategory(id, direction) {
  const index = categories.findIndex(c => Number(c.id) === id);
  const targetIndex = index + direction;

  if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) {
    return;
  }

  const reordered = [...categories];
  const temp = reordered[index];
  reordered[index] = reordered[targetIndex];
  reordered[targetIndex] = temp;

  for (let i = 0; i < reordered.length; i++) {
    const { error } = await db
      .from("categories")
      .update({ display_order: i + 1 })
      .eq("id", reordered[i].id);

    if (error) {
      categoryMessage("အစဉ်ပြောင်းမရပါ။ " + error.message);
      await loadCategories();
      return;
    }
  }

  await loadCategories();
}

/* =========================
   PRODUCT CATEGORY SELECT
========================= */

function updateProductCategorySelect(selectedId = null) {
  let select = $("productCategory");

  // HTML အဟောင်းတွင် Category select မရှိသေးပါက အလိုအလျောက်ထည့်ပေးမည်။
  if (!select) {
    const productType = $("productType");

    if (!productType) return;

    const wrapper = productType.parentElement;
    if (!wrapper) return;

    const field = document.createElement("div");
    field.style.marginTop = "12px";
    field.innerHTML = `
      <label for="productCategory" style="display:block;margin-bottom:6px;">
        Product Category
      </label>
      <select id="productCategory"
        style="width:100%;padding:11px;border:1px solid #d1d5db;border-radius:8px;">
      </select>
    `;

    wrapper.insertAdjacentElement("afterend", field);
    select = $("productCategory");
  }

  select.innerHTML = `
    <option value="">Category ရွေးပါ</option>
    ${categories.map(category => `
      <option value="${category.id}">
        ${escapeHTML(category.name)}
      </option>
    `).join("")}
  `;

  if (selectedId !== null && selectedId !== undefined) {
    select.value = String(selectedId);
  }
}

/* =========================
   PRODUCT IMAGE UPLOAD
========================= */

async function uploadProductImage() {
  const fileInput = $("productImageFile");
  const file = fileInput?.files?.[0];

  if (!file) {
    return $("productImage")?.value.trim() || null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Image ဖိုင်ကိုသာ ရွေးချယ်ပါ။");
  }

  const extension = file.name.split(".").pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const filePath = fileName;

  const { error } = await db.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  const { data } = db.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

function setupImagePreview() {
  const input = $("productImageFile");
  if (!input) return;

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;

    const preview = $("imagePreview");
    const box = $("imagePreviewBox");

    if (preview) {
      preview.src = URL.createObjectURL(file);
    }

    if (box) {
      box.style.display = "block";
    }
  });
}

/* =========================
   PRODUCT FORM
========================= */

function resetProductForm() {
  $("saveProductForm")?.reset();

  if ($("editProductId")) $("editProductId").value = "";
  if ($("productActive")) $("productActive").checked = true;

  updateProductCategorySelect();

  const preview = $("imagePreview");
  const previewBox = $("imagePreviewBox");

  if (preview) preview.src = "";
  if (previewBox) previewBox.style.display = "none";

  if ($("productForm")) $("productForm").style.display = "none";

  hideMessage();
}

function setupProductForm() {
  const form = $("saveProductForm");
  if (!form) return;

  form.addEventListener("submit", saveProduct);

  $("addProductBtn")?.addEventListener("click", () => {
    resetProductForm();
    $("productForm").style.display = "block";
  });

  $("cancelProductBtn")?.addEventListener("click", resetProductForm);

  $("productType")?.addEventListener("change", () => {
    // Category အားလုံးကို ပြသမည်။ Game / Digital အလိုက် မစစ်တော့ပါ။
    updateProductCategorySelect($("productCategory")?.value || null);
  });

  setupImagePreview();
}

async function saveProduct(event) {
  event.preventDefault();
  hideMessage();

  const id = $("editProductId")?.value;
  const name = $("productName")?.value.trim();
  const description = $("productDescription")?.value.trim();
  const price = Number($("productPrice")?.value || 0);
  const productType = $("productType")?.value || "game";
  const categoryId = $("productCategory")?.value;
  const isActive = $("productActive")?.checked ?? true;

  if (!name) {
    showMessage("Product အမည် ထည့်ပါ။");
    return;
  }

  if (!categoryId) {
    showMessage("Category ရွေးချယ်ပါ။");
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    showMessage("ဈေးနှုန်း မှန်ကန်စွာ ထည့်ပါ။");
    return;
  }

  const saveButton = $("saveProductBtn");
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "သိမ်းဆည်းနေသည်...";
  }

  try {
    const imageUrl = await uploadProductImage();

    const payload = {
      name,
      description,
      price,
      product_type: productType,
      category_id: Number(categoryId),
      image_url: imageUrl,
      is_active: isActive
    };

    let result;

    if (id) {
      result = await db
        .from("products")
        .update(payload)
        .eq("id", id);
    } else {
      result = await db
        .from("products")
        .insert(payload);
    }

    if (result.error) throw result.error;

    showMessage("Product သိမ်းဆည်းပြီးပါပြီ။", true);
    resetProductForm();
    await loadAdminProducts();

  } catch (error) {
    console.error(error);
    showMessage("သိမ်းဆည်းမရပါ။ " + error.message);
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "သိမ်းမယ်";
    }
  }
}

/* =========================
   LOAD ADMIN PRODUCTS
========================= */

async function loadAdminProducts() {
  const list = $("adminProductList");
  if (!list) return;

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    list.innerHTML = `<p>Product ဖတ်မရပါ။ ${escapeHTML(error.message)}</p>`;
    return;
  }

  products = data || [];

  if ($("productCount")) {
    $("productCount").textContent = products.length;
  }

  const categoryMap = new Map(
    categories.map(category => [
      Number(category.id),
      category.name
    ])
  );

  if (!products.length) {
    list.innerHTML = `<p>Product မရှိသေးပါ။</p>`;
    return;
  }

  list.innerHTML = products.map(product => {
    const categoryName = categoryMap.get(Number(product.category_id)) || "Category မရှိ";

    return `
      <div style="
        display:flex;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
        padding:12px;
        margin-bottom:10px;
        border:1px solid #e5e7eb;
        border-radius:10px;
      ">
        <img
          src="${escapeHTML(product.image_url || "")}"
          alt=""
          style="width:65px;height:65px;object-fit:cover;border-radius:8px;background:#f1f5f9;"
          onerror="this.style.display='none'"
        >

        <div style="flex:1;min-width:150px;">
          <strong>${escapeHTML(product.name)}</strong>
          <div style="font-size:13px;color:#64748b;">
            ${escapeHTML(categoryName)}
          </div>
          <div style="font-weight:600;color:#1769e8;">
            ${money(product.price)}
          </div>
          <div style="font-size:12px;color:${product.is_active ? "#16803c" : "#dc2626"};">
            ${product.is_active ? "Active" : "Inactive"}
          </div>
        </div>

        <div style="display:flex;gap:6px;">
          <button
            type="button"
            data-product-action="edit"
            data-id="${product.id}"
            style="padding:8px 12px;background:#1769e8;color:white;border:0;border-radius:6px;cursor:pointer;">
            ပြင်မယ်
          </button>

          <button
            type="button"
            data-product-action="delete"
            data-id="${product.id}"
            style="padding:8px 12px;background:#dc2626;color:white;border:0;border-radius:6px;cursor:pointer;">
            ဖျက်မယ်
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function editProduct(id) {
  const product = products.find(p => Number(p.id) === id);
  if (!product) return;

  $("editProductId").value = product.id;
  $("productName").value = product.name || "";
  $("productDescription").value = product.description || "";
  $("productPrice").value = product.price ?? 0;
  $("productType").value = product.product_type || "game";
  $("productActive").checked = Boolean(product.is_active);

  updateProductCategorySelect(product.category_id);

  if ($("productImage")) {
    $("productImage").value = product.image_url || "";
  }

  if ($("imagePreview") && product.image_url) {
    $("imagePreview").src = product.image_url;
  }

  if ($("imagePreviewBox")) {
    $("imagePreviewBox").style.display = product.image_url ? "block" : "none";
  }

  if ($("productForm")) {
    $("productForm").style.display = "block";
  }

  hideMessage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProduct(id) {
  const product = products.find(p => Number(p.id) === id);
  if (!product) return;

  if (!confirm(`"${product.name}" ကို ဖျက်မှာ သေချာပါသလား?`)) {
    return;
  }

  const { error } = await db
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Product ဖျက်မရပါ။ " + error.message);
    return;
  }

  await loadAdminProducts();
}

function setupProductActions() {
  const list = $("adminProductList");
  if (!list) return;

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-product-action]");
    if (!button) return;

    const id = Number(button.dataset.id);

    if (button.dataset.productAction === "edit") {
      editProduct(id);
    }

    if (button.dataset.productAction === "delete") {
      await deleteProduct(id);
    }
  });
}

/* =========================
   LOGOUT & START
========================= */

function setupLogout() {
  $("logoutBtn")?.addEventListener("click", async () => {
    await db.auth.signOut();
    location.href = "admin.html";
  });
}

async function startDashboard() {
  const allowed = await checkAdmin();
  if (!allowed) return;

  createCategoryUI();
  setupProductForm();
  setupProductActions();
  setupLogout();

  await loadCategories();
}

startDashboard();
