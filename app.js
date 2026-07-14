// =====================================
// APP.JS
// WARUNGAN POS
// =====================================

import { initDashboard } from "./dashboard.js";
import { initProduct } from "./product.js";
import { initCashier } from "./cashier.js";
import { initHistory } from "./history.js";
import { initSettings } from "./settings.js";

document.addEventListener("DOMContentLoaded", async () => {

    initMenu();

    await initDashboard();
    await initProduct();
    await initCashier();
    await initHistory();
    await initSettings();

});

// =====================================
// MENU
// =====================================

function initMenu() {

    const menus = document.querySelectorAll(".menu");
    const pages = document.querySelectorAll(".page");
    const title = document.getElementById("pageTitle");

    menus.forEach(menu => {

        menu.addEventListener("click", () => {

            menus.forEach(m => m.classList.remove("active"));
            menu.classList.add("active");

            pages.forEach(page => page.classList.remove("active"));

            const id = menu.dataset.page;

            document.getElementById(id).classList.add("active");

            title.textContent = menu.innerText.trim();

        });

    });

}