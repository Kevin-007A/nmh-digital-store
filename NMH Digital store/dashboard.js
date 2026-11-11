/* =========================================
   K7 DIGITAL STORE - ADMIN DASHBOARD
   Supabase + Category Manager + Product CRUD
========================================= */

const SUPABASE_URL = "https://wdcrskelhwnrzmlucxoi.supabase.co";
const SUPABASE_KEY = "sb_publishable_cecHLOKznBIQcu3YYEcPmA_ld8sPwJb";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// =========================================
// ELEMENTS
// =========================================

const productForm = document.querySelector("#productForm");
const saveProductForm = document.querySelector("#saveProductForm");
const adminProductList = document.querySelector("#adminProductList");
const productCount = document.querySelector("#productCount");

const addProductBtn = document.querySelector("#addProductBtn");
const cancelProductBtn = document.querySelector("#cancelProductBtn");
const logoutBtn = document.querySelector("#logoutBtn");

const editProductId = document.querySelector("#editProductId");
const productName = document.querySelector("#productName");
const productDescription = document.querySelector("#productDescription");
const productPrice = document.querySelector("#productPrice");
const productType = document.querySelector("#productType");
const productImage = document.querySelector("#productImage");
const productImageFile = document.querySelector("#productImageFile");
const productActive = document.querySelector("#productActive");

const imagePreview = document.querySelector("#imagePreview");
const imagePreviewBox = document.querySelector("#imagePreviewBox");

const formMessage = document.querySelector("#formMessage");
const saveProductBtn = document.querySelector("#saveProductBtn");

// =========================================
// STATE
// =========================================

let categories = [];
let products = [];

// =========================================
// HELPERS
// =========================================

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(message, success = false) {
  if (!formMessage) return;

  formMessage.textContent = message;
  formMessage.style.color = success ? "#16a34a" : "#dc2626";
}

function formatPrice(price) {
  return "Ks " + Number(price || 0).toLocaleString("en-US");
}

// =========================================
// ADMIN AUTH CHECK
// =========================================

async function checkAdmin() {
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError || !user) {
    window.location.href = "admin.html";
    return false;
  }

  const { data: admin, error: adminError } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Admin check error:", adminError);
    alert("Admin စစ်ဆေးရာတွင် ပြဿနာရှိနေပါတယ်။");
    return false;
  }

  if (!admin) {
    alert("ဒီအကောင့်သည် Admin အကောင့်မဟုတ်ပါ။");
    await db.auth.signOut();
    window.location.href = "admin.html";
    return false;
  }

  return true;
}

// =========================================
// CATEGORY MANAGER UI
// =========================================

function createCategoryUI() {
  if (document.querySelector("#categoryManager")) return;

  const adminTitle = document.querySelector(".admin-title");

  if (!adminTitle) {
    console.error("Admin title element not found.");
    return;
  }

  const categoryManager = document.createElement("section");

  categoryManager.id = "categoryManager";

  categoryManager.style.cssText = `
    background:linear-gradient(
      135deg,
      #1769e8 0%,
      #1262df 55%,
      #0b3d91 100%
    );

    color:#ffffff;

    padding:24px;

    margin:22px 0;

    border-radius:18px;

    border:1px solid rgba(255,255,255,.22);

    box-shadow:
      0 12px 30px rgba(23,105,232,.28);

    box-sizing:border-box;

    width:100%;
  `;

  categoryManager.innerHTML = `

    <!-- CATEGORY HEADER -->

    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:15px;
      flex-wrap:wrap;
      margin-bottom:20px;
    ">

      <div>

        <h3 style="
          margin:0;
          color:#ffffff;
          font-size:23px;
          font-weight:900;
          line-height:1.2;
        ">
          Category Management
        </h3>

        <p style="
          margin:6px 0 0;
          color:rgba(255,255,255,.88);
          font-size:13px;
          font-weight:600;
        ">
          Game / Digital Category များကို ဒီနေရာမှ စီမံနိုင်ပါတယ်။
        </p>

      </div>

    </div>


    <!-- ADD CATEGORY -->

    <div style="
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      width:100%;
    ">

      <input
        type="text"
        id="newCategoryName"
        placeholder="Category အမည်ထည့်ပါ"
        style="
          flex:1;
          min-width:220px;

          padding:14px 16px;

          background:#ffffff;

          color:#0b3d91;

          border:2px solid rgba(255,255,255,.55);

          border-radius:11px;

          font-size:15px;

          font-weight:700;

          outline:none;

          box-sizing:border-box;
        "
      >

      <button
        type="button"
        id="addCategoryBtn"
        style="
          padding:14px 22px;

          background:#ffffff;

          color:#1262df;

          border:0;

          border-radius:11px;

          cursor:pointer;

          font-size:15px;

          font-weight:900;

          box-shadow:0 5px 15px rgba(0,0,0,.15);

          transition:.15s;
        "
      >
        + Category ထည့်မယ်
      </button>

    </div>


    <!-- MESSAGE -->

    <p
      id="categoryMessage"
      style="
        font-size:14px;

        margin:14px 0 10px;

        color:#ffffff;

        font-weight:800;

        min-height:20px;
      "
    ></p>


    <!-- CATEGORY LIST -->

    <div
      id="categoryList"
      style="
        display:grid;
        gap:11px;
      "
    ></div>

  `;

  adminTitle.insertAdjacentElement(
    "afterend",
    categoryManager
  );

  const addBtn =
    document.querySelector("#addCategoryBtn");

  const input =
    document.querySelector("#newCategoryName");

  const list =
    document.querySelector("#categoryList");


  if (addBtn) {
    addBtn.addEventListener(
      "click",
      addCategory
    );
  }

  if (input) {
    input.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {

          event.preventDefault();

          addCategory();

        }

      }
    );
  }

  if (list) {
    list.addEventListener(
      "click",
      handleCategoryAction
    );
  }
}

