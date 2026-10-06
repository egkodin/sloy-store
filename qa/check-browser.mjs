import assert from 'node:assert/strict';
import { connect, wait } from './browser.mjs';
const b=await connect();const checks=[];
const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS',name);};
const text=()=>b.evaluate('document.body.innerText');
const count=()=>b.evaluate('document.querySelectorAll(".product-card").length');
const clean=s=>s.replace(/[\s\u00a0\u202f]/g,'');
try {
 await b.viewport(1440,1000);await b.navigate('/');
 await b.evaluate('localStorage.setItem("qa-probe","preserve")');await b.send('Page.reload');await wait(500);
 const persistent=await b.evaluate('localStorage.getItem("qa-probe")==="preserve"');
 if(!persistent)console.log('SKIP Obscura does not preserve localStorage on reload; verified separately in the native preview browser.');
 await b.evaluate('localStorage.clear()');await b.send('Page.reload');await wait(500);
 check('Главная: изображения загружены',await b.evaluate('[...document.images].every(i=>i.complete&&i.naturalWidth>0)'));
 check('Главная: нет горизонтального переполнения',await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await b.screenshot('desktop-home');
 await b.click('.desktop-nav a[href$="/catalog"]');check('Каталог: 16 товаров',await count()===16);
 await b.fill('input[aria-label="Поиск по каталогу"]','чашка');check('Поиск: три чашки',await count()===3);
 await b.click('.radio-row:nth-of-type(2) input');check('Категория применяется',await b.evaluate('document.querySelector(".result-count").innerText.includes("Чашки")'));
 await b.fill('#max-price','1800');check('Ценовой фильтр: два товара',await count()===2);
 await b.fill('input[aria-label="Поиск по каталогу"]','несуществующий');check('Пустая выдача', (await text()).includes('Пока ничего не нашлось'));
 await b.click('.empty .button');check('Сброс фильтров возвращает 16 товаров',await count()===16);
 await b.screenshot('desktop-catalog');
 await b.click('.product-card a[href$="/product/morning"]');check('Переход на товар',await b.evaluate('(location.hash.startsWith("#/")?location.hash.slice(1):location.pathname)==="/product/morning"'));
 await b.click('.variant-buttons button:nth-child(2)');check('Цена варианта 350 мл: 2100 ₽',clean(await b.evaluate('document.querySelector(".product-price").innerText'))==='2100₽');
 await b.click('.product-info .favorite');await b.click('.purchase-row .quantity button:last-child');await b.click('.add-button');
 check('Корзина сохранена с вариантом и количеством',await b.evaluate('JSON.parse(localStorage.getItem("sloy-cart-v1"))[0].variant===1&&JSON.parse(localStorage.getItem("sloy-cart-v1"))[0].quantity===2'));
 await b.screenshot('desktop-product');
 await b.click('.added-link');check('Сумма корзины 4690 ₽',clean(await b.evaluate('document.querySelector(".summary-total strong").innerText'))==='4690₽');
 if(persistent){await b.send('Page.reload');await wait(450);check('Корзина сохраняется после перезагрузки',await b.evaluate('document.querySelector(".quantity output").innerText==="2"'));}
 await b.click('.cart-item .quantity button:last-child');check('Количество меняет итог: 6790 ₽',clean(await b.evaluate('document.querySelector(".summary-total strong").innerText'))==='6790₽');
 await b.click('.delivery-choices label:nth-of-type(2) input');check('Доставка в пункт: итог 6590 ₽',clean(await b.evaluate('document.querySelector(".summary-total strong").innerText'))==='6590₽');
 await b.click('.order-summary .button');check('Оформление показывает тот же итог',clean(await b.evaluate('document.querySelector(".summary-total strong").innerText'))==='6590₽');
 await b.click('.confirm-order');check('Ошибки пяти обязательных полей',await b.evaluate('document.querySelectorAll(".form-field.invalid").length===5'));
 check('Фокус на первом ошибочном поле',await b.evaluate('document.activeElement.id==="field-name"'));
 await b.screenshot('desktop-checkout-errors');
 await b.fill('#field-name','Анна Демо');await b.fill('#field-email','anna@example.ru');await b.fill('#field-phone','+7 999 123-45-67');await b.fill('#field-city','Москва');await b.fill('#field-address','Демо-пункт, Примерная 12');await b.click('#demo-ack');
 await b.click('.confirm-order');check('Успех с номером заказа',await b.evaluate('(location.hash.startsWith("#/")?location.hash.slice(1):location.pathname)==="/success"&&!!document.querySelector(".success-page>p strong")'));
 check('Итог подтверждения 6590 ₽',clean(await b.evaluate('document.querySelector(".success-receipt>div:last-child strong").innerText'))==='6590₽');
 check('Корзина очищена',await b.evaluate('JSON.parse(localStorage.getItem("sloy-cart-v1")).length===0'));
 check('Контакты не записаны',!(await b.evaluate('JSON.stringify(localStorage)')).includes('anna@example.ru'));
 await b.screenshot('desktop-success');
 await b.click('.header a[href$="/favorites"]');check('Избранное сохранено',await count()===1);await b.click('.product-card .favorite');check('Удаление избранного и пустое состояние',await count()===0);
 await b.navigate('/cart');check('Пустая корзина', (await text()).includes('Здесь пока тихо'));
 await b.navigate('/product/incense');check('Недоступный товар нельзя купить',await b.evaluate('document.querySelector(".add-button").disabled'));
 for(const width of [390,768,1440]){
  await b.viewport(width,width===390?844:1000);
  for(const route of ['/','/catalog','/product/morning','/about','/delivery']) {
   await b.navigate(route);check(`${width}px ${route}: нет переполнения`,await b.evaluate('document.documentElement.scrollWidth<=innerWidth'));
   check(`${width}px ${route}: все изображения загружены`,await b.evaluate('[...document.images].every(i=>i.complete&&i.naturalWidth>0)'));
   if(width===390)await b.screenshot(`mobile-${route==='/'?'home':route.split('/')[1]}`);
  }
 }
 await b.viewport(390,844);await b.navigate('/');await b.click('.mobile-menu-button');check('Мобильное меню раскрывается',await b.evaluate('!!document.querySelector(".mobile-nav")'));
 await b.click('.mobile-nav a[href$="/catalog"]');check('Мобильное меню закрывается при переходе',await b.evaluate('!document.querySelector(".mobile-nav")'));
 await b.click('.filters summary');check('Мобильные фильтры раскрываются',await b.evaluate('document.querySelector(".filters details").open'));
 await b.navigate('/product/morning');await b.click('.add-button');await b.click('.added-link');await b.click('.order-summary .button');
 await b.click('.confirm-order');await b.screenshot('mobile-checkout');check('Мобильные ошибки доступны',await b.evaluate('document.querySelectorAll(".form-field.invalid").length===5'));
 await b.navigate('/missing');check('Понятная страница 404', (await text()).includes('Страница не найдена'));
 check('Нет исключений JavaScript',b.errors.length===0);
 console.log(`\n${checks.length} browser checks passed with Obscura.`);
}finally{b.close();}
