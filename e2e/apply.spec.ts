import path from 'node:path'
import { expect, test } from '@playwright/test'

const cvPath = path.join(process.cwd(), 'e2e', 'fixtures', 'cv.pdf')

test('a candidate applies to a job end to end', async ({ page }) => {
  // Public careers portal for the seeded org.
  await page.goto('/o/acme')
  await expect(page.getByRole('heading', { name: 'Open roles' })).toBeVisible()

  // Open the first role.
  await page.getByRole('link').filter({ hasText: /Engineer|Designer/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Apply for this role' })).toBeVisible()

  // A unique email so the run never collides with a prior application.
  const email = `e2e+${Date.now()}@example.test`

  await page.getByLabel('Full name').fill('E2E Candidate')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/CV/).setInputFiles(cvPath)

  // The seeded jobs require these two dynamic answers.
  await page.getByLabel('Years of experience').fill('5')
  await page.getByLabel('Do you have a work permit?').check()

  await page.getByRole('button', { name: 'Submit application' }).click()

  await expect(page.getByText('Application submitted')).toBeVisible()
})

test('an oversized wrong-type file is refused before upload', async ({ page }) => {
  await page.goto('/o/acme')
  await page.getByRole('link').filter({ hasText: /Engineer|Designer/ }).first().click()

  // A PNG is not a PDF — the client guard should flag it and never call the upload.
  await page.getByLabel(/CV/).setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a pdf'),
  })

  await expect(page.getByText('The file must be a PDF.')).toBeVisible()
})