// =========================================
// LOAD CATEGORIES
// =========================================

async function loadCategories() {

  const { data, error } = await db
    .from("categories")
    .select(
      "id,name,category_type,display_order"
    )
    .order(
      "display_order",
      { ascending: true }
    )
    .order(
      "id",
      { ascending: true }
    );

  if (error) {

    console.error(
      "Category load error:",
      error
    );

    showCategoryMessage(
      "Category များ ရယူ၍မရပါ။ " +
      error.message
    );

    return;
  }

  categories = data || [];

  renderCategories();

  updateCategorySelect();
}

// =========================================
// RENDER CATEGORY LIST
// =========================================

function renderCategories() {

  const list =
    document.querySelector("#categoryList");

  if (!list) return;


  if (!categories.length) {

    list.innerHTML = `

      <div style="
        padding:18px;

        background:rgba(255,255,255,.12);

        border:1px dashed rgba(255,255,255,.45);

        border-radius:12px;

        text-align:center;

        color:#ffffff;

        font-size:15px;

        font-weight:800;
      ">
        Category မရှိသေးပါ။
      </div>

    `;

    return;
  }


  list.innerHTML =
    categories.map((category, index) => {

      const first =
        index === 0;

      const last =
        index === categories.length - 1;


      return `

        <div
          style="
            display:flex;

            align-items:center;

            gap:10px;

            flex-wrap:wrap;

            padding:14px 15px;

            background:
              linear-gradient(
                135deg,
                #0b3d91 0%,
                #0a347c 100%
              );

            border:1px solid
              rgba(255,255,255,.30);

            border-radius:12px;

            box-shadow:
              0 5px 14px
              rgba(0,0,0,.16);

            box-sizing:border-box;

            transition:.15s;
          "
        >


          <!-- CATEGORY NAME -->

          <div style="
            flex:1;

            min-width:140px;

            padding:4px 2px;
          ">

            <strong style="
              display:block;

              color:#ffffff;

              font-size:18px;

              font-weight:900;

              line-height:1.4;

              letter-spacing:.2px;

              text-shadow:
                0 1px 2px rgba(0,0,0,.25);

              overflow-wrap:anywhere;
            ">
              ${escapeHTML(category.name)}
            </strong>

          </div>


          <!-- UP -->

          <button
            type="button"
            data-action="up"
            data-id="${category.id}"
            ${first ? "disabled" : ""}
            style="
              min-width:42px;

              height:40px;

              padding:0 11px;

              background:
                ${first
                  ? "rgba(255,255,255,.08)"
                  : "rgba(255,255,255,.18)"};

              color:#ffffff;

              border:1px solid
                rgba(255,255,255,.35);

              border-radius:9px;

              font-size:14px;

              font-weight:900;

              cursor:
                ${first
                  ? "not-allowed"
                  : "pointer"};

              opacity:
                ${first ? ".45" : "1"};
            "
          >
            ▲
          </button>


          <!-- DOWN -->

          <button
            type="button"
            data-action="down"
            data-id="${category.id}"
            ${last ? "disabled" : ""}
            style="
              min-width:42px;

              height:40px;

              padding:0 11px;

              background:
                ${last
                  ? "rgba(255,255,255,.08)"
                  : "rgba(255,255,255,.18)"};

              color:#ffffff;

              border:1px solid
                rgba(255,255,255,.35);

              border-radius:9px;

              font-size:14px;

              font-weight:900;

              cursor:
                ${last
                  ? "not-allowed"
                  : "pointer"};

              opacity:
                ${last ? ".45" : "1"};
            "
          >
            ▼
          </button>


          <!-- EDIT -->

          <button
            type="button"
            data-action="edit"
            data-id="${category.id}"
            style="
              height:40px;

              padding:0 15px;

              background:#ffffff;

              color:#1262df;

              border:0;

              border-radius:9px;

              font-size:13px;

              font-weight:900;

              cursor:pointer;

              box-shadow:
                0 3px 8px
                rgba(0,0,0,.12);
            "
          >
            ပြင်မယ်
          </button>


          <!-- DELETE -->

          <button
            type="button"
            data-action="delete"
            data-id="${category.id}"
            style="
              height:40px;

              padding:0 15px;

              background:#ffe8e8;

              color:#b42318;

              border:0;

              border-radius:9px;

              font-size:13px;

              font-weight:900;

              cursor:pointer;
            "
          >
            ဖျက်မယ်
          </button>

        </div>

      `;

    }).join("");
}

