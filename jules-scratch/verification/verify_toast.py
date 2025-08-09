import re
from playwright.sync_api import Page, expect

def test_toast_notification(page: Page):
    """
    This test verifies that a toast notification appears when a button is clicked.
    """
    # 1. Arrange: Go to the application's home page.
    page.goto("http://localhost:3000")

    # 2. Act: Find the "Topic-wise Questions" button and click it.
    # We use get_by_role('button') because it's a robust, user-facing locator.
    topic_button = page.get_by_role("button", name="📚 Topic-wise Questions")
    topic_button.click()

    # 3. Assert: Confirm the toast notification is visible.
    # We expect to see a toast with the title "Mode Switched".
    expect(page.get_by_text("Mode Switched")).to_be_visible()

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/toast_verification.png")
