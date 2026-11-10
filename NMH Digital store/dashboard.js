
const SUPABASE_URL = "https://wdcrskelhwnrzmlucxoi.supabase.co";
const SUPABASE_KEY = "sb_publishable_cecHLOKznBIQcu3YYEcPmA_ld8sPwJb";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

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

// Escape HTML to protect product list rendering
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Show form messages
function showMessage(message, color = "#334155") {
  formMessage.textContent = message;
  formMessage.style.color = color;
}

// Preview image
function showImagePreview(url) {
  if (!url) {
    imagePreview.src = "";
    imagePreviewBox.style.display = "none";
    return;
  }

  imagePreview.src = url;
  imagePreviewBox.style.display = "block";
}

// Clear temporary preview URL
function clearObjectUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

// Check admin access
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

  productList.innerHTML = data.map(item => `
    <div class="admin-product-row">

      <div>
        <strong>${escapeHTML(item.name)}</strong>
        <p>${escapeHTML(item.description || "")}</p>
        <p>Ks${Number(item.price).toLocaleString()}</p>
        ${item.image_url ? `
          <img
            src="${escapeHTML(item.image_url)}"
            alt=""
            style="width:65px;height:65px;object-fit:cover;border-radius:8px;"
          >
        ` : ""}
      </div>

      <div>
        ${escapeHTML(item.product_type)}
      </div>

      <div class="${item.is_active ? "active-status" : "inactive-status"}">
        ${item.is_active ? "Active" : "Inactive"}
      </div>

      <div class="product-actions">
        <button
          class="edit-btn"
          data-action="edit"
          data-id="${item.id}"
        >
          Edit
        </button>

        <button
          class="delete-btn"
          data-action="delete"
          data-id="${item.id}"
        >
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

  document.getElementById("formTitle").textContent =
    "Add New Product";

  saveProductBtn.textContent = "Save Product";

  showMessage("");

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
}

// File selection and preview
productImageFile.addEventListener("change", () => {
  const file = productImageFile.files[0];

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

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

// Upload image to Supabase Storage
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

  if (error) {
    throw error;
  }

  const { data: publicData } = db.storage
    .from("product-images")
    .getPublicUrl(data.path);

  return publicData.publicUrl;
}

// Save product
saveProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = productName.value.trim();
  const description = productDescription.value.trim();
  const price = Number(productPrice.value);
  const type = productType.value;
  const isActive = productActive.checked;

  if (!name) {
    showMessage("Product Name ထည့်ပါ။", "#dc2626");
    return;
  }

  if (!Number.isFinite(price) || price < 0) {
    showMessage("မှန်ကန်သော Price ထည့်ပါ။", "#dc2626");
    return;
  }

  saveProductBtn.disabled = true;
  saveProductBtn.textContent = "Saving...";

  try {
    let imageUrl = productImage.value.trim() || null;

    const selectedFile = productImageFile.files[0];

    // Upload selected image
    if (selectedFile) {
      showMessage("ပုံ Upload လုပ်နေပါတယ်...");

      imageUrl = await uploadProductImage(selectedFile);
    }

    const productData = {
      name,
      description,
      price,
      product_type: type,
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

    if (result.error) {
      throw result.error;
    }

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
    saveProductBtn.textContent = "Save Product";
  }
});

// Edit and Delete
productList.addEventListener("click", async (event) => {
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

    document.getElementById("formTitle").textContent =
      "Edit Product";

    saveProductBtn.textContent = "Update Product";

    editProductId.value = data.id;
    productName.value = data.name;
    productDescription.value = data.description || "";
    productPrice.value = data.price;
    productType.value = data.product_type;
    productImage.value = data.image_url || "";
    productActive.checked = data.is_active;

    productImageFile.value = "";

    showImagePreview(data.image_url || "");

    return;
  }

  if (action === "delete") {
    const confirmed = confirm(
      "ဒီ Product ကို ဖျက်မှာ သေချာပါသလား?"
    );

    if (!confirmed) return;

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

// Start dashboard
async function startDashboard() {
  const allowed = await checkAdmin();

  if (!allowed) return;

  await loadAdminProducts();
}

startDashboard();
