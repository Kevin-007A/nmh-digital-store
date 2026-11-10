const SUPABASE_URL = "https://wdcrskelhwnrzmlucxoi.supabase.co";
const SUPABASE_KEY = "sb_publishable_cecHLOKznBIQcu3YYEcPmA_ld8sPwJb";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const loginForm = document.querySelector("#loginForm");
const message = document.querySelector("#message");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;

  message.textContent = "Login ဝင်နေပါတယ်...";

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = "Login မအောင်မြင်ပါ။ Email နဲ့ Password စစ်ပါ။";
    return;
  }

  const { data: admin, error: adminError } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !admin) {
    await db.auth.signOut();
    message.textContent = "ဒီ Account မှာ Admin ခွင့်ပြုချက် မရှိပါ။";
    return;
  }

  window.location.href = "dashboard.html";
});