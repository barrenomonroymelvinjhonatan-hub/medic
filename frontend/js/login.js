// js/login.js
if (isLogged()) window.location.href = "dashboard.html";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = document.getElementById("error");
  const btn = document.getElementById("btnLogin");
  error.classList.add("d-none");
  btn.disabled = true;
  btn.textContent = "Entrando...";

  try {
    const res = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      }),
    });

    if (!res.ok) throw new Error("Usuario o contraseña incorrectos");

    saveSession(await res.json());
    window.location.href = "dashboard.html";
  } catch (err) {
    error.textContent = err.message === "Failed to fetch"
      ? "No se pudo conectar con el servidor"
      : err.message;
    error.classList.remove("d-none");
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});