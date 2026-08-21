import { expect, type Page, test } from '@playwright/test'

async function loginAsRecruiter(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('recruiter@slate.test')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
}

test('a recruiter moves a candidate to another stage on the board', async ({ page }) => {
  await loginAsRecruiter(page)

  await page.getByRole('link', { name: 'Jobs' }).click()
  await expect(page.getByRole('heading', { name: 'Jobs' })).toBeVisible()

  // Open the first job's actions menu and go to its pipeline board.
  await page.getByRole('button', { name: /^Actions for / }).first().click()
  await page.getByRole('menuitem', { name: 'Pipeline board' }).click()

  // Wait for the board, then grab the first candidate card anywhere on it.
  await expect(page.getByRole('region', { name: 'Applied' })).toBeVisible()
  const card = page.getByRole('article').first()
  await expect(card).toBeVisible()

  // The card's accessible name is the candidate's full name.
  const candidateName = ((await card.getAttribute('aria-label')) ?? '').trim()
  expect(candidateName).not.toBe('')

  // Move it to a stage it isn't already in; the menu only offers other stages.
  await card.getByRole('button', { name: /^Move / }).click()
  const target = page.getByRole('menuitem').first()
  const targetStage = (await target.innerText()).trim()
  await target.click()

  // Optimistic move + toast confirmation, and the card now lives under the target stage.
  await expect(page.getByText(`${candidateName} moved to ${targetStage}.`).first()).toBeVisible()
  await expect(
    page.getByRole('region', { name: targetStage }).getByRole('article', { name: candidateName }),
  ).toBeVisible()
})
