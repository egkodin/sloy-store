import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../src/data.ts';
import { normalizeCart, subtotal, shipping, unitPrice, filterProducts, validateContacts } from '../src/shop.ts';
test('Каталог: 16 уникальных товаров, корректные варианты и цены',()=>{
 assert.equal(products.length,16);assert.equal(new Set(products.map(p=>p.id)).size,16);
 for(const p of products){assert.ok(p.price>0);assert.ok(p.variants.length);for(const v of p.variants){assert.ok(p.price+v.extra>0);assert.ok(v.stock>=0);}}
});
test('Корзина: повреждённые данные, остатки, дубликаты и дробные количества',()=>{
 const cart=normalizeCart([{id:'morning',variant:1,quantity:2},{id:'morning',variant:1,quantity:99},{id:'dinner',variant:1,quantity:2.8},{id:'missing',variant:0,quantity:2},{id:'incense',variant:0,quantity:1},{id:'morning',variant:99,quantity:1},{id:'morning',variant:0,quantity:NaN},null]);
 assert.deepEqual(cart,[{id:'morning',variant:1,quantity:7},{id:'dinner',variant:1,quantity:2}]);
 assert.deepEqual(normalizeCart({}),[]);assert.deepEqual(normalizeCart(cart),cart);
});
test('Деньги: цена варианта, количество, доставка и порог бесплатной доставки',()=>{
 const cart=[{id:'morning',variant:1,quantity:2}];
 assert.equal(unitPrice(cart[0]),2100);assert.equal(subtotal(cart),4200);
 assert.equal(subtotal(cart)+shipping(subtotal(cart),'courier'),4690);
 assert.equal(shipping(7999,'courier'),490);assert.equal(shipping(8000,'courier'),0);
 assert.equal(shipping(1800,'point'),290);assert.equal(shipping(1800,'studio'),0);assert.equal(shipping(0,'courier'),0);
});
test('Поиск, категории, ценовой фильтр, сортировка, пустая выдача',()=>{
 assert.ok(filterProducts('  чашка  ','',6000,'popular').length===3);
 assert.equal(filterProducts('','Для дома',3000,'low').length,3);
 assert.equal(filterProducts('несуществующий товар','',6000,'popular').length,0);
 const sorted=filterProducts('','Посуда',6000,'low');assert.ok(sorted.every((p,i)=>!i||p.price>=sorted[i-1].price));
});
test('Оформление: обязательные поля, email, телефон, адрес и самовывоз',()=>{
 const c={name:'Анна',email:'anna@example.ru',phone:'+7 999 123-45-67',city:'Москва',address:'Примерная, 12'};
 assert.deepEqual(validateContacts(c,'courier'),{});
 assert.deepEqual(validateContacts({...c,city:'',address:''},'studio'),{});
 const errors=validateContacts({name:'',email:'wrong',phone:'123',city:'',address:''},'point');assert.equal(Object.keys(errors).length,5);
});
