const API_URL = "http://127.0.0.1:8000/api";

function saveSession(data) {
  localStorage.setItem("access", data.access);
  localStorage.setItem("refresh", data.refresh);
  localStorage.setItem("user", JSON.stringify(data.user));
}

function clearSession() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
}

function getUser() {
  return JSON.parse(localStorage.getItem("user") || "null");
}

function isLogged() {
  return !!localStorage.getItem("access");
}

function requireAuth() {
  if (!isLogged()) window.location.href = "login.html";
}

async function refreshAccess() {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return false;
  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  localStorage.setItem("access", data.access);
  if (data.refresh) localStorage.setItem("refresh", data.refresh); // rotación activada
  return true;
}

async function apiFetch(path, options = {}, retry = true) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access")}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    if (await refreshAccess()) return apiFetch(path, options, false);
    clearSession();
    window.location.href = "login.html";
  }
  return res;
}

async function logout() {
  try {
    await apiFetch("/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh: localStorage.getItem("refresh") }),
    });
  } catch (e) {}
  clearSession();
  window.location.href = "login.html";
}

function esc(text) {
  const d = document.createElement("div");
  d.textContent = text ?? "";
  return d.innerHTML;
}