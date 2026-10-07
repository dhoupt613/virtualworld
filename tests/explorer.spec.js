import { test, expect } from '@playwright/test';

test('renders the apple and explores all three scales without browser errors', async ({ page }) => {
  const errors=[];page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/');
  const canvas=page.locator('#world');
  await expect(canvas).toHaveAttribute('data-rendered','true');
  await expect(page.locator('#error')).toBeHidden();
  await page.getByRole('button',{name:'Enter the apple'}).click();
  await expect(canvas).toHaveAttribute('data-inside','true');
  await expect(page.getByRole('button',{name:'Return to overview'})).toBeVisible();
  await expect.poll(async()=>{
    const p=(await canvas.getAttribute('data-camera')).split(',').map(Number);
    return Math.hypot(p[0],p[1]-.1,p[2]+.65);
  },{timeout:15000}).toBeLessThan(.1);
  const before=await canvas.getAttribute('data-camera');
  await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');
  await expect.poll(()=>canvas.getAttribute('data-camera')).not.toBe(before);
  await page.getByRole('button',{name:'02 Cell'}).click();
  await expect(page.locator('#specimen-title')).toHaveText('Plant cells');
  await expect(canvas).toHaveAttribute('data-mode','cell');
  await expect(canvas).toHaveAttribute('data-rendered-mode','cell');
  await page.getByRole('button',{name:'03 Molecule'}).click();
  await expect(page.locator('#specimen-title')).toHaveText('Water & glucose');
  await expect(canvas).toHaveAttribute('data-mode','molecule');
  await expect(canvas).toHaveAttribute('data-rendered-mode','molecule');
  await page.getByRole('button',{name:'Explore molecules'}).click();
  await expect(canvas).toHaveAttribute('data-inside','true');
  await page.getByRole('button',{name:'Reset view'}).click();
  await expect(canvas).toHaveAttribute('data-inside','false');
  await page.getByRole('button',{name:'01 Fruit'}).click();
  await expect(canvas).toHaveAttribute('data-mode','fruit');
  expect(errors).toEqual([]);
});

test('mobile controls change scale and move the camera', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-rendered','true');
  const before=await page.locator('#world').getAttribute('data-camera');
  const button=page.getByRole('button',{name:'Move forward'});const box=await button.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();
  await expect.poll(()=>page.locator('#world').getAttribute('data-camera')).not.toBe(before);
  await page.getByRole('button',{name:'02 Cell'}).click();
  await expect(page.locator('#world')).toHaveAttribute('data-mode','cell');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('scrolling inward advances from fruit to cells', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#world')).toHaveAttribute('data-rendered','true');
  await page.mouse.move(800,350);
  for(let i=0;i<15 && await page.locator('#world').getAttribute('data-mode')==='fruit';i++) {
    await page.mouse.wheel(0,-1000);
    await page.waitForTimeout(100);
  }
  await expect(page.locator('#world')).toHaveAttribute('data-mode','cell');
  await expect(page.locator('#world')).toHaveAttribute('data-rendered-mode','cell');
});