// =========================================
// CATEGORY MESSAGE
// =========================================

function showCategoryMessage(
  message,
  success = false
) {

  const element =
    document.querySelector(
      "#categoryMessage"
    );

  if (!element) return;

  element.textContent =
    message;

  element.style.color =
    "#ffffff";

  element.style.fontWeight =
    "900";
}

// =========================================
// ADD CATEGORY
// =========================================

async function addCategory() {

  const input =
    document.querySelector(
      "#newCategoryName"
    );

  if (!input) return;

  const name =
    input.value.trim();


  if (!name) {

    showCategoryMessage(
      "Category အမည်ထည့်ပါ။"
    );

    return;
  }


  const maxOrder =
    categories.length
      ? Math.max(
          ...categories.map(
            item =>
              Number(
                item.display_order || 0
              )
          )
        )
      : -1;


  const { error } =
    await db
      .from("categories")
      .insert({

        name: name,

        category_type:
          "game",

        display_order:
          maxOrder + 1

      });


  if (error) {

    console.error(error);


    if (
      error.code === "23505"
    ) {

      showCategoryMessage(
        "ဒီ Category အမည် ရှိပြီးသားပါ။"
      );

    } else {

      showCategoryMessage(
        "Category ထည့်၍မရပါ။ " +
        error.message
      );

    }

    return;
  }


  input.value = "";

  showCategoryMessage(
    "Category ထည့်ပြီးပါပြီ။",
    true
  );

  await loadCategories();
}

// =========================================
// CATEGORY ACTIONS
// =========================================

async function handleCategoryAction(
  event
) {

  const button =
    event.target.closest(
      "button[data-action]"
    );

  if (!button) return;


  const id =
    Number(button.dataset.id);

  const action =
    button.dataset.action;


  const index =
    categories.findIndex(
      item =>
        Number(item.id) === id
    );


  if (index === -1) return;


  const category =
    categories[index];


  // =======================================
  // EDIT
  // =======================================

  if (action === "edit") {

    const newName =
      prompt(
        "Category အမည်အသစ်ထည့်ပါ။",
        category.name
      );


    if (newName === null) {
      return;
    }


    const name =
      newName.trim();


    if (!name) {

      alert(
        "Category အမည် လိုအပ်ပါတယ်။"
      );

      return;
    }


    const { error } =
      await db
        .from("categories")
        .update({
          name
        })
        .eq("id", id);


    if (error) {

      alert(
        error.code === "23505"
          ? "ဒီအမည်ကို အသုံးပြုထားပြီးသားပါ။"
          : error.message
      );

      return;
    }


    await loadCategories();


    showCategoryMessage(
      "Category အမည် ပြင်ပြီးပါပြီ။",
      true
    );
  }


  // =======================================
  // DELETE
  // =======================================

  if (action === "delete") {

    const confirmed =
      confirm(
        `"${category.name}" ကို ဖျက်မှာ သေချာပါသလား။`
      );


    if (!confirmed) {
      return;
    }


    const { error } =
      await db
        .from("categories")
        .delete()
        .eq("id", id);


    if (error) {

      alert(
        "ဖျက်၍မရပါ။ " +
        error.message
      );

      return;
    }


    await loadCategories();

    await loadAdminProducts();


    showCategoryMessage(
      "Category ဖျက်ပြီးပါပြီ။",
      true
    );
  }


  // =======================================
  // MOVE UP
  // =======================================

  if (
    action === "up" &&
    index > 0
  ) {

    await moveCategory(
      index,
      index - 1
    );
  }


  // =======================================
  // MOVE DOWN
  // =======================================

  if (
    action === "down" &&
    index <
      categories.length - 1
  ) {

    await moveCategory(
      index,
      index + 1
    );
  }
}

