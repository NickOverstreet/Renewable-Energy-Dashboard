document.addEventListener("DOMContentLoaded", () => {
    // If a token is already stored, skip the login form and go straight to admin.
    if (localStorage.getItem("admin_token")) {
        window.location.href = "/admin";
        return;
    }

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn      = document.getElementById("loginBtn");
        const errorDiv = document.getElementById("loginError");
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        // Disable the button while the request is in flight to prevent double-submit.
        btn.disabled  = true;
        btn.textContent = "Signing in…";
        errorDiv.textContent = "";

        try {
            // POST credentials to the backend; on success it returns a signed JWT.
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                errorDiv.textContent = "Invalid username or password.";
                return;
            }

            // Store the JWT and navigate to the protected admin page.
            const { token } = await res.json();
            localStorage.setItem("admin_token", token);
            window.location.href = "/admin";
        } catch {
            errorDiv.textContent = "Could not connect to server.";
        } finally {
            btn.disabled = false;
            btn.textContent = "Sign In";
        }
    });
});
