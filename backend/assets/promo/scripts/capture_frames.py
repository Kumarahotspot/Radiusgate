from playwright.sync_api import sync_playwright

BASE = "https://face-absensi-2.preview.emergentagent.com"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/google-chrome",
                                args=["--no-sandbox", "--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": 1920, "height": 800}, device_scale_factor=1)

    # 1) Landing publik
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_selector('[data-testid="hero-slideshow"]', timeout=15000)
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/vid-landing.png")
    page.locator('[data-testid="absensi-pppk-section"]').scroll_into_view_if_needed()
    page.wait_for_timeout(800)
    page.screenshot(path="/tmp/vid-landing-pppk.png")
    print("landing OK", flush=True)

    # 2) Admin instansi PPPK
    page.goto(BASE + "/login", wait_until="networkidle")
    page.fill('[data-testid="login-email"]', "pppk@demo.go.id")
    page.fill('[data-testid="login-password"]', "Pppk12345!")
    page.click('[data-testid="login-submit"]')
    page.wait_for_selector('[data-testid="admin-dashboard"]', timeout=15000)
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/vid-dashboard.png")
    page.click('text=Laporan')
    page.wait_for_selector('[data-testid="reports-page"]', timeout=10000)
    page.wait_for_timeout(1200)
    page.screenshot(path="/tmp/vid-reports.png")
    page.click('text=Jam Kerja & Upah')
    page.wait_for_timeout(1500)
    page.screenshot(path="/tmp/vid-pppk-recap.png")
    print("admin OK", flush=True)

    # 3) Portal pegawai
    page.evaluate("localStorage.clear()")
    page.goto(BASE + "/login", wait_until="networkidle")
    page.fill('[data-testid="login-email"]', "budi.pppk@demo.go.id")
    page.fill('[data-testid="login-password"]', "Pppk12345!")
    page.click('[data-testid="login-submit"]')
    page.wait_for_selector('[data-testid="employee-home"]', timeout=15000)
    page.wait_for_selector('[data-testid="pppk-my-recap"]', timeout=8000)
    page.wait_for_timeout(1200)
    page.screenshot(path="/tmp/vid-employee.png")
    print("pegawai OK", flush=True)

    browser.close()
print("SEMUA FRAME OK", flush=True)