// =========================================
// REORDER CATEGORIES
// =========================================

async function moveCategory(
  fromIndex,
  toIndex
) {

  const reordered =
    [...categories];


  const [moved] =
    reordered.splice(
      fromIndex,
      1
    );


  reordered.splice(
    toIndex,
    0,
    moved
  );


  for (
    let i = 0;
    i < reordered.length;
    i++
  ) {

    const { error } =
      await db
        .from("categories")
        .update({
          display_order:
            i
        })
        .eq(
          "id",
          reordered[i].id
        );


    if (error) {

      alert(
        "Category အစီအစဉ် ပြောင်း၍မရပါ။ " +
        error.message
      );

      await loadCategories();

      return;
    }
  }


  await loadCategories();
}

// =========================================
// PRODUCT CATEGORY SELECT
// =========================================

function createProductCategorySelect() {

  if (
    document.querySelector(
      "#productCategory"
    )
  ) {
    return;
  }


  if (!productType) {

    console.error(
      "productType element not found."
    );

    return;
  }


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.style.marginTop =
    "12px";


  wrapper.innerHTML = `

    <label
      for="productCategory"
      style="
        display:block;
        margin-bottom:7px;
        font-weight:600;
      "
    >
      Product Category
    </label>


    <select
      id="productCategory"
      required
      style="
        width:100%;
        padding:12px;
        border:1px solid #ddd;
        border-radius:8px;
      "
    >

      <option value="">
        Category ရွေးပါ
      </option>

    </select>

  `;


  productType.insertAdjacentElement(
    "afterend",
    wrapper
  );
}

// =========================================
// UPDATE CATEGORY SELECT
// =========================================

function updateCategorySelect(
  selectedId = ""
) {

  const select =
    document.querySelector(
      "#productCategory"
    );

  if (!select) return;


  select.innerHTML = `

    <option value="">
      Category ရွေးပါ
    </option>

    ${categories.map(
      category => `

        <option
          value="${category.id}"
          ${
            String(category.id) ===
            String(selectedId)
              ? "selected"
              : ""
          }
        >
          ${escapeHTML(
            category.name
          )}
        </option>

      `
    ).join("")}

  `;
}

// =========================================
// LOAD PRODUCTS
// =========================================

async function loadAdminProducts() {

  if (!adminProductList) {
    return;
  }


  const { data, error } =
    await db
      .from("products")
      .select("*")
      .order(
        "id",
        {
          ascending:false
        }
      );


  if (error) {

    console.error(
      "Product load error:",
      error
    );


    adminProductList.innerHTML = `

      <p>
        Product များ ရယူ၍မရပါ။
        ${escapeHTML(
          error.message
        )}
      </p>

    `;

    return;
  }


  products =
    data || [];


  if (productCount) {

    productCount.textContent =
      products.length;
  }


  renderAdminProducts();
}

// =========================================
// RENDER ADMIN PRODUCTS
// =========================================

