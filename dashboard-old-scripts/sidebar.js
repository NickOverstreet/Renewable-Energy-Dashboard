let isClosed = true;
function sidebar_toggle() {
  const sidebar = document.getElementById("left-sidebar");
  if (isClosed) {
    // Show bar
    sidebar.style.display = "block";
    isClosed = false;
  } else {
    // Don't show bar
    sidebar.style.display = "none";
    isClosed = true;
  }
}

// Load after DOM is loaded
/*
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("menuToggle").addEventListener("click", (e) => {
    e.preventDefault();
    sidebar_toggle();
  });
});
*/

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("close").addEventListener("click", (e) => {
    e.preventDefault();
    sidebar_toggle();
  });
});
