// Key used to store the JWT in localStorage. Must match what login.js writes.
const TOKEN_KEY = "admin_token";

function getToken()        { return localStorage.getItem(TOKEN_KEY); }
function _setToken(token)  { localStorage.setItem(TOKEN_KEY, token); }
function clearToken()      { localStorage.removeItem(TOKEN_KEY); }

// Verifies the stored JWT with the server (GET /admin/verify).
// Returns the username string on success.
// Redirects to /login (and returns undefined) if no token exists, the token is
// expired/invalid, or the server is unreachable.
// admin.html calls this on load and guards the body visibility on the return
// value to prevent a flash of the protected page before the redirect completes.
async function requireAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = "/login";
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/admin/verify`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            clearToken();
            window.location.href = "/login";
            return;
        }
        const data = await res.json();
        return data.username;
    } catch {
        // Network error — redirect rather than showing a broken admin page.
        window.location.href = "/login";
    }
}

// Clears the stored token and sends the user back to the login page.
function logout() {
    clearToken();
    window.location.href = "/login";
}