function renderAdminProducts() {

  if (!adminProductList) {
    return;
  }


  if (!products.length) {

    adminProductList.innerHTML = `

      <p style="color:#888;">
        Product မရှိသေးပါ။
      </p>

    `;

    return;
  }


  adminProductList.innerHTML =
    products.map(
      product => {

        const category =
          categories.find(
            item =>
              Number(item.id) ===
              Number(
                product.category_id
              )
          );


        return `

          <div
            style="
              display:flex;

              align-items:center;

              gap:14px;

              padding:14px;

              margin-bottom:12px;

              border:1px solid #e5e7eb;

              border-radius:12px;

              flex-wrap:wrap;
            "
          >

            ${
              product.image_url
                ? `

                  <img
                    src="${escapeHTML(
                      product.image_url
                    )}"

                    alt=""

                    style="
                      width:75px;
                      height:75px;
                      object-fit:cover;
                      border-radius:9px;
                    "
                  >

                `
                : ""
            }


            <div
              style="
                flex:1;
                min-width:150px;
              "
            >

              <strong>
                ${escapeHTML(
                  product.name
                )}
              </strong>


              <p
                style="
                  margin:5px 0;
                "
              >
                ${formatPrice(
                  product.price
                )}
              </p>


              <small>
                Category:
                ${escapeHTML(
                  category?.name ||
                  "မရွေးရသေး"
                )}
              </small>


              <br>


              <small>
                ${
                  product.is_active
                    ? "Active"
                    : "Inactive"
                }
              </small>

            </div>


            <button
              type="button"
              data-product-action="edit"
              data-id="${product.id}"
            >
              ပြင်မယ်
            </button>


            <button
              type="button"
              data-product-action="delete"
              data-id="${product.id}"
              style="
                color:#dc2626;
              "
            >
              ဖျက်မယ်
            </button>

          </div>

        `;

      }
    ).join("");
}

// =========================================
// PRODUCT ACTIONS
// =========================================

if (adminProductList) {

  adminProductList.addEventListener(
    "click",
    async event => {

      const button =
        event.target.closest(
          "button[data-product-action]"
        );

      if (!button) {
        return;
      }


      const id =
        Number(
          button.dataset.id
        );


      const action =
        button.dataset
          .productAction;


      const product =
        products.find(
          item =>
            Number(item.id) ===
            id
        );


      if (!product) {
        return;
      }


      // EDIT

      if (
        action === "edit"
      ) {

        editProduct(
          product
        );
      }


      // DELETE

      if (
        action === "delete"
      ) {

        if (
          !confirm(
            `"${product.name}" ကို ဖျက်မှာ သေချာပါသလား။`
          )
        ) {

          return;
        }


        const { error } =
          await db
            .from("products")
            .delete()
            .eq(
              "id",
              id
            );


        if (error) {

          alert(
            "Product ဖျက်၍မရပါ။ " +
            error.message
          );

          return;
        }


        await loadAdminProducts();
      }

    }
  );
}

// =========================================
// EDIT PRODUCT
// =========================================

function editProduct(
  product
) {

  if (editProductId) {
    editProductId.value =
      product.id;
  }


  if (productName) {
    productName.value =
      product.name ||
      "";
  }


  if (productDescription) {

    productDescription.value =
      product.description ||
      "";
  }


  if (productPrice) {

    productPrice.value =
      product.price ||
      0;
  }


  if (productType) {

    productType.value =
      product.product_type ||
      "game";
  }


  if (productImage) {

    productImage.value =
      product.image_url ||
      "";
  }


  if (productActive) {

    productActive.checked =
      product.is_active !==
      false;
  }


  updateCategorySelect(
    product.category_id ||
    ""
  );


  if (
    imagePreview &&
    product.image_url
  ) {

    imagePreview.src =
      product.image_url;
  }


  if (imagePreviewBox) {

    imagePreviewBox.style.display =
      product.image_url
        ? "block"
        : "none";
  }


  if (productForm) {

    productForm.style.display =
      "block";


    productForm.scrollIntoView({
      behavior:
        "smooth",

      block:
        "start"
    });
  }
}

// =========================================
// RESET PRODUCT FORM
// =========================================

function resetProductForm() {

  if (saveProductForm) {

    saveProductForm.reset();
  }


  if (editProductId) {

    editProductId.value =
      "";
  }


  if (productImage) {

    productImage.value =
      "";
  }


  if (imagePreview) {

    imagePreview.src =
      "";
  }


  if (imagePreviewBox) {

    imagePreviewBox.style.display =
      "none";
  }


  updateCategorySelect(
    ""
  );


  showMessage(
    ""
  );
}

// =========================================
// OPEN / CLOSE PRODUCT FORM
// =========================================

if (addProductBtn) {

  addProductBtn.addEventListener(
    "click",
    () => {

      resetProductForm();


      if (productForm) {

        productForm.style.display =
          "block";


        productForm.scrollIntoView({
          behavior:
            "smooth",

          block:
            "start"
        });
      }

    }
  );
}


if (cancelProductBtn) {

  cancelProductBtn.addEventListener(
    "click",
    () => {

      resetProductForm();


      if (productForm) {

        productForm.style.display =
          "none";
      }

    }
  );
}

// =========================================
// IMAGE PREVIEW
// =========================================

if (productImageFile) {

  productImageFile.addEventListener(
    "change",
    () => {

      const file =
        productImageFile
          .files?.[0];


      if (!file) {
        return;
      }


      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        alert(
          "Image ဖိုင်ကိုသာ ရွေးချယ်ပါ။"
        );

        productImageFile.value =
          "";

        return;
      }


      const reader =
        new FileReader();


      reader.onload =
        event => {

          if (imagePreview) {

            imagePreview.src =
              event.target
                .result;
          }


          if (
            imagePreviewBox
          ) {

            imagePreviewBox.style.display =
              "block";
          }

        };


      reader.readAsDataURL(
        file
      );
    }
  );
}

// =========================================
// IMAGE UPLOAD
// =========================================

async function uploadProductImage() {

  const file =
    productImageFile
      ?.files?.[0];


  if (!file) {

    return (
      productImage?.value ||
      null
    );
  }


  const extension =
    file.name
      .split(".")
      .pop();


  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;


  const { error } =
    await db.storage
      .from(
        "product-images"
      )
      .upload(
        fileName,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false
        }
      );


  if (error) {

    throw error;
  }


  const { data } =
    db.storage
      .from(
        "product-images"
      )
      .getPublicUrl(
        fileName
      );


  return data.publicUrl;
}

// =========================================
// SAVE PRODUCT
// =========================================

if (saveProductForm) {

  saveProductForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const name =
        productName?.value.trim();


      const description =
        productDescription
          ?.value.trim() ||
        "";


      const price =
        Number(
          productPrice?.value ||
          0
        );


      const product_type =
        productType?.value ||
        "game";


      const category_id =
        Number(
          document.querySelector(
            "#productCategory"
          )?.value
        );


      if (!name) {

        showMessage(
          "Product အမည်ထည့်ပါ။"
        );

        return;
      }


      if (!category_id) {

        showMessage(
          "Category ရွေးချယ်ပါ။"
        );

        return;
      }


      if (
        !Number.isFinite(
          price
        ) ||
        price < 0
      ) {

        showMessage(
          "ဈေးနှုန်း မှန်ကန်စွာထည့်ပါ။"
        );

        return;
      }


      if (saveProductBtn) {

        saveProductBtn.disabled =
          true;

        saveProductBtn.textContent =
          "Saving...";
      }


      try {

        const image_url =
          await uploadProductImage();


        const productData =
          {

            name,

            description,

            price,

            product_type,

            category_id,

            image_url,

            is_active:
              productActive
                ? productActive.checked
                : true

          };


        const id =
          editProductId?.value;


        let result;


        if (id) {

          result =
            await db
              .from(
                "products"
              )
              .update(
                productData
              )
              .eq(
                "id",
                Number(id)
              );

        } else {

          result =
            await db
              .from(
                "products"
              )
              .insert(
                productData
              );

        }


        if (
          result.error
        ) {

          throw result.error;
        }


        showMessage(
          "Product သိမ်းဆည်းပြီးပါပြီ။",
          true
        );


        resetProductForm();


        if (productForm) {

          productForm.style.display =
            "none";
        }


        await loadAdminProducts();

      } catch (
        error
      ) {

        console.error(
          "Save product error:",
          error
        );


        showMessage(
          "သိမ်းဆည်း၍မရပါ။ " +
          error.message
        );

      } finally {

        if (
          saveProductBtn
        ) {

          saveProductBtn.disabled =
            false;

          saveProductBtn.textContent =
            "Save Product";
        }

      }

    }
  );
}

// =========================================
// LOGOUT
// =========================================

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      const { error } =
        await db.auth.signOut();


      if (error) {

        alert(
          "Logout မအောင်မြင်ပါ။ " +
          error.message
        );

        return;
      }


      window.location.href =
        "admin.html";
    }
  );
}

// =========================================
// START DASHBOARD
// =========================================

async function startDashboard() {

  const isAdmin =
    await checkAdmin();


  if (!isAdmin) {
    return;
  }


  createCategoryUI();

  createProductCategorySelect();

  await loadCategories();

  await loadAdminProducts();
}

startDashboard();
